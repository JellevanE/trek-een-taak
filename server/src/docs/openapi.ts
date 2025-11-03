import type { JsonSchema } from './zodToJsonSchema.js';
import { SchemaRegistry, convert } from './zodToJsonSchema.js';

import { emailValidationRequestSchema, loginUserSchema, profileUpdateSchema, registerUserSchema } from '../validation/schemas/auth.js';
import {
    campaignIdParamsSchema,
    createCampaignSchema,
    listCampaignsQuerySchema,
    updateCampaignSchema
} from '../validation/schemas/campaigns.js';
import { seedTasksSchema } from '../validation/schemas/debug.js';
import { grantXpSchema } from '../validation/schemas/rpg.js';
import {
    createSubtaskSchema,
    createTaskSchema,
    updateOrderSchema,
    updateStatusSchema,
    updateSubtaskSchema,
    updateTaskSchema
} from '../validation/schemas/tasks.js';
import {
    authSuccessResponseSchema,
    campaignDetailsResponseSchema,
    campaignListResponseSchema,
    campaignSchema,
    clearTasksResponseSchema,
    currentUserResponseSchema,
    emailValidationResponseSchema,
    errorSchema,
    playerSnapshotResponseSchema,
    publicUserRpgStateSchema,
    publicUserSchema,
    seedTasksResponseSchema,
    taskHistoryResponseSchema,
    taskListResponseSchema,
    taskOrderResponseSchema,
    taskResponseSchema,
    taskWithProgressSchema,
    usernameAvailabilitySchema,
    xpGrantResponseSchema
} from './schemas.js';

function applyNullable(target: JsonSchema, nullable: boolean): JsonSchema {
    if (nullable) {
        return { ...target, nullable: true };
    }
    return target;
}

function buildIntegerParamSchema(options: { minimum?: number } = {}): JsonSchema {
    const schema: JsonSchema = { type: 'integer' };
    if (typeof options.minimum === 'number') {
        schema.minimum = options.minimum;
    }
    return schema;
}

export function buildOpenApiDocument() {
    const registry = new SchemaRegistry();

    const errorRef = registry.register('ErrorResponse', errorSchema);
    const publicUserRef = registry.register('PublicUser', publicUserSchema);
    const publicUserRpgRef = registry.register('PublicUserRpgState', publicUserRpgStateSchema);
    const authResponseRef = registry.register('AuthSuccessResponse', authSuccessResponseSchema);
    const currentUserResponseRef = registry.register('CurrentUserResponse', currentUserResponseSchema);
    const usernameAvailabilityRef = registry.register('UsernameAvailabilityResponse', usernameAvailabilitySchema);
    const emailValidationResponseRef = registry.register('EmailValidationResponse', emailValidationResponseSchema);
    const taskRef = registry.register('Task', taskResponseSchema);
    const taskWithProgressRef = registry.register('TaskWithProgress', taskWithProgressSchema);
    const taskListRef = registry.register('TaskListResponse', taskListResponseSchema);
    const taskOrderRef = registry.register('TaskOrderResponse', taskOrderResponseSchema);
    const taskHistoryRef = registry.register('TaskHistoryResponse', taskHistoryResponseSchema);
    const campaignRef = registry.register('Campaign', campaignSchema);
    const campaignListRef = registry.register('CampaignListResponse', campaignListResponseSchema);
    const campaignDetailsRef = registry.register('CampaignDetailsResponse', campaignDetailsResponseSchema);
    const seedTasksResponseRef = registry.register('SeedTasksResponse', seedTasksResponseSchema);
    const clearTasksResponseRef = registry.register('ClearTasksResponse', clearTasksResponseSchema);
    const xpGrantResponseRef = registry.register('XpGrantResponse', xpGrantResponseSchema);
    const playerSnapshotRef = registry.register('PlayerSnapshotResponse', playerSnapshotResponseSchema);

    const registerUserRequestRef = registry.register('RegisterUserRequest', registerUserSchema);
    const loginRequestRef = registry.register('LoginRequest', loginUserSchema);
    const profileUpdateRequestRef = registry.register('ProfileUpdateRequest', profileUpdateSchema);
    const emailValidationRequestRef = registry.register('EmailValidationRequest', emailValidationRequestSchema);
    const createTaskRequestRef = registry.register('CreateTaskRequest', createTaskSchema);
    const createSubtaskRequestRef = registry.register('CreateSubtaskRequest', createSubtaskSchema);
    const updateStatusRequestRef = registry.register('UpdateStatusRequest', updateStatusSchema);
    const updateTaskRequestRef = registry.register('UpdateTaskRequest', updateTaskSchema);
    const updateSubtaskRequestRef = registry.register('UpdateSubtaskRequest', updateSubtaskSchema);
    const updateOrderRequestRef = registry.register('UpdateOrderRequest', updateOrderSchema);
    const createCampaignRequestRef = registry.register('CreateCampaignRequest', createCampaignSchema);
    const updateCampaignRequestRef = registry.register('UpdateCampaignRequest', updateCampaignSchema);
    const grantXpRequestRef = registry.register('GrantXpRequest', grantXpSchema);
    const seedTasksRequestRef = registry.register('SeedTasksRequest', seedTasksSchema);

    const includeArchivedSchema = (() => {
        const raw = listCampaignsQuerySchema.shape.include_archived;
        if (!raw) return { type: 'string' } as JsonSchema;
        const converted = convert(raw);
        return applyNullable({ ...converted.schema }, converted.nullable);
    })();

    const idParamSchema = (() => {
        const raw = campaignIdParamsSchema.shape.id;
        if (!raw) return buildIntegerParamSchema({ minimum: 1 });
        const converted = convert(raw);
        const schema = { ...converted.schema };
        return applyNullable(schema, converted.nullable);
    })();

    const subtaskIdSchema = buildIntegerParamSchema({ minimum: 1 });

    const rateLimitHeaders = {
        'X-RateLimit-Limit': {
            schema: buildIntegerParamSchema({ minimum: 0 }),
            description: 'Maximum number of allowed requests within the window.'
        },
        'X-RateLimit-Remaining': {
            schema: buildIntegerParamSchema({ minimum: 0 }),
            description: 'Remaining attempts available in the current window.'
        },
        'Retry-After': {
            schema: buildIntegerParamSchema({ minimum: 1 }),
            description: 'Seconds until the limit resets (only sent when rate limited).'
        }
    };

    const authSecurity = [{ bearerAuth: [] }];

    const jsonContent = (schema: JsonSchema) => ({
        'application/json': {
            schema
        }
    });

    const doc = {
        openapi: '3.0.3',
        info: {
            title: 'Task Tracker API',
            version: '1.0.0',
            description:
                'OpenAPI definition for the Task Tracker backend. Schemas are derived from the runtime Zod validators to stay in sync with request and response types.'
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Local development'
            }
        ],
        tags: [
            { name: 'Users' },
            { name: 'Tasks' },
            { name: 'Campaigns' },
            { name: 'RPG' },
            { name: 'Debug' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: registry.components
        },
        paths: {
            '/api/users/register': {
                post: {
                    tags: ['Users'],
                    summary: 'Register a new user',
                    requestBody: {
                        required: true,
                        content: jsonContent(registerUserRequestRef)
                    },
                    responses: {
                        '201': {
                            description: 'User registered successfully.',
                            headers: rateLimitHeaders,
                            content: jsonContent(authResponseRef)
                        },
                        '400': {
                            description: 'Invalid registration payload.',
                            content: jsonContent(errorRef)
                        },
                        '429': {
                            description: 'Rate limit exceeded.',
                            headers: rateLimitHeaders,
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/users/login': {
                post: {
                    tags: ['Users'],
                    summary: 'Authenticate a user session',
                    requestBody: {
                        required: true,
                        content: jsonContent(loginRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Authentication succeeded.',
                            content: jsonContent(authResponseRef)
                        },
                        '400': {
                            description: 'Invalid credentials payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication failed.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/users/validate-email': {
                post: {
                    tags: ['Users'],
                    summary: 'Validate email address formatting',
                    requestBody: {
                        required: true,
                        content: jsonContent(emailValidationRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Validation result.',
                            content: jsonContent(emailValidationResponseRef)
                        },
                        '400': {
                            description: 'Malformed request body.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/users/check-username/{username}': {
                get: {
                    tags: ['Users'],
                    summary: 'Check username availability',
                    parameters: [
                        {
                            name: 'username',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', minLength: 1 }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Availability result.',
                            content: jsonContent(usernameAvailabilityRef)
                        },
                        '400': {
                            description: 'Missing or invalid username.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/users/me': {
                get: {
                    tags: ['Users'],
                    summary: 'Retrieve the currently authenticated user',
                    security: authSecurity,
                    responses: {
                        '200': {
                            description: 'Current user details.',
                            content: jsonContent(currentUserResponseRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update the authenticated user profile',
                    security: authSecurity,
                    requestBody: {
                        required: true,
                        content: jsonContent(profileUpdateRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Updated profile.',
                            content: jsonContent(currentUserResponseRef)
                        },
                        '400': {
                            description: 'Validation failed.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks': {
                get: {
                    tags: ['Tasks'],
                    summary: 'List tasks for the authenticated user',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'campaign_id',
                            in: 'query',
                            required: false,
                            schema: {
                                oneOf: [
                                    buildIntegerParamSchema({ minimum: 1 }),
                                    { type: 'string', enum: ['none', 'null'] }
                                ]
                            },
                            description: 'Filter tasks by campaign id or "null"/"none" for unassigned tasks.'
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Task list response.',
                            content: jsonContent(taskListRef)
                        },
                        '400': {
                            description: 'Invalid query parameter.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                post: {
                    tags: ['Tasks'],
                    summary: 'Create a new task',
                    security: authSecurity,
                    requestBody: {
                        required: true,
                        content: jsonContent(createTaskRequestRef)
                    },
                    responses: {
                        '201': {
                            description: 'Task created.',
                            content: jsonContent(taskRef)
                        },
                        '400': {
                            description: 'Invalid task payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Referenced campaign not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/{id}': {
                put: {
                    tags: ['Tasks'],
                    summary: 'Update an existing task',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: jsonContent(updateTaskRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Updated task.',
                            content: jsonContent(taskRef)
                        },
                        '400': {
                            description: 'Validation failed.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                delete: {
                    tags: ['Tasks'],
                    summary: 'Delete a task',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    responses: {
                        '204': {
                            description: 'Task deleted.'
                        },
                        '400': {
                            description: 'Invalid task id.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/{id}/subtasks': {
                post: {
                    tags: ['Tasks'],
                    summary: 'Create a subtask',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: jsonContent(createSubtaskRequestRef)
                    },
                    responses: {
                        '201': {
                            description: 'Subtask created.',
                            content: jsonContent(taskRef)
                        },
                        '400': {
                            description: 'Invalid subtask payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/{id}/status': {
                patch: {
                    tags: ['Tasks'],
                    summary: 'Update the status of a task',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: jsonContent(updateStatusRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Task updated.',
                            content: jsonContent(taskWithProgressRef)
                        },
                        '400': {
                            description: 'Invalid status payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/{id}/history': {
                get: {
                    tags: ['Tasks'],
                    summary: 'Retrieve the status history for a task',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Status history.',
                            content: jsonContent(taskHistoryRef)
                        },
                        '400': {
                            description: 'Invalid task id.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/{id}/subtasks/{subtask_id}': {
                put: {
                    tags: ['Tasks'],
                    summary: 'Update a subtask',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        },
                        {
                            name: 'subtask_id',
                            in: 'path',
                            required: true,
                            schema: subtaskIdSchema
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: jsonContent(updateSubtaskRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Updated task response.',
                            content: jsonContent(taskRef)
                        },
                        '400': {
                            description: 'Validation failed.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task or subtask not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                delete: {
                    tags: ['Tasks'],
                    summary: 'Delete a subtask',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        },
                        {
                            name: 'subtask_id',
                            in: 'path',
                            required: true,
                            schema: subtaskIdSchema
                        }
                    ],
                    responses: {
                        '204': {
                            description: 'Subtask deleted.'
                        },
                        '400': {
                            description: 'Invalid identifier.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task or subtask not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/{id}/subtasks/{subtask_id}/status': {
                patch: {
                    tags: ['Tasks'],
                    summary: 'Update a subtask status',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        },
                        {
                            name: 'subtask_id',
                            in: 'path',
                            required: true,
                            schema: subtaskIdSchema
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: jsonContent(updateStatusRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Updated task including recent XP changes.',
                            content: jsonContent(taskWithProgressRef)
                        },
                        '400': {
                            description: 'Invalid payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Task or subtask not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/tasks/order': {
                put: {
                    tags: ['Tasks'],
                    summary: 'Update task ordering',
                    security: authSecurity,
                    requestBody: {
                        required: true,
                        content: jsonContent(updateOrderRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Sorted task list.',
                            content: jsonContent(taskOrderRef)
                        },
                        '400': {
                            description: 'Invalid request payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/campaigns': {
                get: {
                    tags: ['Campaigns'],
                    summary: 'List campaigns with summary stats',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'include_archived',
                            in: 'query',
                            required: false,
                            schema: includeArchivedSchema,
                            description: 'Include archived campaigns when set to "true". Accepts either a single string or repeated query parameters.'
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Campaign list.',
                            content: jsonContent(campaignListRef)
                        },
                        '400': {
                            description: 'Invalid query parameter.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                post: {
                    tags: ['Campaigns'],
                    summary: 'Create a campaign',
                    security: authSecurity,
                    requestBody: {
                        required: true,
                        content: jsonContent(createCampaignRequestRef)
                    },
                    responses: {
                        '201': {
                            description: 'Campaign created.',
                            content: jsonContent(campaignRef)
                        },
                        '400': {
                            description: 'Invalid payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/campaigns/{id}': {
                get: {
                    tags: ['Campaigns'],
                    summary: 'Get campaign details including quests',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Campaign details.',
                            content: jsonContent(campaignDetailsRef)
                        },
                        '400': {
                            description: 'Invalid campaign id.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Campaign not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                patch: {
                    tags: ['Campaigns'],
                    summary: 'Update a campaign',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: jsonContent(updateCampaignRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'Updated campaign.',
                            content: jsonContent(campaignRef)
                        },
                        '400': {
                            description: 'Invalid payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Campaign not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                },
                delete: {
                    tags: ['Campaigns'],
                    summary: 'Delete a campaign',
                    security: authSecurity,
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: idParamSchema
                        }
                    ],
                    responses: {
                        '204': {
                            description: 'Campaign removed.'
                        },
                        '400': {
                            description: 'Invalid campaign id.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'Campaign not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/rpg/daily-reward': {
                post: {
                    tags: ['RPG'],
                    summary: 'Claim the daily reward',
                    security: authSecurity,
                    responses: {
                        '200': {
                            description: 'Reward granted.',
                            content: jsonContent(xpGrantResponseRef)
                        },
                        '400': {
                            description: 'Reward already claimed or unavailable.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/rpg/grant-xp': {
                post: {
                    tags: ['RPG'],
                    summary: 'Adjust XP directly',
                    security: authSecurity,
                    requestBody: {
                        required: true,
                        content: jsonContent(grantXpRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'XP adjusted.',
                            content: jsonContent(xpGrantResponseRef)
                        },
                        '400': {
                            description: 'Invalid adjustment payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/rpg/reset': {
                post: {
                    tags: ['RPG'],
                    summary: 'Reset RPG state',
                    security: authSecurity,
                    responses: {
                        '200': {
                            description: 'RPG state reset.',
                            content: jsonContent(playerSnapshotRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/debug/clear-tasks': {
                post: {
                    tags: ['Debug'],
                    summary: 'Remove all tasks for the current user',
                    security: authSecurity,
                    responses: {
                        '200': {
                            description: 'Tasks removed.',
                            content: jsonContent(clearTasksResponseRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/debug/seed-tasks': {
                post: {
                    tags: ['Debug'],
                    summary: 'Seed demo tasks for the current user',
                    security: authSecurity,
                    requestBody: {
                        required: false,
                        content: jsonContent(applyNullable({ ...seedTasksRequestRef }, false))
                    },
                    responses: {
                        '200': {
                            description: 'Demo tasks created.',
                            content: jsonContent(seedTasksResponseRef)
                        },
                        '400': {
                            description: 'Invalid seed payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/debug/grant-xp': {
                post: {
                    tags: ['Debug'],
                    summary: 'Grant XP via debug endpoint',
                    security: authSecurity,
                    requestBody: {
                        required: true,
                        content: jsonContent(grantXpRequestRef)
                    },
                    responses: {
                        '200': {
                            description: 'XP granted.',
                            content: jsonContent(xpGrantResponseRef)
                        },
                        '400': {
                            description: 'Invalid payload.',
                            content: jsonContent(errorRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            },
            '/api/debug/reset-rpg': {
                post: {
                    tags: ['Debug'],
                    summary: 'Reset RPG state via debug',
                    security: authSecurity,
                    responses: {
                        '200': {
                            description: 'RPG state reset.',
                            content: jsonContent(playerSnapshotRef)
                        },
                        '401': {
                            description: 'Authentication required.',
                            content: jsonContent(errorRef)
                        },
                        '404': {
                            description: 'User not found.',
                            content: jsonContent(errorRef)
                        }
                    }
                }
            }
        }
    };

    return doc;
}
