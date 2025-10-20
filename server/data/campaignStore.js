'use strict';

const fs = require('fs');
const { CAMPAIGNS_FILE } = require('./filePaths');

function sanitizeCampaign(campaign, fallbackOwnerId) {
    if (!campaign || typeof campaign !== 'object') return null;
    const now = new Date().toISOString();
    if (typeof campaign.id !== 'number') return null;
    const sanitized = { ...campaign };
    if (typeof sanitized.name !== 'string') sanitized.name = `Campaign ${sanitized.id}`;
    sanitized.name = sanitized.name.trim();
    if (typeof sanitized.description !== 'string') sanitized.description = '';
    sanitized.description = sanitized.description.trim();
    if (typeof sanitized.image_url !== 'string' || !sanitized.image_url.trim()) sanitized.image_url = null;
    if (typeof sanitized.owner_id !== 'number') sanitized.owner_id = fallbackOwnerId || 1;
    if (typeof sanitized.archived !== 'boolean') sanitized.archived = false;
    if (!sanitized.created_at) sanitized.created_at = now;
    if (!sanitized.updated_at) sanitized.updated_at = sanitized.created_at;
    return sanitized;
}

function readCampaigns() {
    try {
        if (!fs.existsSync(CAMPAIGNS_FILE)) {
            return { campaigns: [], nextId: 1 };
        }
        const data = fs.readFileSync(CAMPAIGNS_FILE);
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed.campaigns)) parsed.campaigns = [];
        const fallbackOwnerId = 1;
        parsed.campaigns = parsed.campaigns
            .map(c => sanitizeCampaign(c, fallbackOwnerId))
            .filter(Boolean);
        const maxId = parsed.campaigns.reduce((max, c) => (c.id > max ? c.id : max), 0);
        if (typeof parsed.nextId !== 'number' || parsed.nextId <= maxId) {
            parsed.nextId = maxId + 1;
        }
        return parsed;
    } catch (error) {
        console.error('Error reading campaigns file:', error);
        return { campaigns: [], nextId: 1 };
    }
}

function writeCampaigns(data) {
    const tmpPath = `${CAMPAIGNS_FILE}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, CAMPAIGNS_FILE);
        return true;
    } catch (error) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch (cleanupErr) {
            // ignore cleanup failures
        }
        console.error('Error writing campaigns file:', error);
        throw error;
    }
}

function serializeCampaign(campaign, extra = {}) {
    if (!campaign || typeof campaign !== 'object') return campaign;
    const base = {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        image_url: campaign.image_url || null,
        owner_id: campaign.owner_id,
        archived: !!campaign.archived,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
    };
    return { ...base, ...extra };
}

function serializeCampaignList(list, statsById = new Map()) {
    if (!Array.isArray(list)) return [];
    return list.map(campaign => {
        const extras = statsById.get(campaign.id) || {};
        return serializeCampaign(campaign, extras);
    });
}

module.exports = {
    readCampaigns,
    writeCampaigns,
    serializeCampaign,
    serializeCampaignList
};
