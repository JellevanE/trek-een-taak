import type { Response } from 'express';
import { assertAuthenticated } from '../utils/authGuard.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import { sendError } from '../utils/http.js';
import { StorylineService } from '../services/storyline.service.js';

type BaseAuthedRequest = AuthenticatedRequest<{ campaignId: string }>;

export async function getStoryline(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;

    const campaignId = parseInt(req.params.campaignId, 10);
    if (isNaN(campaignId)) return sendError(res, 400, 'Invalid campaign ID');

    const storyline = StorylineService.getStoryline(campaignId);
    if (!storyline) {
        // If no storyline exists, we could return 404. 
        // But per plan, automatic creation happens on campaign create. 
        // If somehow missing, maybe 404 is correct.
        return sendError(res, 404, 'Storyline not found');
    }

    return res.json(storyline);
}

export async function checkUpdate(req: BaseAuthedRequest, res: Response) {
    if (!assertAuthenticated(req, res)) return;

    const campaignId = parseInt(req.params.campaignId, 10);
    if (isNaN(campaignId)) return sendError(res, 400, 'Invalid campaign ID');

    const storyline = StorylineService.getStoryline(campaignId);
    if (!storyline) {
        return sendError(res, 404, 'Storyline not found');
    }

    try {
        const result = await StorylineService.checkAndGenerateUpdate(storyline.id, req.user.id);
        return res.json(result);
    } catch (error) {
        console.error('Error checking updates:', error);
        return sendError(res, 500, 'Failed to check updates');
    }
}
