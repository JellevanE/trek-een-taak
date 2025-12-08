import { randomUUID } from 'node:crypto';
import type { Storyline, StoryUpdate } from '../types/storyline.js';
import { readStorylines, writeStorylines } from '../data/storylineStore.js';

export class StorylineService {
    static createStoryline(campaignId: number): Storyline {
        const data = readStorylines();
        const now = new Date().toISOString();

        const newStoryline: Storyline = {
            id: randomUUID(),
            campaignId,
            theme: 'fantasy', // default
            narrativeState: {
                chapter: 1,
                currentObjective: 'Begin your adventure',
                summary: 'The journey begins...',
                characters: [],
                locations: [],
                keyPlotPoints: [],
                progressPercentage: 0
            },
            updates: [],
            createdAt: now,
            lastGeneratedAt: now,
            lastVisitDate: now,
            generationFailures: 0
        };

        data.storylines.push(newStoryline);
        writeStorylines(data);
        return newStoryline;
    }

    static getStoryline(campaignId: number): Storyline | undefined {
        const data = readStorylines();
        return data.storylines.find(s => s.campaignId === campaignId);
    }

    static deleteStoryline(campaignId: number): void {
        const data = readStorylines();
        const initialLength = data.storylines.length;
        data.storylines = data.storylines.filter(s => s.campaignId !== campaignId);
        if (data.storylines.length !== initialLength) {
            writeStorylines(data);
        }
    }

    static async checkAndGenerateUpdate(storylineId: string, userId: number): Promise<{ status: 'generating' | 'current', updates?: StoryUpdate[] }> {
        const data = readStorylines();
        const storyline = data.storylines.find(s => s.id === storylineId);

        if (!storyline) {
            throw new Error('Storyline not found');
        }

        const now = new Date();
        const today = now.toDateString();
        const lastVisit = new Date(storyline.lastVisitDate).toDateString();

        // Logic: 
        // 1. If never updated (visits=0 or updates=[]), generate INTRO.
        // 2. If new day, generate DAILY update.
        // 3. Else return current.

        let updateType: 'intro' | 'daily' | null = null;

        if (storyline.updates.length === 0) {
            updateType = 'intro';
        } else if (today !== lastVisit) {
            // For V1, we assume any visit on a new day triggers an update if tasks were done?
            // Or just triggers a "daily log" regardless? 
            // Plan says: check completed tasks. For simplicity in V1 step, let's force a daily update on new day.
            updateType = 'daily';
        }

        if (!updateType) {
            // Update last visit date anyway
            if (today !== lastVisit) {
                storyline.lastVisitDate = now.toISOString();
                writeStorylines(data);
            }
            return { status: 'current', updates: storyline.updates };
        }

        // START GENERATION
        // In a real async queue system, we'd return 'generating' here and do work in background.
        // For this V1 sync-ish proto, we'll await it (might timeout client) or fire-and-forget?
        // Plan says: "Async generation (no queue system for V1)".
        // We can just await it for the first pass to ensure it works, OR fire-and-forget and return 'generating'.
        // Let's try await for better debuggability first, if it acts slow we move to fire-and-forget.

        try {
            await this.generateStoryUpdate(storyline, updateType, userId);

            // Re-read data as it was modified
            const updatedData = readStorylines();
            const updatedStoryline = updatedData.storylines.find(s => s.id === storylineId);

            return { status: 'current', updates: updatedStoryline ? updatedStoryline.updates : [] };
        } catch (e) {
            console.error('Generation failed', e);
            return { status: 'current', updates: storyline.updates }; // Return old state
        }
    }

    private static async generateStoryUpdate(storyline: Storyline, type: string, userId: number): Promise<void> {
        // 1. Build Context
        const { readCampaigns } = await import('../data/campaignStore.js');
        const { readTasks } = await import('../data/taskStore.js');
        // Assuming readUsers exists or similar to get user details
        // Looking at controller/auth patterns, usually req.user is passed, but here we only have userId.
        // Let's import readUsers if available or use a helper.
        // Checked file list earlier: server/src/data/users.ts exists? No, users.ts in data dir?
        // Checked server/src/data dir: campaignStore.ts, taskStore.ts... users is handled via users.json likely.
        // Let's try importing readUsers from userStore if it exists, or check filePaths.
        // filePaths has 'users'.
        // Let's assume there is a userStore.ts or similar.
        // Checked directory list step 60 (controllers), step 65 (data dir - only campaignStore shown).

        // Dynamic import to avoid top-level circular dep if any
        // Implemented below assuming userStore exists based on pattern

        const { readUsers } = await import('../data/userStore.js');

        const campaignsData = readCampaigns();
        const campaign = campaignsData.campaigns.find(c => c.id === storyline.campaignId);

        const tasksData = readTasks();
        const lastVisit = new Date(storyline.lastVisitDate);
        const recentCompletedTasks = tasksData.tasks.filter(t =>
            t.campaign_id === storyline.campaignId &&
            t.status === 'done' &&
            new Date(t.updated_at) > lastVisit
        );

        const tasksSummaryText = recentCompletedTasks.length > 0
            ? recentCompletedTasks.map(t => `- ${t.description}`).join('\n')
            : "The hero reflected on their journey.";

        const usersData = readUsers();
        const user = usersData.users.find(u => u.id === userId);

        const userName = user ? user.username : "Hero";
        const userLevel = user ? user.rpg.level : 1;
        const userClass = user && user.profile.class ? user.profile.class : "Adventurer";

        const context = {
            campaignName: campaign ? campaign.name : "Unknown Campaign",
            userName: userName,
            userLevel: userLevel,
            userClass: userClass,
            currentObjective: storyline.narrativeState.currentObjective,
            narrativeSummary: storyline.narrativeState.summary,
            locations: storyline.narrativeState.locations.join(', '),
            characters: storyline.narrativeState.characters.join(', '),
            tasksSummary: tasksSummaryText,
            tasksCompleted: tasksSummaryText
        };

        // 2. Load Prompt
        const { PromptService } = await import('./prompt.service.js');
        const { langChainService } = await import('./ai/langchain.service.js');
        const { NarrativeExtractorService } = await import('./ai/narrative-extractor.service.js');

        const template = PromptService.loadTemplate(storyline.theme, type === 'intro' ? 'intro' : 'daily-update');

        // 3. Generate Text
        const text = await langChainService.generateText(template, context);

        // 4. Extract New State
        const newState = await NarrativeExtractorService.extractState(text, storyline.narrativeState);

        // 5. Update Storyline
        const now = new Date().toISOString();
        const newUpdate: StoryUpdate = {
            id: randomUUID(),
            type: type as any,
            text: text,
            generatedAt: now,
            tasksCompleted: []
        };

        // Write to DB
        const data = readStorylines();
        const sl = data.storylines.find(s => s.id === storyline.id);
        if (sl) {
            sl.updates.push(newUpdate);
            sl.narrativeState = { ...sl.narrativeState, ...newState };
            sl.lastGeneratedAt = now;
            sl.lastVisitDate = now;
            writeStorylines(data);
        }
    }
}
