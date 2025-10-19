'use strict';

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

module.exports = {
    sendError
};

