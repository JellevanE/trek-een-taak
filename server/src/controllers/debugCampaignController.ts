import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { readCampaigns, serializeCampaign, writeCampaigns } from '../data/campaignStore.js';
import { buildDemoTasks, readTasks, writeTasks } from '../data/taskStore.js';
import { readStorylines, writeStorylines } from '../data/storylineStore.js';
import { StorylineService } from '../services/storyline.service.js';
import { sendError } from '../utils/http.js';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';

type BaseAuthedRequest<B = unknown> = AuthenticatedRequest<ParamsDictionary, unknown, B>;

const CAMPAIGN_NAMES = [
    "The Dragon's Crusade",
    'Moonlit Expedition',
    'Siege of the Crystal Spire',
    'Shadow Caravan',
    "The Alchemist's Riddle",
];

interface SeedCampaignPayload {
    count?: number;
    quest_count?: number;
}

/**
 * POST /api/debug/seed-campaigns
 * Creates sample campaigns with quests and storylines.
 * Body: { count?: number (1-5), quest_count?: number (1-10) }
 */
export function seedCampaigns(req: BaseAuthedRequest<SeedCampaignPayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;

    const rawCount = Number(req.body?.count ?? 1);
    const campaignCount = Math.max(1, Math.min(5, Math.floor(rawCount) || 1));

    const rawQuestCount = Number(req.body?.quest_count ?? 5);
    const questCount = Math.max(1, Math.min(10, Math.floor(rawQuestCount) || 5));

    const campaignsData = readCampaigns();
    const tasksData = readTasks();
    const now = new Date().toISOString();
    const created: ReturnType<typeof serializeCampaign>[] = [];

    for (let i = 0; i < campaignCount; i++) {
        const name = CAMPAIGN_NAMES[i % CAMPAIGN_NAMES.length]!;

        const newCampaign: typeof campaignsData.campaigns[number] = {
            id: campaignsData.nextId,
            name,
            description: `Debug campaign: ${name}`,
            image_url: null,
            owner_id: req.user.id,
            archived: false,
            created_at: now,
            updated_at: now,
        };

        // Create storyline
        try {
            const storyline = StorylineService.createStoryline(newCampaign.id);
            newCampaign.storyline_id = storyline.id;
        } catch (e) {
            console.error('Failed to create storyline during seed', e);
        }

        campaignsData.campaigns.push(newCampaign);
        campaignsData.nextId += 1;

        // Create quests linked to this campaign
        const orderStart = tasksData.tasks.reduce(
            (max, task) => (task.order > max ? task.order : max),
            -1,
        ) + 1;

        const demo = buildDemoTasks({
            count: questCount,
            nextId: tasksData.nextId,
            ownerId: req.user.id,
            startingOrder: orderStart,
        });

        // Link quests to campaign
        demo.tasks.forEach((t) => {
            t.campaign_id = newCampaign.id;
        });

        tasksData.tasks.push(...demo.tasks);
        tasksData.nextId = demo.nextId;

        created.push(serializeCampaign(newCampaign, {
            stats: {
                quests_total: demo.tasks.length,
                quests_completed: demo.tasks.filter((t) => t.status === 'done').length,
                quests_remaining: demo.tasks.filter((t) => t.status !== 'done').length,
                quests_in_progress: demo.tasks.filter((t) => t.status === 'in_progress').length,
                completion_percent: 0,
            },
            progress_summary: `0/${demo.tasks.length}`,
        }));
    }

    try {
        writeCampaigns(campaignsData);
        writeTasks(tasksData);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist seeded campaigns');
    }

    return res.status(201).json({ created: created.length, campaigns: created });
}

/**
 * POST /api/debug/clear-campaigns
 * Removes all campaigns owned by the current user, their storylines,
 * and detaches associated quests.
 */
export function clearCampaigns(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;

    const campaignsData = readCampaigns();
    const userCampaigns = campaignsData.campaigns.filter((c) => c.owner_id === req.user.id);
    const removedIds = userCampaigns.map((c) => c.id);

    // Remove storylines for each campaign
    const storylinesData = readStorylines();
    const beforeStorylines = storylinesData.storylines.length;
    storylinesData.storylines = storylinesData.storylines.filter(
        (s) => !removedIds.includes(s.campaignId),
    );
    if (storylinesData.storylines.length !== beforeStorylines) {
        writeStorylines(storylinesData);
    }

    // Remove campaigns
    campaignsData.campaigns = campaignsData.campaigns.filter((c) => c.owner_id !== req.user.id);

    // Detach tasks from removed campaigns
    const tasksData = readTasks();
    let tasksUpdated = false;
    tasksData.tasks.forEach((task) => {
        if (
            task.owner_id === req.user.id && task.campaign_id !== null &&
            removedIds.includes(task.campaign_id)
        ) {
            task.campaign_id = null;
            tasksUpdated = true;
        }
    });

    try {
        writeCampaigns(campaignsData);
        if (tasksUpdated) writeTasks(tasksData);
    } catch (error) {
        return sendError(res, 500, 'Failed to clear campaigns');
    }

    return res.json({
        removed_campaigns: removedIds.length,
        removed_storylines: beforeStorylines - storylinesData.storylines.length,
    });
}

interface CompleteCampaignTasksPayload {
    campaign_id: number;
}

/**
 * POST /api/debug/complete-campaign-tasks
 * Marks all tasks in a campaign as done. Useful for testing completion storyline.
 * Body: { campaign_id: number }
 */
export function completeCampaignTasks(
    req: BaseAuthedRequest<CompleteCampaignTasksPayload>,
    res: Response,
) {
    if (!assertAuthenticated(req, res)) return;

    const campaignId = Number(req.body?.campaign_id);
    if (!Number.isFinite(campaignId)) {
        return sendError(res, 400, 'campaign_id is required');
    }

    const campaignsData = readCampaigns();
    const campaign = campaignsData.campaigns.find(
        (c) => c.id === campaignId && c.owner_id === req.user.id,
    );
    if (!campaign) return sendError(res, 404, 'Campaign not found');

    const tasksData = readTasks();
    const now = new Date().toISOString();
    let completed = 0;

    tasksData.tasks.forEach((task) => {
        if (task.owner_id !== req.user.id || task.campaign_id !== campaignId) return;
        if (task.status === 'done') return;

        task.status = 'done';
        task.completed = true;
        task.updated_at = now;
        task.status_history.push({ status: 'done', at: now, note: 'debug: bulk complete' });

        // Also complete all sub-tasks and side quests
        (task.sub_tasks ?? []).forEach((st) => {
            if (st.status !== 'done') {
                st.status = 'done';
                st.completed = true;
                st.updated_at = now;
                st.status_history.push({ status: 'done', at: now, note: 'debug: bulk complete' });
            }
        });
        (task.side_quests ?? []).forEach((sq) => {
            if (sq.status !== 'done') {
                sq.status = 'done';
                sq.completed = true;
                sq.updated_at = now;
                sq.status_history.push({ status: 'done', at: now, note: 'debug: bulk complete' });
            }
        });

        completed++;
    });

    try {
        writeTasks(tasksData);
    } catch (error) {
        return sendError(res, 500, 'Failed to complete campaign tasks');
    }

    return res.json({
        campaign_id: campaignId,
        campaign_name: campaign.name,
        tasks_completed: completed,
    });
}
