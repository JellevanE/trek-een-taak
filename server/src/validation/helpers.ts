import { ZodError, type ZodIssue, type ZodSchema } from 'zod';

export interface ValidationIssue {
    path: string;
    message: string;
    code: ZodIssue['code'];
}

export interface ValidationErrorPayload {
    issues: ValidationIssue[];
    summary: string;
}

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: ValidationErrorPayload };

export class SchemaValidationError extends Error {
    public readonly issues: ValidationIssue[];

    constructor(payload: ValidationErrorPayload) {
        super(payload.summary);
        this.name = 'SchemaValidationError';
        this.issues = payload.issues;
    }
}

function buildPath(scope: string | undefined, pathSegments: (string | number)[]): string {
    const segments = scope ? [scope, ...pathSegments] : [...pathSegments];
    return segments
        .map((segment) => segment.toString())
        .filter((segment) => segment.length > 0)
        .join('.');
}

function mapIssues(error: ZodError, scope?: string): ValidationIssue[] {
    return error.issues.map((issue) => ({
        path: buildPath(scope, issue.path),
        message: issue.message,
        code: issue.code
    }));
}

export function formatZodError(error: ZodError, scope?: string): ValidationErrorPayload {
    const issues = mapIssues(error, scope);
    let summary: string;
    if (issues.length === 1) {
        const [singleIssue] = issues;
        const targetPath = singleIssue?.path && singleIssue.path.length > 0 ? singleIssue.path : scope ?? 'value';
        const message = singleIssue?.message ?? 'Validation failed';
        summary = `Validation failed for ${targetPath}: ${message}`;
    } else {
        summary = `Validation failed with ${issues.length} issues`;
    }
    return { issues, summary };
}

export function parseWithSchema<T>(
    schema: ZodSchema<T>,
    payload: unknown,
    scope?: string
): ValidationResult<T> {
    const result = schema.safeParse(payload);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: formatZodError(result.error, scope) };
}

export function assertWithSchema<T>(schema: ZodSchema<T>, payload: unknown, scope?: string): T {
    const parsed = parseWithSchema(schema, payload, scope);
    if (!parsed.success) {
        throw new SchemaValidationError(parsed.error);
    }
    return parsed.data;
}
