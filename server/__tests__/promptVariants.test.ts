import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DAILY_UPDATE_VARIANTS, PromptService } from '../src/services/prompt.service';

const FANTASY_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/prompts/fantasy');

// Placeholders the generation context always injects into a daily update; every
// variant must reference the same set so any variant can be picked at random.
const REQUIRED_PLACEHOLDERS = [
    '{campaignName}',
    '{userName}',
    '{userLevel}',
    '{userClass}',
    '{narrativeSummary}',
    '{currentObjective}',
    '{locations}',
    '{characters}',
    '{tasksCompleted}',
];

function dailyVariantFiles(): string[] {
    return readdirSync(FANTASY_DIR)
        .filter((f) => /^daily-update-\d+\.txt$/.test(f))
        .sort();
}

test('DAILY_UPDATE_VARIANTS matches the number of variant files on disk', () => {
    expect(dailyVariantFiles().length).toBe(DAILY_UPDATE_VARIANTS);
});

test('variant files are numbered contiguously from 1', () => {
    const numbers = dailyVariantFiles()
        .map((f) => Number(f.match(/(\d+)/)![1]))
        .sort((a, b) => a - b);
    expect(numbers).toEqual(
        Array.from({ length: DAILY_UPDATE_VARIANTS }, (_, i) => i + 1),
    );
});

test('every daily-update variant contains the required placeholders', () => {
    for (const file of dailyVariantFiles()) {
        const contents = readFileSync(join(FANTASY_DIR, file), 'utf8');
        for (const placeholder of REQUIRED_PLACEHOLDERS) {
            expect(contents).toContain(placeholder);
        }
    }
});

test('loadTemplate resolves a real daily-update template, never the fallback', () => {
    // Selection is random across variants; sample enough to hit each variant and
    // assert none fall through to the hardcoded fallback string.
    for (let i = 0; i < 50; i++) {
        const template = PromptService.loadTemplate('fantasy', 'daily-update');
        expect(template).toContain('{tasksCompleted}');
        expect(template).not.toContain('Write a story update about {currentObjective}');
    }
});

test('loadTemplate honors an explicit daily-update variant', () => {
    for (const n of [1, 2, 3]) {
        const forced = PromptService.loadTemplate('fantasy', 'daily-update', n);
        const onDisk = readFileSync(join(FANTASY_DIR, `daily-update-${n}.txt`), 'utf8');
        expect(forced).toBe(onDisk);
    }
});

test('loadTemplate falls back to random for an out-of-range variant', () => {
    // 99 is out of range → should still return a valid variant, not the fallback.
    const template = PromptService.loadTemplate('fantasy', 'daily-update', 99);
    expect(template).toContain('{tasksCompleted}');
    expect(template).not.toContain('Write a story update about {currentObjective}');
});
