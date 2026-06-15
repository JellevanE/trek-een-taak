import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { sendError } from '../utils/http.js';
import { readCampaigns } from '../data/campaignStore.js';
import { StorylineService } from '../services/storyline.service.js';

type BaseAuthedRequest<B = unknown> = AuthenticatedRequest<ParamsDictionary, unknown, B>;

const VALID_TYPES = ['intro', 'daily', 'reflection', 'completion'] as const;
type UpdateType = (typeof VALID_TYPES)[number];

interface GenerateBody {
    campaign_id?: unknown;
    type?: unknown;
}

// Debug-only: force a storyline update of a chosen type for an owned campaign,
// bypassing the new-day gate, the per-user daily quota, and the in-flight guard.
// Lets a developer stack updates and preview each type on demand. Admin-gated by
// the debug router. Makes a real generation call (synchronous response).
export async function generateStorylineUpdate(
    req: BaseAuthedRequest<GenerateBody>,
    res: Response,
) {
    if (!assertAuthenticated(req, res)) return;

    const body = req.body ?? {};
    const campaignId = Number(body.campaign_id);
    if (!Number.isInteger(campaignId)) {
        return sendError(res, 400, 'campaign_id must be a number');
    }

    const type = (body.type ?? 'daily') as string;
    if (!VALID_TYPES.includes(type as UpdateType)) {
        return sendError(res, 400, `type must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const campaign = readCampaigns().campaigns.find((c) => c.id === campaignId);
    if (!campaign || campaign.owner_id !== req.user.id) {
        return sendError(res, 404, 'Campaign not found');
    }

    const storyline = StorylineService.getStoryline(campaignId)
        ?? StorylineService.createStoryline(campaignId);

    try {
        await StorylineService.generateStoryUpdate(storyline, type as UpdateType, req.user.id);
    } catch (error) {
        console.error('Debug storyline generation failed', error);
        return sendError(res, 502, 'Story generation failed');
    }

    return res.json(StorylineService.getStoryline(campaignId));
}
