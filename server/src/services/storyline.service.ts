import { randomUUID } from 'node:crypto';
import type { Storyline, StoryUpdate } from '../types/storyline.js';
import { readStorylines, writeStorylines } from '../data/storylineStore.js';
import { storylineConfig } from '../config/storyline.config.js';

// ─── Validation ──────────────────────────────────────────────────────────────

function sanitize(text: string): string {
    return text
        .replace(/\{\{/g, '')
        .replace(/\}\}/g, '')
        .replace(/<\/?prompt>/gi, '')
        .trim();
}

function validateAndSanitize(fields: Record<string, string | undefined>): Record<string, string> {
    const { maxCampaignNameLength, maxDescriptionLength, maxTaskDescriptionLength } =
        storylineConfig.validation;

    const limits: Record<string, number> = {
        campaignName: maxCampaignNameLength,
        campaignDescription: maxDescriptionLength,
        taskDescription: maxTaskDescriptionLength,
    };

    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(fields)) {
        if (!value) {
            result[key] = '';
            continue;
        }
        const limit = limits[key] ?? maxDescriptionLength;
        if (value.length > limit) {
            throw new Error(`Input "${key}" exceeds maximum length of ${limit} characters`);
        }
        result[key] = sanitize(value);
    }

    return result;
}

// ─── Progress ────────────────────────────────────────────────────────────────

function computeProgress(
    tasks: { campaign_id: number | null; status: string }[],
    campaignId: number,
): number {
    const campaignTasks = tasks.filter((t) => t.campaign_id === campaignId);
    if (campaignTasks.length === 0) return 0;
    const done = campaignTasks.filter((t) => t.status === 'done').length;
    return Math.round((done / campaignTasks.length) * 100);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class StorylineService {
    static createStoryline(campaignId: number): Storyline {
        const data = readStorylines();
        const now = new Date().toISOString();

        const newStoryline: Storyline = {
            id: randomUUID(),
            campaignId,
            theme: 'fantasy',
            narrativeState: {
                chapter: 1,
                currentObjective: 'Begin your adventure',
                summary: 'The journey begins...',
                characters: [],
                locations: [],
                keyPlotPoints: [],
                progressPercentage: 0,
            },
            updates: [],
            createdAt: now,
            lastGeneratedAt: now,
            lastVisitDate: now,
            generationFailures: 0,
        };

        data.storylines.push(newStoryline);
        writeStorylines(data);
        return newStoryline;
    }

    static getStoryline(campaignId: number): Storyline | undefined {
        const data = readStorylines();
        return data.storylines.find((s) => s.campaignId === campaignId);
    }

    static deleteStoryline(campaignId: number): void {
        const data = readStorylines();
        const initialLength = data.storylines.length;
        data.storylines = data.storylines.filter((s) => s.campaignId !== campaignId);
        if (data.storylines.length !== initialLength) {
            writeStorylines(data);
        }
    }

    static async checkAndGenerateUpdate(
        storylineId: string,
        userId: number,
    ): Promise<{ status: 'generating' | 'current'; updates?: StoryUpdate[] }> {
        const data = readStorylines();
        const storyline = data.storylines.find((s) => s.id === storylineId);

        if (!storyline) {
            throw new Error('Storyline not found');
        }

        const today = new Date().toDateString();
        const lastVisit = new Date(storyline.lastVisitDate).toDateString();
        const isNewDay = today !== lastVisit;

        // Determine what type of update is needed
        type UpdateType = 'intro' | 'daily' | 'reflection' | 'completion';
        let updateType: UpdateType | null = null;

        if (storyline.updates.length === 0) {
            updateType = 'intro';
        } else if (isNewDay) {
            const { readTasks } = await import('../data/taskStore.js');
            const tasksData = readTasks();

            const progressPercentage = computeProgress(tasksData.tasks, storyline.campaignId);
            if (progressPercentage >= 100) {
                updateType = 'completion';
            } else {
                const completedSinceLastVisit = tasksData.tasks.filter(
                    (t) =>
                        t.campaign_id === storyline.campaignId &&
                        t.status === 'done' &&
                        new Date(t.updated_at) > new Date(storyline.lastVisitDate),
                );
                updateType = completedSinceLastVisit.length > 0 ? 'daily' : 'reflection';
            }
        }

        if (!updateType) {
            return { status: 'current', updates: storyline.updates };
        }

        try {
            await this.generateStoryUpdate(storyline, updateType, userId);

            const updatedData = readStorylines();
            const updatedStoryline = updatedData.storylines.find((s) => s.id === storylineId);
            return { status: 'current', updates: updatedStoryline?.updates ?? [] };
        } catch (e) {
            // Increment failure counter and persist
            const freshData = readStorylines();
            const sl = freshData.storylines.find((s) => s.id === storylineId);
            if (sl) {
                sl.generationFailures += 1;
                writeStorylines(freshData);
            }
            console.error('Story generation failed', e);
            return { status: 'current', updates: storyline.updates };
        }
    }

    private static async generateStoryUpdate(
        storyline: Storyline,
        type: 'intro' | 'daily' | 'reflection' | 'completion',
        userId: number,
    ): Promise<void> {
        const { readCampaigns } = await import('../data/campaignStore.js');
        const { readTasks } = await import('../data/taskStore.js');
        const { readUsers } = await import('../data/userStore.js');
        const { PromptService } = await import('./prompt.service.js');
        const { langChainService } = await import('./ai/langchain.service.js');
        const { NarrativeExtractorService } = await import('./ai/narrative-extractor.service.js');

        const campaignsData = readCampaigns();
        const campaign = campaignsData.campaigns.find((c) => c.id === storyline.campaignId);

        const tasksData = readTasks();
        const usersData = readUsers();
        const user = usersData.users.find((u) => u.id === userId);

        // Validate and sanitize user-supplied strings before they enter the prompt
        const sanitized = validateAndSanitize({
            campaignName: campaign?.name ?? 'Unknown Campaign',
            campaignDescription: campaign?.description ?? '',
            taskDescription: 'placeholder', // validated per-task below
        });

        const userName = user ? user.username : 'Hero';
        const userLevel = user ? user.rpg.level : 1;
        const userClass = user?.profile?.class ?? 'Adventurer';

        // Tasks completed since last visit (used for daily/completion updates)
        const completedTasks = tasksData.tasks.filter(
            (t) =>
                t.campaign_id === storyline.campaignId &&
                t.status === 'done' &&
                new Date(t.updated_at) > new Date(storyline.lastVisitDate),
        );

        const completedTaskIds = completedTasks.map((t) => String(t.id));

        // Validate each task description individually
        completedTasks.forEach((t) => {
            validateAndSanitize({ taskDescription: t.description });
        });

        // Upcoming TODO tasks (used for intro)
        const upcomingTasks = tasksData.tasks.filter(
            (t) => t.campaign_id === storyline.campaignId && t.status === 'todo',
        );

        upcomingTasks.forEach((t) => {
            validateAndSanitize({ taskDescription: t.description });
        });

        // Current progress percentage
        const progressPercentage = computeProgress(tasksData.tasks, storyline.campaignId);

        // Build the summary text for the appropriate update type
        const tasksSummary = type === 'intro'
            ? upcomingTasks.length > 0
                ? upcomingTasks.map((t) => `- ${sanitize(t.description)}`).join('\n')
                : 'Many challenges await on the horizon.'
            : completedTasks.length > 0
            ? completedTasks.map((t) => `- ${sanitize(t.description)}`).join('\n')
            : 'The hero rested and reflected on the journey ahead.';

        const context = {
            campaignName: sanitized.campaignName,
            userName,
            userLevel,
            userClass,
            currentObjective: storyline.narrativeState.currentObjective,
            narrativeSummary: storyline.narrativeState.summary,
            locations: storyline.narrativeState.locations.join(', ') || 'unknown lands',
            characters: storyline.narrativeState.characters.join(', ') || 'none yet',
            tasksSummary,
            tasksCompleted: tasksSummary,
        };

        const templateType = type === 'intro' ? 'intro' : type === 'daily' ? 'daily-update' : type;
        const template = PromptService.loadTemplate(storyline.theme, templateType);
        const systemPrompt = PromptService.loadSystemPrompt(storyline.theme);

        const text = await langChainService.generateText(template, context, systemPrompt);

        // Extract updated narrative state; falls back to previous on failure
        const newNarrativeState = await NarrativeExtractorService.extractState(
            text,
            storyline.narrativeState,
        );

        const now = new Date().toISOString();
        const newUpdate: StoryUpdate = {
            id: randomUUID(),
            type,
            text,
            generatedAt: now,
            tasksCompleted: completedTaskIds,
        };

        const data = readStorylines();
        const sl = data.storylines.find((s) => s.id === storyline.id);
        if (sl) {
            sl.updates.push(newUpdate);
            sl.narrativeState = {
                ...newNarrativeState,
                progressPercentage,
            };
            sl.lastGeneratedAt = now;
            sl.lastVisitDate = now;
            sl.generationFailures = 0;
            writeStorylines(data);
        }
    }
}
