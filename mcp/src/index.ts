import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

import { apiRequest } from './api.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function jsonResult(data: unknown): ToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

// Tool errors are returned as isError results (not thrown) so the model can
// read the API's validation message and correct its next call.
function handle<A>(fn: (args: A) => Promise<unknown>): (args: A) => Promise<ToolResult> {
    return async (args) => {
        try {
            return jsonResult(await fn(args));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { content: [{ type: 'text', text: message }], isError: true };
        }
    };
}

const priority = z.enum(['low', 'medium', 'high']);

serveStdio(() => {
    const server = new McpServer({ name: 'task-track', version: '1.0.0' });

    server.registerTool(
        'list_campaigns',
        {
            description:
                'List the user\'s campaigns with quest stats. Use this to look up campaign IDs before creating or updating anything.',
            inputSchema: z.object({
                include_archived: z.boolean().optional().describe('Also return archived campaigns'),
            }),
        },
        handle(({ include_archived }) =>
            apiRequest('GET', `/api/campaigns${include_archived ? '?include_archived=true' : ''}`)
        ),
    );

    server.registerTool(
        'create_campaign',
        {
            description: 'Create a new campaign (a themed collection of quests).',
            inputSchema: z.object({
                name: z.string().min(1).describe('Campaign title'),
                description: z.string().max(2000).optional(),
            }),
        },
        handle((body) => apiRequest('POST', '/api/campaigns', body)),
    );

    server.registerTool(
        'update_campaign',
        {
            description:
                'Update an existing campaign — rename it, change its description, or archive/unarchive it. Only the fields provided are changed.',
            inputSchema: z.object({
                id: z.number().int().positive().describe('Campaign ID (see list_campaigns)'),
                name: z.string().min(1).optional().describe('New campaign title'),
                description: z.string().max(2000).optional(),
                archived: z.boolean().optional(),
            }),
        },
        handle(({ id, ...body }) => apiRequest('PATCH', `/api/campaigns/${id}`, body)),
    );

    server.registerTool(
        'list_quests',
        {
            description:
                'List the user\'s quests (tasks), including their subquests. Use this to look up quest and subquest IDs. A quest\'s title is its "description" field.',
            inputSchema: z.object({
                campaign_id: z
                    .union([z.number().int().positive(), z.literal('none')])
                    .optional()
                    .describe('Only quests in this campaign; "none" for quests without a campaign'),
            }),
        },
        handle(({ campaign_id }) =>
            apiRequest(
                'GET',
                campaign_id === undefined ? '/api/tasks' : `/api/tasks?campaign_id=${campaign_id}`,
            )
        ),
    );

    server.registerTool(
        'create_quest',
        {
            description: 'Create a new quest (task). The "description" field is the quest title.',
            inputSchema: z.object({
                description: z.string().min(1).describe('Quest title'),
                priority: priority.optional(),
                due_date: z.string().optional().describe('Due date, YYYY-MM-DD'),
                task_level: z.number().positive().max(99).optional().describe(
                    'Quest difficulty level (1-99), drives XP',
                ),
                campaign_id: z.number().int().positive().optional().describe(
                    'Campaign to attach the quest to (see list_campaigns)',
                ),
            }),
        },
        handle((body) => apiRequest('POST', '/api/tasks', body)),
    );

    server.registerTool(
        'update_quest',
        {
            description:
                'Update an existing quest — retitle it (via "description"), change priority, due date, level, or move it to another campaign (campaign_id: null detaches it). Only the fields provided are changed.',
            inputSchema: z.object({
                id: z.number().int().positive().describe('Quest ID (see list_quests)'),
                description: z.string().min(1).optional().describe('New quest title'),
                priority: priority.optional(),
                due_date: z.string().nullable().optional().describe(
                    'Due date YYYY-MM-DD, or null to clear',
                ),
                task_level: z.number().positive().max(99).optional(),
                campaign_id: z.number().int().positive().nullable().optional(),
            }),
        },
        handle(({ id, ...body }) => apiRequest('PUT', `/api/tasks/${id}`, body)),
    );

    server.registerTool(
        'create_subquest',
        {
            description: 'Add a subquest (subtask) to an existing quest.',
            inputSchema: z.object({
                quest_id: z.number().int().positive().describe('Parent quest ID (see list_quests)'),
                description: z.string().min(1).describe('Subquest title'),
            }),
        },
        handle(({ quest_id, description }) =>
            apiRequest('POST', `/api/tasks/${quest_id}/subtasks`, { description })
        ),
    );

    server.registerTool(
        'update_subquest',
        {
            description:
                'Update a subquest — retitle it (via "description") or change its priority. Only the fields provided are changed.',
            inputSchema: z.object({
                quest_id: z.number().int().positive().describe('Parent quest ID'),
                subquest_id: z.number().int().positive().describe('Subquest ID (see list_quests)'),
                description: z.string().min(1).optional().describe('New subquest title'),
                priority: priority.optional(),
            }),
        },
        handle(({ quest_id, subquest_id, ...body }) =>
            apiRequest('PUT', `/api/tasks/${quest_id}/subtasks/${subquest_id}`, body)
        ),
    );

    return server;
});
