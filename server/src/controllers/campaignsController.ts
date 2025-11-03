import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import {
    readCampaigns,
    serializeCampaign,
    serializeCampaignList,
    writeCampaigns
} from '../data/campaignStore.js';
import { readTasks, serializeTaskList, writeTasks } from '../data/taskStore.js';
import { sendError } from '../utils/http.js';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import type { CampaignExtras, CampaignRecord } from '../types/campaign.js';
import type { TaskRecord } from '../types/task.js';
import { validateRequest } from '../validation/index.js';
import {
    campaignIdParamsSchema,
    createCampaignSchema,
    listCampaignsQuerySchema,
    updateCampaignSchema,
    type CampaignIdParams,
    type CreateCampaignPayload,
    type ListCampaignsQuery,
    type UpdateCampaignPayload
} from '../validation/schemas/campaigns.js';

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

export function listCampaigns(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { query: listCampaignsQuerySchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const query = (validation.data.query ?? {}) as ListCampaignsQuery;
    const includeArchivedRaw = query.include_archived;
    const includeArchived = Array.isArray(includeArchivedRaw)
        ? includeArchivedRaw.includes('true')
        : includeArchivedRaw === 'true';
    const campaignsData = readCampaigns();
    const tasksData = readTasks();
    const ownerId = req.user.id;

    const campaigns = campaignsData.campaigns.filter((campaign) => {
        if (campaign.owner_id !== ownerId) return false;
        if (includeArchived) return true;
        return !campaign.archived;
    });

    const statsMap = buildCampaignStatsMap(campaigns, tasksData.tasks, ownerId);
    return res.json({ campaigns: serializeCampaignList(campaigns, statsMap) });
}

export function createCampaign(req: BaseAuthedRequest<ParamsDictionary, CreateCampaignPayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, { body: createCampaignSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const payload = (validation.data.body as CreateCampaignPayload)!;
    const campaignsData = readCampaigns();
    const now = new Date().toISOString();

    const normalizedImage =
        payload.image_url === null
            ? null
            : typeof payload.image_url === 'string' && payload.image_url.length > 0
            ? payload.image_url
            : null;

    const newCampaign: CampaignRecord = {
        id: campaignsData.nextId,
        name: payload.name,
        description: payload.description ?? '',
        image_url: normalizedImage,
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
    const validation = validateRequest(req, { params: campaignIdParamsSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const params = validation.data.params as CampaignIdParams;
    const campaignId = params.id;

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

export function updateCampaign(req: BaseAuthedRequest<{ id: string }, UpdateCampaignPayload>, res: Response) {
    if (!assertAuthenticated(req, res)) return;
    const validation = validateRequest(req, {
        params: campaignIdParamsSchema,
        body: updateCampaignSchema
    });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const params = validation.data.params as CampaignIdParams;
    const campaignId = params.id;
    const campaignsData = readCampaigns();
    const index = campaignsData.campaigns.findIndex(
        (item) => item.id === campaignId && item.owner_id === req.user.id
    );
    if (index === -1) return sendError(res, 404, 'Campaign not found');

    const target = campaignsData.campaigns[index];
    if (!target) return sendError(res, 404, 'Campaign not found');
    const updates = (validation.data.body ?? {}) as UpdateCampaignPayload;

    if (Object.prototype.hasOwnProperty.call(updates, 'name') && updates.name !== undefined) {
        target.name = updates.name;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description') && updates.description !== undefined) {
        target.description = updates.description;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'image_url')) {
        const image = updates.image_url;
        if (image === null) {
            target.image_url = null;
        } else if (typeof image === 'string') {
            target.image_url = image.length > 0 ? image : null;
        }
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'archived') && updates.archived !== undefined) {
        target.archived = updates.archived;
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
    const validation = validateRequest(req, { params: campaignIdParamsSchema });
    if (!validation.success) {
        return sendError(res, 400, validation.error.summary);
    }

    const params = validation.data.params as CampaignIdParams;
    const campaignId = params.id;

    const campaignsData = readCampaigns();
    const index = campaignsData.campaigns.findIndex(
        (item) => item.id === campaignId && item.owner_id === req.user.id
    );
    if (index === -1) return sendError(res, 404, 'Campaign not found');

    const [removed] = campaignsData.campaigns.splice(index, 1);
    if (!removed) return sendError(res, 404, 'Campaign not found');
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
