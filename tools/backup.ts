#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

import { dirname, fromFileUrl, join } from 'https://deno.land/std@0.224.0/path/mod.ts';
import { ensureDir, exists } from 'https://deno.land/std@0.224.0/fs/mod.ts';
import { parse } from 'https://deno.land/std@0.224.0/flags/mod.ts';

const scriptDir = dirname(fromFileUrl(import.meta.url));
const repoRoot = dirname(scriptDir);
const serverDir = join(repoRoot, 'server');
const backupDir = join(repoRoot, 'backups');

const DATA_FILES = ['tasks.json', 'users.json', 'campaigns.json'];

interface BackupOptions {
    compress?: boolean;
    keep?: number;
    restore?: string;
    list?: boolean;
}

function formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function parseTimestamp(filename: string): Date | null {
    const match = filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, year, month, day, hours, minutes, seconds] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hours),
        Number(minutes),
        Number(seconds)
    );
}

async function createBackup(options: BackupOptions): Promise<void> {
    await ensureDir(backupDir);

    const timestamp = formatTimestamp(new Date());
    const backupSubDir = join(backupDir, timestamp);
    await ensureDir(backupSubDir);

    console.log(`📦 Creating backup: ${timestamp}`);

    let fileCount = 0;
    let totalSize = 0;

    for (const filename of DATA_FILES) {
        const sourcePath = join(serverDir, filename);
        if (!(await exists(sourcePath))) {
            console.log(`⚠️  Skipping ${filename} (not found)`);
            continue;
        }

        const destPath = join(backupSubDir, filename);
        const content = await Deno.readTextFile(sourcePath);
        await Deno.writeTextFile(destPath, content);

        const stat = await Deno.stat(sourcePath);
        totalSize += stat.size;
        fileCount++;

        console.log(`   ✓ ${filename} (${(stat.size / 1024).toFixed(2)} KB)`);
    }

    console.log(
        `\n✅ Backup complete: ${fileCount} file(s), ${(totalSize / 1024).toFixed(2)} KB total`
    );
    console.log(`   Location: ${backupSubDir}`);

    // Cleanup old backups if keep option is set
    if (options.keep && options.keep > 0) {
        await cleanupOldBackups(options.keep);
    }
}

async function listBackups(): Promise<void> {
    if (!(await exists(backupDir))) {
        console.log('No backups found (backups directory does not exist)');
        return;
    }

    const entries: Array<{ name: string; date: Date; size: number }> = [];

    for await (const entry of Deno.readDir(backupDir)) {
        if (!entry.isDirectory) continue;

        const date = parseTimestamp(entry.name);
        if (!date) continue;

        let totalSize = 0;
        const backupPath = join(backupDir, entry.name);
        for (const filename of DATA_FILES) {
            const filePath = join(backupPath, filename);
            if (await exists(filePath)) {
                const stat = await Deno.stat(filePath);
                totalSize += stat.size;
            }
        }

        entries.push({ name: entry.name, date, size: totalSize });
    }

    if (entries.length === 0) {
        console.log('No backups found');
        return;
    }

    // Sort by date, newest first
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.log('\n📚 Available backups:\n');
    for (const entry of entries) {
        const sizeKB = (entry.size / 1024).toFixed(2);
        const dateStr = entry.date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        console.log(`   ${entry.name.padEnd(20)} ${dateStr.padEnd(22)} ${sizeKB.padStart(8)} KB`);
    }
    console.log();
}

async function restoreBackup(backupName: string): Promise<void> {
    const backupPath = join(backupDir, backupName);

    if (!(await exists(backupPath))) {
        console.error(`❌ Backup not found: ${backupName}`);
        console.log('\nRun "deno task backup:list" to see available backups');
        Deno.exit(1);
    }

    console.log(`📥 Restoring backup: ${backupName}\n`);

    // Create a safety backup of current state first
    console.log('Creating safety backup of current state...');
    const safetyTimestamp = formatTimestamp(new Date());
    const safetyDir = join(backupDir, `${safetyTimestamp}_pre-restore`);
    await ensureDir(safetyDir);

    for (const filename of DATA_FILES) {
        const sourcePath = join(serverDir, filename);
        if (await exists(sourcePath)) {
            const destPath = join(safetyDir, filename);
            await Deno.copyFile(sourcePath, destPath);
            console.log(`   ✓ Backed up current ${filename}`);
        }
    }

    console.log(`\n✅ Safety backup created: ${safetyTimestamp}_pre-restore\n`);
    console.log('Restoring files...');

    let restoredCount = 0;
    for (const filename of DATA_FILES) {
        const backupFilePath = join(backupPath, filename);
        if (!(await exists(backupFilePath))) {
            console.log(`   ⚠️  Skipping ${filename} (not in backup)`);
            continue;
        }

        const destPath = join(serverDir, filename);
        await Deno.copyFile(backupFilePath, destPath);
        console.log(`   ✓ Restored ${filename}`);
        restoredCount++;
    }

    console.log(`\n✅ Restore complete: ${restoredCount} file(s) restored`);
    console.log(`   Safety backup available at: ${safetyDir}`);
}

async function cleanupOldBackups(keep: number): Promise<void> {
    if (!(await exists(backupDir))) return;

    const backups: Array<{ name: string; date: Date }> = [];

    for await (const entry of Deno.readDir(backupDir)) {
        if (!entry.isDirectory) continue;
        // Skip safety backups from restore operations
        if (entry.name.includes('_pre-restore')) continue;

        const date = parseTimestamp(entry.name);
        if (date) {
            backups.push({ name: entry.name, date });
        }
    }

    // Sort by date, newest first
    backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Remove old backups beyond the keep limit
    if (backups.length > keep) {
        console.log(`\n🗑️  Cleaning up old backups (keeping ${keep} most recent)...`);
        const toRemove = backups.slice(keep);

        for (const backup of toRemove) {
            const backupPath = join(backupDir, backup.name);
            await Deno.remove(backupPath, { recursive: true });
            console.log(`   ✓ Removed ${backup.name}`);
        }

        console.log(`\n✅ Cleanup complete: removed ${toRemove.length} old backup(s)`);
    }
}

function printUsage(): void {
    console.log(`
Usage: deno task backup [options]

Options:
  --list              List all available backups
  --restore <name>    Restore a specific backup by timestamp
  --keep <number>     Keep only N most recent backups (default: unlimited)
  --help, -h          Show this help message

Examples:
  deno task backup                           # Create a new backup
  deno task backup --keep 10                 # Create backup and keep only 10 most recent
  deno task backup --list                    # List all backups
  deno task backup --restore 2024-01-15_...  # Restore a specific backup

Backup Location:
  ${backupDir}

Files Backed Up:
  ${DATA_FILES.map((f) => `- ${f}`).join('\n  ')}
`);
}

async function main(): Promise<void> {
    const args = parse(Deno.args, {
        boolean: ['list', 'help', 'h'],
        string: ['restore', 'keep'],
        alias: { h: 'help' }
    });

    if (args.help) {
        printUsage();
        return;
    }

    const options: BackupOptions = {
        list: args.list,
        restore: args.restore,
        keep: args.keep ? parseInt(args.keep, 10) : undefined
    };

    // Validate keep option
    if (options.keep !== undefined && (isNaN(options.keep) || options.keep < 1)) {
        console.error('❌ --keep must be a positive number');
        Deno.exit(1);
    }

    if (options.list) {
        await listBackups();
    } else if (options.restore) {
        await restoreBackup(options.restore);
    } else {
        await createBackup(options);
    }
}

if (import.meta.main) {
    try {
        await main();
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        Deno.exit(1);
    }
}
