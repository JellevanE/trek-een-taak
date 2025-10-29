/**
 * API utility functions for consistent error handling and request management
 */

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
    
    try {
        const body = await res.json();
        const message = body?.error || `Request failed with status ${res.status}`;
        const error = new Error(message);
        error.status = res.status;
        throw error;
    } catch {
        const error = new Error(`Request failed with status ${res.status}`);
        error.status = res.status;
        throw error;
    }
}

/**
 * Makes an authenticated API request with standard error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {Function} onUnauthorized - Callback for 401 errors
 * @returns {Promise} Response data
 */
export async function apiFetch(url, options = {}, onUnauthorized = null) {
    const res = await fetch(url, options);
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
        'Authorization': `Bearer ${token}`
    };
}
