const app = require('./app');
const listEndpoints = require('express-list-endpoints');

console.log(listEndpoints(app));