// Shared database utilities - PostgreSQL connection pool

const {Pool} = require('pg');
const logger = require('../utils/logger');
const {URL} = require('url');

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
    logger.error('FATAL: DATABASE_URL is required. Refusing to start without an explicit DB connection string.');
    process.exit(1);
}

function buildDbConfig(dbUrl) {
    let normalizedConnectionString = dbUrl;
    let sslMode;

    try {
        const parsed = new URL(dbUrl);
        sslMode = parsed.searchParams.get('sslmode');

        // Let node-postgres ssl object control verification behavior to avoid
        // conflicting SSL mode semantics from connection string parsing.
        if (sslMode) {
            parsed.searchParams.delete('sslmode');
            normalizedConnectionString = parsed.toString();
        }
    } catch (error) {
        logger.warn(`Unable to parse DATABASE_URL for SSL mode: ${error.message}`);
    }

    let ssl;

    // Explicit env override wins when provided.
    if (process.env.PG_SSL_REJECT_UNAUTHORIZED === 'false') {
        ssl = {rejectUnauthorized: false};
    } else if (process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true') {
        ssl = {rejectUnauthorized: true};
    } else if (sslMode === 'require' || sslMode === 'prefer') {
        // Supabase pooler often works with encryption but without strict chain validation
        // in local Docker/WSL trust stores.
        ssl = {rejectUnauthorized: false};
    } else if (sslMode === 'verify-full' || sslMode === 'verify-ca') {
        ssl = {rejectUnauthorized: true};
    }

    return {connectionString: normalizedConnectionString, ssl};
}

const {connectionString, ssl} = buildDbConfig(rawConnectionString);

const pool = new Pool({
    connectionString,
    ...(ssl ? {ssl} : {}),
    max: 30,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 0,
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client:', err);
});

// Health check
async function checkConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        logger.info('Database connection established');
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error.message);
        return false;
    }
}

// Query wrapper with error handling
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug(`Query executed in ${duration}ms`);
        return result.rows;
    } catch (error) {
        logger.error(`Database query error: ${error.message}`);
        throw error;
    }
}

// Transaction wrapper
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Transaction failed: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    query,
    transaction,
    checkConnection
};
