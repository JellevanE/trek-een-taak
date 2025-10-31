import type { Request } from 'express';
import type { ZodSchema } from 'zod';

import {
    formatZodError,
    type ValidationErrorPayload,
    type ValidationIssue,
    type ValidationResult
} from './helpers';

export interface RequestSchemas<B = unknown, Q = unknown, P = unknown, H = unknown> {
    body?: ZodSchema<B>;
    query?: ZodSchema<Q>;
    params?: ZodSchema<P>;
    headers?: ZodSchema<H>;
}

export interface ValidatedRequestParts<B = unknown, Q = unknown, P = unknown, H = unknown> {
    body: B | undefined;
    query: Q | undefined;
    params: P | undefined;
    headers: H | undefined;
}

function collectIssues(existing: ValidationIssue[], payload: ValidationErrorPayload): ValidationIssue[] {
    existing.push(...payload.issues);
    return existing;
}

function summarizeIssues(issues: ValidationIssue[]): string {
    if (issues.length === 0) return 'Validation passed';
    if (issues.length === 1) return `Invalid ${issues[0].path || 'request'}: ${issues[0].message}`;
    return `Invalid request with ${issues.length} issues`;
}

export function validateRequest<
    B = unknown,
    Q = unknown,
    P = unknown,
    H = unknown
>(
    req: Request,
    schemas: RequestSchemas<B, Q, P, H>
): ValidationResult<ValidatedRequestParts<B, Q, P, H>> {
    const issues: ValidationIssue[] = [];
    const parts: ValidatedRequestParts<B, Q, P, H> = {
        body: undefined,
        query: undefined,
        params: undefined,
        headers: undefined
    };

    if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body);
        if (parsed.success) {
            parts.body = parsed.data;
        } else {
            collectIssues(issues, formatZodError(parsed.error, 'body'));
        }
    }

    if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query);
        if (parsed.success) {
            parts.query = parsed.data;
        } else {
            collectIssues(issues, formatZodError(parsed.error, 'query'));
        }
    }

    if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params);
        if (parsed.success) {
            parts.params = parsed.data;
        } else {
            collectIssues(issues, formatZodError(parsed.error, 'params'));
        }
    }

    if (schemas.headers) {
        const parsed = schemas.headers.safeParse(req.headers);
        if (parsed.success) {
            parts.headers = parsed.data;
        } else {
            collectIssues(issues, formatZodError(parsed.error, 'headers'));
        }
    }

    if (issues.length > 0) {
        return {
            success: false,
            error: {
                issues,
                summary: summarizeIssues(issues)
            }
        };
    }

    return { success: true, data: parts };
}
