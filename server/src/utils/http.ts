import type { Response } from 'express';
import type { ErrorResponse } from '../types/http.js';

export function sendError(res: Response, status: number, message: string): Response<ErrorResponse> {
    return res.status(status).json({ error: message });
}
