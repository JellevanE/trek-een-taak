import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storylineConfig } from '../config/storyline.config.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(MODULE_DIR, '../prompts');

const DAILY_UPDATE_VARIANTS = 1; // increment as more variants are added

export class PromptService {
    static loadTemplate(theme: string, type: string): string {
        try {
            let templatePath = path.join(PROMPTS_DIR, theme, `${type}.txt`);

            if (!fs.existsSync(templatePath) && type === 'daily-update') {
                const variant = Math.floor(Math.random() * DAILY_UPDATE_VARIANTS) + 1;
                templatePath = path.join(PROMPTS_DIR, theme, `daily-update-${variant}.txt`);
            }

            if (fs.existsSync(templatePath)) {
                return fs.readFileSync(templatePath, 'utf8');
            }

            console.error(`Prompt template not found: ${theme}/${type}`);
            return 'Write a story update about {currentObjective} for {userName}.';
        } catch (error) {
            console.error('Error loading prompt template:', error);
            throw error;
        }
    }

    static loadSystemPrompt(theme: string): string | undefined {
        const themeConfig = storylineConfig.themes[theme as keyof typeof storylineConfig.themes];
        if (!themeConfig) return undefined;

        const systemPromptPath = path.join(PROMPTS_DIR, themeConfig.systemPromptFile);
        if (!fs.existsSync(systemPromptPath)) return undefined;

        try {
            return fs.readFileSync(systemPromptPath, 'utf8').trim();
        } catch (error) {
            console.error('Error loading system prompt:', error);
            return undefined;
        }
    }
}
