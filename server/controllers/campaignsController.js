'use strict';

const { readCampaigns, writeCampaigns, serializeCampaign, serializeCampaignList } = require('../data/campaignStore');
const { readTasks, writeTasks, serializeTaskList } = require('../data/taskStore');
const { sendError } = require('../utils/http');

function buildCampaignStatsMap(campaigns, tasks, ownerId) {
    const map = new Map();
    const ownerTasks = Array.isArray(tasks) ? tasks.filter(task => task && task.owner_id === ownerId) : [];
    campaigns.forEach(campaign => {
        const relatedTasks = ownerTasks.filter(task => task.campaign_id === campaign.id);
        const total = relatedTasks.length;
        const completed = relatedTasks.filter(task => task.status === 'done').length;
        const inProgress = relatedTasks.filter(task => task.status === 'in_progress').length;
        const remaining = Math.max(total - completed, 0);
        const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
        const extras = {
            stats: {
                quests_total: total,
                quests_completed: completed,
                quests_remaining: remaining,
                quests_in_progress: inProgress,
                completion_percent: completion
            },
            progress_summary: `${completed}/${total}`
        };
        map.set(campaign.id, extras);
    });
    return map;
}

function listCampaigns(req, res) {
    const campaignsData = readCampaigns();
    const tasksData = readTasks();
    const includeArchived = req.query && req.query.include_archived === 'true';
    const campaigns = campaignsData.campaigns.filter(campaign => {
        if (campaign.owner_id !== req.user.id) return false;
        if (includeArchived) return true;
        return !campaign.archived;
    });
    const statsMap = buildCampaignStatsMap(campaigns, tasksData.tasks, req.user.id);
    return res.json({ campaigns: serializeCampaignList(campaigns, statsMap) });
}

function createCampaign(req, res) {
    const { name, description, image_url } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
        return sendError(res, 400, 'Missing or invalid name');
    }
    const campaignsData = readCampaigns();
    const now = new Date().toISOString();
    const newCampaign = {
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
        return res.status(500).json({ error: 'Failed to persist campaign' });
    }
    const tasksData = readTasks();
    const statsMap = buildCampaignStatsMap([newCampaign], tasksData.tasks, req.user.id);
    return res.status(201).json(serializeCampaign(newCampaign, statsMap.get(newCampaign.id)));
}

function getCampaign(req, res) {
    const campaignId = parseInt(req.params.id, 10);
    if (!Number.isFinite(campaignId)) return sendError(res, 400, 'Invalid campaign id');
    const campaignsData = readCampaigns();
    const campaign = campaignsData.campaigns.find(item => item.id === campaignId && item.owner_id === req.user.id);
    if (!campaign) return sendError(res, 404, 'Campaign not found');
    const tasksData = readTasks();
    const relatedTasks = tasksData.tasks
        .filter(task => task.owner_id === req.user.id && task.campaign_id === campaign.id);
    const statsMap = buildCampaignStatsMap([campaign], tasksData.tasks, req.user.id);
    return res.json({
        campaign: serializeCampaign(campaign, statsMap.get(campaign.id)),
        quests: serializeTaskList(relatedTasks)
    });
}

function updateCampaign(req, res) {
    const campaignId = parseInt(req.params.id, 10);
    if (!Number.isFinite(campaignId)) return sendError(res, 400, 'Invalid campaign id');
    const campaignsData = readCampaigns();
    const index = campaignsData.campaigns.findIndex(item => item.id === campaignId && item.owner_id === req.user.id);
    if (index === -1) return sendError(res, 404, 'Campaign not found');
    const target = campaignsData.campaigns[index];
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
        if (typeof req.body.name !== 'string' || !req.body.name.trim()) return sendError(res, 400, 'Invalid name');
        target.name = req.body.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
        if (typeof req.body.description !== 'string') return sendError(res, 400, 'Invalid description');
        target.description = req.body.description.trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'image_url')) {
        const image = req.body.image_url;
        if (image === null) {
            target.image_url = null;
        } else if (typeof image === 'string') {
            target.image_url = image.trim() ? image.trim() : null;
        } else {
            return sendError(res, 400, 'Invalid image_url');
        }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'archived')) {
        if (typeof req.body.archived !== 'boolean') return sendError(res, 400, 'Invalid archived flag');
        target.archived = req.body.archived;
    }
    target.updated_at = new Date().toISOString();
    try {
        writeCampaigns(campaignsData);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to persist campaign update' });
    }
    const tasksData = readTasks();
    const statsMap = buildCampaignStatsMap([target], tasksData.tasks, req.user.id);
    return res.json(serializeCampaign(target, statsMap.get(target.id)));
}

function deleteCampaign(req, res) {
    const campaignId = parseInt(req.params.id, 10);
    if (!Number.isFinite(campaignId)) return sendError(res, 400, 'Invalid campaign id');
    const campaignsData = readCampaigns();
    const index = campaignsData.campaigns.findIndex(item => item.id === campaignId && item.owner_id === req.user.id);
    if (index === -1) return sendError(res, 404, 'Campaign not found');
    const [removed] = campaignsData.campaigns.splice(index, 1);
    try {
        writeCampaigns(campaignsData);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to persist campaign removal' });
    }
    const tasksData = readTasks();
    let updated = false;
    tasksData.tasks.forEach(task => {
        if (task.owner_id === req.user.id && task.campaign_id === removed.id) {
            task.campaign_id = null;
            updated = true;
        }
    });
    if (updated) {
        try {
            writeTasks(tasksData);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to detach quests from campaign' });
        }
    }
    return res.status(204).send();
}

module.exports = {
    listCampaigns,
    createCampaign,
    getCampaign,
    updateCampaign,
    deleteCampaign
};
