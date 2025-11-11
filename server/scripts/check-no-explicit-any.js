#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const searchGlobs = [
    path.join(projectRoot, 'src'),
    path.join(projectRoot, '__tests__')
];

function collectTsFiles(targetPath) {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const absolute = path.join(targetPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectTsFiles(absolute));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(absolute);
        }
    }
    return files;
}

function formatLocation(filePath, source, node) {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    return `${path.relative(projectRoot, filePath)}:${line + 1}:${character + 1}`;
}

function checkFile(filePath) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true);
    const violations = [];

    function visit(node) {
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
            violations.push({
                location: formatLocation(filePath, source, node),
                snippet: sourceText.slice(node.getStart(source), node.getEnd())
            });
        }
        ts.forEachChild(node, visit);
    }

    visit(source);
    return violations;
}

function main() {
    const files = searchGlobs.flatMap(collectTsFiles);
    const violations = [];

    for (const filePath of files) {
        const fileViolations = checkFile(filePath);
        violations.push(...fileViolations);
    }

    if (violations.length > 0) {
        console.error('Explicit "any" types are not allowed. Please replace them with specific types or refactor.');
        for (const violation of violations) {
            console.error(`  - ${violation.location} (${violation.snippet})`);
        }
        process.exit(1);
    }
}

main();
