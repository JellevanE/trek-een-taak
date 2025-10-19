'use strict';

const path = require('path');

const TASKS_FILE = process.env.TASKS_FILE || path.join(__dirname, '..', 'tasks.json');
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, '..', 'users.json');
const CAMPAIGNS_FILE = process.env.CAMPAIGNS_FILE || path.join(__dirname, '..', 'campaigns.json');

module.exports = {
    TASKS_FILE,
    USERS_FILE,
    CAMPAIGNS_FILE
};
