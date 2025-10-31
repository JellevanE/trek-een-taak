import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import {
    readCampaigns,
    serializeCampaign,
    serializeCampaignList,
    writeCampaigns
} from '../data/campaignStore';
import { readTasks, serializeTaskList, writeTasks } from '../data/taskStore';
import { sendError } from '../utils/http';
import { assertAuthenticated } from '../utils/authGuard';
import type { AuthenticatedRequest } from '../types/auth';
import type { CampaignExtras, CampaignRecord } from '../types/campaign';
import type { TaskRecord } from '../types/task';

type BaseAuthedRequest<
    P extends ParamsDictionary = ParamsDictionary,
    B = unknown,
    Q extends ParsedQs = ParsedQs
> = AuthenticatedRequest<P, unknown, B, Q>;

interface CampaignListQuery extends ParsedQs {
    include_archived?: string | string[];
}

function buildCampaignStatsMap(
    campaigns: CampaignRecord[],
    tasks: TaskRecord[],
    ownerId: number
): Map<number, CampaignExtras> {
    const stats = new Map<number, CampaignExtras>();
    const ownerTasks = tasks.filter((task) => task && task.owner_id === ownerId);

    campaigns.forEach((campaign) => {
        const relatedTasks = ownerTasks.filter((task) => task.campaign_id === campaign.id);
        const total = relatedTasks.length;
        const completed = relatedTasks.filter((task) => task.status === 'done').length;
        const inProgress = relatedTasks.filter((task) => task.status === 'in_progress').length;
        const remaining = Math.max(total - completed, 0);
        const completion = total > 0 ? Math.round((completed / total) * 100) : 0;

        stats.set(campaign.id, {
            stats: {
                quests_total: total,
                quests_completed: completed,
                quests_remaining: remaining,
                quests_in_progress: inProgress,
                completion_percent: completion
            },
            progress_summary: `${completed}/${total}`
        });
    });

    return stats;
}

export function listCampaigns(
    req: BaseAuthedRequest<ParamsDictionary, unknown, CampaignListQuery>,
    res: Response
) {
    if (!assertAuthenticated(req, res)) return;
    const campaignsData = readCampaigns();
    const tasksData = readTasks();

    const queryValue = req.query.include_archived;
    const includeArchived = Array.isArray(queryValue)
        ? queryValue.includes('true')
        : queryValue === 'true';
    const ownerId = req.user.id;

    const campaigns = campaignsData.campaigns.filter((campaign) => {
        if (campaign.owner_id !== ownerId) return false;
        if (includeArchived) return true;
        return !campaign.archived;
    });

    const statsMap = buildCampaignStatsMap(campaigns, tasksData.tasks, ownerId);
    return res.json({ campaigns: serializeCampaignList(campaigns, statsMap) });
}

interface CreateCampaignBody {
    name?: string;
    description?: string;
    image_url?: string | null;
}

export function createCampaign(req: BaseAuthedRequest<ParamsDictionary, CreateCampaignBody>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const { name, description, image_url } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
        return sendError(res, 400, 'Missing or invalid name');
    }

    const campaignsData = readCampaigns();
    const now = new Date().toISOString();
    const newCampaign: CampaignRecord = {
        id: campaignsData.nextId,
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        image_url: typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null,
        owner_id: req.user.id,
        archived: false,
        created_at: now,
        updated_at: now
    };

    campaignsData.campaigns.push(newCampaign);
    campaignsData.nextId += 1;

    try {
        writeCampaigns(campaignsData);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist campaign');
    }

    const tasksData = readTasks();
    const statsMap = buildCampaignStatsMap([newCampaign], tasksData.tasks, req.user.id);

    return res.status(201).json(serializeCampaign(newCampaign, statsMap.get(newCampaign.id) || {}));
}

export function getCampaign(req: BaseAuthedRequest<{ id: string }>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(campaignId)) return sendError(res, 400, 'Invalid campaign id');

    const campaignsData = readCampaigns();
    const campaign = campaignsData.campaigns.find((item) => item.id === campaignId && item.owner_id === req.user.id);
    if (!campaign) return sendError(res, 404, 'Campaign not found');

    const tasksData = readTasks();
    const relatedTasks = tasksData.tasks.filter(
        (task) => task.owner_id === req.user.id && task.campaign_id === campaign.id
    );
    const statsMap = buildCampaignStatsMap([campaign], tasksData.tasks, req.user.id);

    return res.json({
        campaign: serializeCampaign(campaign, statsMap.get(campaign.id) || {}),
        quests: serializeTaskList(relatedTasks)
    });
}

interface UpdateCampaignBody {
    name?: string;
    description?: string;
    image_url?: string | null;
    archived?: boolean;
}

export function updateCampaign(req: BaseAuthedRequest<{ id: string }, UpdateCampaignBody>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(campaignId)) return sendError(res, 400, 'Invalid campaign id');

    const campaignsData = readCampaigns();
    const index = campaignsData.campaigns.findIndex(
        (item) => item.id === campaignId && item.owner_id === req.user.id
    );
    if (index === -1) return sendError(res, 404, 'Campaign not found');

    const target = campaignsData.campaigns[index];
    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        if (typeof body.name !== 'string' || !body.name.trim()) return sendError(res, 400, 'Invalid name');
        target.name = body.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
        if (typeof body.description !== 'string') return sendError(res, 400, 'Invalid description');
        target.description = body.description.trim();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'image_url')) {
        const image = body.image_url;
        if (image === null) {
            target.image_url = null;
        } else if (typeof image === 'string') {
            target.image_url = image.trim() ? image.trim() : null;
        } else {
            return sendError(res, 400, 'Invalid image_url');
        }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'archived')) {
        if (typeof body.archived !== 'boolean') return sendError(res, 400, 'Invalid archived flag');
        target.archived = body.archived;
    }

    target.updated_at = new Date().toISOString();

    try {
        writeCampaigns(campaignsData);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist campaign update');
    }

    const tasksData = readTasks();
    const statsMap = buildCampaignStatsMap([target], tasksData.tasks, req.user.id);
    return res.json(serializeCampaign(target, statsMap.get(target.id) || {}));
}

export function deleteCampaign(req: BaseAuthedRequest<{ id: string }>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(campaignId)) return sendError(res, 400, 'Invalid campaign id');

    const campaignsData = readCampaigns();
    const index = campaignsData.campaigns.findIndex(
        (item) => item.id === campaignId && item.owner_id === req.user.id
    );
    if (index === -1) return sendError(res, 404, 'Campaign not found');

    const [removed] = campaignsData.campaigns.splice(index, 1);
    try {
        writeCampaigns(campaignsData);
    } catch (error) {
        return sendError(res, 500, 'Failed to persist campaign removal');
    }

    const tasksData = readTasks();
    let updated = false;
    tasksData.tasks.forEach((task) => {
        if (task.owner_id === req.user.id && task.campaign_id === removed.id) {
            task.campaign_id = null;
            updated = true;
        }
    });

    if (updated) {
        try {
            writeTasks(tasksData);
        } catch (error) {
            return sendError(res, 500, 'Failed to detach quests from campaign');
        }
    }

    return res.status(204).send();
}

const controller = {
    listCampaigns,
    createCampaign,
    getCampaign,
    updateCampaign,
    deleteCampaign
};

export default controller;
