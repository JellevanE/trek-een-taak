import fs from 'node:fs';
import type { Storyline } from '../types/storyline.js';
import { getStorylinesFile } from './filePaths.js';

export interface StorylineStoreData {
    storylines: Storyline[];
}

export function readStorylines(): StorylineStoreData {
    try {
        const file = getStorylinesFile();
        if (!fs.existsSync(file)) {
            return { storylines: [] };
        }
        const data = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(data) as Partial<StorylineStoreData>;
        if (!Array.isArray(parsed) && !Array.isArray(parsed.storylines)) {
            // Handle case where file might be just an array or wrapped object
            // based on how other files are structured, looks like wrapped object is preferred
            // but I initialized it as [] in phase 1.
            // If I look at campaignStore, it expects { campaigns: [], nextId: ... }
            // But my phase 1 init was [].
            // I should probably support both or migrate to object.
            // Given the other stores use objects (campaignStoreData), I should stick to that?
            // But the phase 1 action was [].
            // I will support reading the array and wrapping it.
            if (Array.isArray(parsed)) {
                return { storylines: parsed as Storyline[] };
            }
            return { storylines: [] };
        }

        if (Array.isArray(parsed)) {
            return { storylines: parsed as Storyline[] };
        }

        return { storylines: parsed.storylines || [] };
    } catch (error) {
        console.error('Error reading storylines file:', error);
        return { storylines: [] };
    }
}

export function writeStorylines(data: StorylineStoreData): boolean {
    const file = getStorylinesFile();
    const tmpPath = `${file}.tmp`;
    try {
        // We will store as an array to match phase 1 initialization `[]`
        // OR we switch to object if we want metadata.
        // Re-reading phase 1: "Initialize as empty array".
        // So the file content should be `[]`.
        // But the store returns `StorylineStoreData` interface which wraps it.
        // So I will write `data.storylines`.
        fs.writeFileSync(tmpPath, JSON.stringify(data.storylines, null, 2));
        fs.renameSync(tmpPath, file);
        return true;
    } catch (error) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {
            // ignore
        }
        console.error('Error writing storylines file:', error);
        throw error;
    }
}
