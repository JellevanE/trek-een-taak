/**
 * API utility functions for consistent error handling and request management
 */

/**
 * Base URL for the API. Empty by default, so requests stay relative
 * (`/api/...`) and work same-origin in dev and single-service deploys.
 * Set REACT_APP_API_URL at build time to point the client at a separate
 * API origin (e.g. when client and server are split into two services).
 */
const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');

/**
 * Resolves a request path against API_BASE. Absolute URLs and already-relative
 * paths (when API_BASE is unset) pass through unchanged.
 * @param {string} path - Request path, e.g. '/api/tasks'
 * @returns {string} The resolved URL
 */
export function apiUrl(path) {
    if (typeof path !== 'string' || !API_BASE || /^https?:\/\//i.test(path)) {
        return path;
    }
    return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Standard API error handler that processes response errors
 * @param {Response} res - Fetch response object
 * @param {Function} onUnauthorized - Callback for 401 errors
 * @returns {Promise} Resolved JSON data or throws error
 */
export async function handleApiResponse(res, onUnauthorized = null) {
    if (res.ok) {
        return res.json();
    }

    if (res.status === 401 && onUnauthorized) {
        onUnauthorized();
        throw new Error('Authentication expired');
    }

    let error;
    try {
        const body = await res.json();
        const message = body?.error || `Request failed with status ${res.status}`;
        error = new Error(message);
    } catch {
        error = new Error(`Request failed with status ${res.status}`);
    }

    error.status = res.status;
    throw error;
}

/**
 * Makes an authenticated API request with standard error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {Function} onUnauthorized - Callback for 401 errors
 * @returns {Promise} Response data
 */
export async function apiFetch(url, options = {}, onUnauthorized = null) {
    const res = await fetch(apiUrl(url), options);
    return handleApiResponse(res, onUnauthorized);
}

/**
 * Creates standard authorization headers
 * @param {string} token - JWT token
 * @returns {Object} Headers object
 */
export function getAuthHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}
