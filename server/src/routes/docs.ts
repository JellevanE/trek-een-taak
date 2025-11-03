import { Router } from 'express';

import { buildOpenApiDocument } from '../docs/openapi.js';

const router = Router();

router.get('/openapi.json', (_req, res) => {
    return res.json(buildOpenApiDocument());
});

router.get('/', (_req, res) => {
    return res.json({
        message: 'Task Tracker API documentation',
        openapi: '/api/docs/openapi.json'
    });
});

export default router;
