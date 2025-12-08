import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(MODULE_DIR, '../prompts');

export class PromptService {
    static loadTemplate(theme: string, type: string): string {
        try {
            // Try specific theme first
            let templatePath = path.join(PROMPTS_DIR, theme, `${type}.txt`);

            if (!fs.existsSync(templatePath)) {
                // Check if it's one of the varied daily updates (e.g. daily-update-1)
                // For now, simple fallback to generic if specific missing not implemented fully
                // as per plan we have specific files.
                // If type is just 'daily-update', pick random variant?
                if (type === 'daily-update') {
                    // Simple random logic for V1
                    const variant = Math.floor(Math.random() * 1) + 1; // only 1 variant so far
                    templatePath = path.join(PROMPTS_DIR, theme, `daily-update-${variant}.txt`);
                }
            }

            if (fs.existsSync(templatePath)) {
                return fs.readFileSync(templatePath, 'utf8');
            }

            console.error(`Prompt template not found: ${theme}/${type}`);
            return `Write a story update about {currentObjective} for {userName}.`; // Fallback
        } catch (error) {
            console.error('Error loading prompt template:', error);
            throw error;
        }
    }
}
