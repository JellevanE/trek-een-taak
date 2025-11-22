#!/usr/bin/env node
/**
 * Sound Converter & Compressor
 * 
 * Converts sound files to web-optimized formats (.webm and .mp3)
 * and compresses them to meet the 50kb requirement.
 * 
 * Requirements:
 * - ffmpeg must be installed (brew install ffmpeg on macOS)
 * 
 * Usage:
 * node convert-sounds.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SOUNDS_DIR = __dirname;
const OUTPUT_DIR = path.join(SOUNDS_DIR, 'processed');
const MAX_SIZE_KB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

// Sound event mappings - customize these to match your desired sounds
const SOUND_MAPPINGS = {
    quest_add: null,          // Will auto-select best match
    quest_complete: null,
    side_quest_add: null,
    priority_cycle: null,
    level_up: null
};

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFFmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function getFileSize(filePath) {
    try {
        return fs.statSync(filePath).size;
    } catch {
        return 0;
    }
}

function formatBytes(bytes) {
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function getSoundFiles() {
    return fs.readdirSync(SOUNDS_DIR)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.wav', '.mp3', '.flac', '.ogg', '.webm'].includes(ext);
        })
        .filter(file => file !== 'convert-sounds.js')
        .map(file => ({
            name: file,
            path: path.join(SOUNDS_DIR, file),
            size: getFileSize(path.join(SOUNDS_DIR, file)),
            basename: path.basename(file, path.extname(file))
        }));
}

function convertToFormat(inputPath, outputPath, format, bitrate) {
    const formatOptions = {
        mp3: {
            codec: 'libmp3lame',
            extraArgs: '-ar 22050 -ac 1'  // 22kHz mono for smaller size
        },
        webm: {
            codec: 'libopus',
            extraArgs: '-ar 24000 -ac 1'  // 24kHz mono
        }
    };

    const opts = formatOptions[format];
    if (!opts) {
        throw new Error(`Unsupported format: ${format}`);
    }

    const cmd = `ffmpeg -i "${inputPath}" -c:a ${opts.codec} -b:a ${bitrate}k ${opts.extraArgs} -y "${outputPath}" 2>&1`;

    try {
        execSync(cmd, { stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
}

function findOptimalBitrate(inputPath, outputPath, format) {
    // Try different bitrates to get under 50kb
    const bitrates = [16, 20, 24, 32, 40, 48, 64];

    for (const bitrate of bitrates) {
        if (convertToFormat(inputPath, outputPath, format, bitrate)) {
            const size = getFileSize(outputPath);
            if (size > 0 && size <= MAX_SIZE_BYTES) {
                return { bitrate, size, success: true };
            }
            // If over limit, try next lower bitrate
            if (size > MAX_SIZE_BYTES) {
                continue;
            }
        }
    }

    // If we couldn't get under 50kb, return the smallest we could make
    if (fs.existsSync(outputPath)) {
        const size = getFileSize(outputPath);
        return { bitrate: bitrates[0], size, success: false };
    }

    return { bitrate: 0, size: 0, success: false };
}

function processSound(soundFile, outputBasename) {
    log(`\n📦 Processing: ${soundFile.name}`, 'cyan');
    log(`   Original size: ${formatBytes(soundFile.size)}`, 'gray');

    const results = {
        original: soundFile,
        mp3: null,
        webm: null
    };

    // Convert to MP3
    const mp3Path = path.join(OUTPUT_DIR, `${outputBasename}.mp3`);
    log(`   Converting to MP3...`, 'gray');
    const mp3Result = findOptimalBitrate(soundFile.path, mp3Path, 'mp3');

    if (mp3Result.success) {
        log(`   ✓ MP3: ${formatBytes(mp3Result.size)} @ ${mp3Result.bitrate}kbps`, 'green');
        results.mp3 = { path: mp3Path, size: mp3Result.size, bitrate: mp3Result.bitrate };
    } else if (mp3Result.size > 0) {
        log(`   ⚠ MP3: ${formatBytes(mp3Result.size)} (exceeds 50kb limit)`, 'yellow');
        results.mp3 = { path: mp3Path, size: mp3Result.size, bitrate: mp3Result.bitrate, oversize: true };
    } else {
        log(`   ✗ MP3 conversion failed`, 'red');
    }

    // Convert to WebM
    const webmPath = path.join(OUTPUT_DIR, `${outputBasename}.webm`);
    log(`   Converting to WebM...`, 'gray');
    const webmResult = findOptimalBitrate(soundFile.path, webmPath, 'webm');

    if (webmResult.success) {
        log(`   ✓ WebM: ${formatBytes(webmResult.size)} @ ${webmResult.bitrate}kbps`, 'green');
        results.webm = { path: webmPath, size: webmResult.size, bitrate: webmResult.bitrate };
    } else if (webmResult.size > 0) {
        log(`   ⚠ WebM: ${formatBytes(webmResult.size)} (exceeds 50kb limit)`, 'yellow');
        results.webm = { path: webmPath, size: webmResult.size, bitrate: webmResult.bitrate, oversize: true };
    } else {
        log(`   ✗ WebM conversion failed`, 'red');
    }

    return results;
}

function sanitizeFilename(filename) {
    // Remove file extension and sanitize to create a clean output name
    return filename
        .replace(/\.(wav|mp3|flac|ogg|webm)$/i, '')
        .replace(/[^a-z0-9_-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
}

function main() {
    log('\n🎵 Sound Converter & Compressor', 'bright');
    log('================================\n', 'bright');

    // Check for ffmpeg
    if (!checkFFmpeg()) {
        log('❌ Error: ffmpeg is not installed!', 'red');
        log('\nPlease install ffmpeg:', 'yellow');
        log('  macOS:   brew install ffmpeg', 'cyan');
        log('  Ubuntu:  sudo apt-get install ffmpeg', 'cyan');
        log('  Windows: Download from https://ffmpeg.org/download.html', 'cyan');
        process.exit(1);
    }

    log('✓ ffmpeg found', 'green');

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        log(`✓ Created output directory: ${OUTPUT_DIR}`, 'green');
    }

    // Get sound files
    const soundFiles = getSoundFiles();
    if (soundFiles.length === 0) {
        log('❌ No sound files found in the directory!', 'red');
        process.exit(1);
    }

    log(`✓ Found ${soundFiles.length} sound files\n`, 'green');

    // Process ALL sound files
    const results = [];
    soundFiles.forEach((soundFile) => {
        const outputBasename = sanitizeFilename(soundFile.name);
        const result = processSound(soundFile, outputBasename);
        results.push(result);
    });

    // Display summary table
    log('\n' + '='.repeat(70), 'bright');
    log('📊 CONVERSION SUMMARY', 'bright');
    log('='.repeat(70), 'bright');

    let successCount = 0;
    let oversizeCount = 0;
    let failCount = 0;

    results.forEach((result) => {
        if (!result) return;

        const name = result.original.basename;
        log(`\n${name}:`, 'cyan');
        log(`  Source: ${result.original.name} (${formatBytes(result.original.size)})`, 'gray');

        let fileSuccess = false;

        if (result.mp3) {
            const status = result.mp3.oversize ? '⚠' : '✓';
            const color = result.mp3.oversize ? 'yellow' : 'green';
            log(`  ${status} MP3:  ${formatBytes(result.mp3.size)} @ ${result.mp3.bitrate}kbps`, color);
            if (!result.mp3.oversize) fileSuccess = true;
        } else {
            log(`  ✗ MP3: conversion failed`, 'red');
        }

        if (result.webm) {
            const status = result.webm.oversize ? '⚠' : '✓';
            const color = result.webm.oversize ? 'yellow' : 'green';
            log(`  ${status} WebM: ${formatBytes(result.webm.size)} @ ${result.webm.bitrate}kbps`, color);
            if (!result.webm.oversize) fileSuccess = true;
        } else {
            log(`  ✗ WebM: conversion failed`, 'red');
        }

        if (fileSuccess) {
            successCount++;
        } else if (result.mp3?.oversize || result.webm?.oversize) {
            oversizeCount++;
        } else {
            failCount++;
        }
    });

    log('\n' + '='.repeat(70), 'bright');
    log(`\n✅ Successfully converted: ${successCount} files (under 50kb)`, 'green');
    if (oversizeCount > 0) {
        log(`⚠️  Oversized: ${oversizeCount} files (over 50kb - you may want to use shorter clips)`, 'yellow');
    }
    if (failCount > 0) {
        log(`❌ Failed: ${failCount} files`, 'red');
    }

    // Show usage instructions
    log('\n' + '='.repeat(70), 'cyan');
    log('📝 NEXT STEPS:', 'bright');
    log('='.repeat(70), 'cyan');
    log('\n1. Review the converted files in: processed/', 'gray');
    log('2. Choose which sounds you want to use for each event', 'gray');
    log('3. Update theme/index.js with your chosen sounds\n', 'gray');

    log('Example configuration for theme/index.js:', 'yellow');
    log('\n[SOUND_EVENT_KEYS.QUEST_ADD]: {', 'gray');
    log('    label: \'Quest added\',', 'gray');
    log('    sources: [', 'gray');
    log('        { src: \'/theme/sounds/yourfile.webm\', type: \'audio/webm\' },', 'gray');
    log('        { src: \'/theme/sounds/yourfile.mp3\', type: \'audio/mpeg\' }', 'gray');
    log('    ]', 'gray');
    log('},\n', 'gray');

    log('='.repeat(70), 'cyan');
    log('\n✨ Done! All sounds have been processed.\n', 'green');
}

// Run the script
main();
