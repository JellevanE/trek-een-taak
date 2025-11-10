import fs from 'node:fs';

import type { CampaignExtras, CampaignRecord, CampaignStoreData } from '../types/campaign.js';

import { getCampaignsFile } from './filePaths.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function sanitizeCampaign(campaign: unknown, fallbackOwnerId: number): CampaignRecord | null {
    if (!isRecord(campaign)) return null;
    if (typeof campaign.id !== 'number') return null;

    const now = new Date().toISOString();
    const sanitized: CampaignRecord = {
        id: campaign.id,
        name: typeof campaign.name === 'string' ? campaign.name.trim() : `Campaign ${campaign.id}`,
        description: typeof campaign.description === 'string' ? campaign.description.trim() : '',
        image_url:
            typeof campaign.image_url === 'string' && campaign.image_url.trim().length > 0
                ? campaign.image_url.trim()
                : null,
        owner_id: typeof campaign.owner_id === 'number' ? campaign.owner_id : fallbackOwnerId,
        archived: typeof campaign.archived === 'boolean' ? campaign.archived : false,
        created_at: typeof campaign.created_at === 'string' ? campaign.created_at : now,
        updated_at: typeof campaign.updated_at === 'string' ? campaign.updated_at : now
    };

    return sanitized;
}

export function readCampaigns(): CampaignStoreData {
    try {
        const campaignsFile = getCampaignsFile();
        if (!fs.existsSync(campaignsFile)) {
            return { campaigns: [], nextId: 1 };
        }

        const data = fs.readFileSync(campaignsFile, 'utf8');
        const parsed = JSON.parse(data) as Partial<CampaignStoreData>;
        if (!Array.isArray(parsed.campaigns)) parsed.campaigns = [];

        const fallbackOwnerId = 1;
        const campaigns = parsed.campaigns
            .map((campaign) => sanitizeCampaign(campaign, fallbackOwnerId))
            .filter((campaign): campaign is CampaignRecord => campaign !== null);

        const maxId = campaigns.reduce((max, campaign) => (campaign.id > max ? campaign.id : max), 0);
        const nextId =
            typeof parsed.nextId === 'number' && parsed.nextId > maxId ? parsed.nextId : maxId + 1;

        return { campaigns, nextId };
    } catch (error) {
        console.error('Error reading campaigns file:', error);
        return { campaigns: [], nextId: 1 };
    }
}

export function writeCampaigns(data: CampaignStoreData): boolean {
    const campaignsFile = getCampaignsFile();
    const tmpPath = `${campaignsFile}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, campaignsFile);
        return true;
    } catch (error) {
        try {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        } catch {
            // ignore cleanup failures
        }
        console.error('Error writing campaigns file:', error);
        throw error;
    }
}

export function serializeCampaign(campaign: CampaignRecord | null, extra: Partial<CampaignExtras> = {}) {
    if (!campaign) return campaign;
    const base = {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        image_url: campaign.image_url,
        owner_id: campaign.owner_id,
        archived: !!campaign.archived,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
    };
    return { ...base, ...extra };
}

export function serializeCampaignList(list: CampaignRecord[] | null, statsById: Map<number, CampaignExtras> = new Map()) {
    if (!Array.isArray(list)) return [];
    return list.map((campaign) => {
        const extras = statsById.get(campaign.id) || {};
        return serializeCampaign(campaign, extras);
    });
}
