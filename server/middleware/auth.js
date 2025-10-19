'use strict';

const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/http');
const { primaryJwtSecret, jwtSecrets } = require('../config');

function signToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, primaryJwtSecret, { expiresIn: '7d' });
}

function verifyToken(token) {
    let lastError = null;
    for (const secret of jwtSecrets) {
        try {
            return jwt.verify(token, secret);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Invalid or expired token');
}

function authenticate(req, res, next) {
    const auth = req.headers && req.headers.authorization;
    if (!auth) return next();
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return sendError(res, 401, 'Invalid auth format');
    const token = parts[1];
    try {
        const payload = verifyToken(token);
        req.user = { id: payload.id, username: payload.username };
        return next();
    } catch (e) {
        return sendError(res, 401, 'Invalid or expired token');
    }
}

function ensureAuth(req, res, next) {
    if (!req.user || typeof req.user.id !== 'number') return sendError(res, 401, 'Authentication required');
    return next();
}

module.exports = {
    authenticate,
    ensureAuth,
    signToken,
    verifyToken
};

