import type { Response } from 'express';

import { sendError } from './http';
import type { AuthenticatedRequest, RequestWithUser } from '../types/auth';

export function assertAuthenticated<T extends AuthenticatedRequest>(
    req: T,
    res: Response
): req is RequestWithUser<T> {
    if (!req.user) {
        sendError(res, 401, 'Authentication required');
        return false;
    }
    return true;
}
