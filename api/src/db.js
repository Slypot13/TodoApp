const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.database.connectionString,
  ssl: config.database.ssl,
  max: 5,
});

module.exports = pool;
