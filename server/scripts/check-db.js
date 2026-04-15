const path = require('path');
const dotenv = require('dotenv');
const {Client} = require('pg');
const {URL} = require('url');

dotenv.config({path: path.resolve(__dirname, '../../.env'), override: true});

function buildClientConfig(dbUrl) {
    let normalizedConnectionString = dbUrl;
    let sslMode;

    try {
        const parsed = new URL(dbUrl);
        sslMode = parsed.searchParams.get('sslmode');
        if (sslMode) {
            parsed.searchParams.delete('sslmode');
            normalizedConnectionString = parsed.toString();
        }
    } catch (_) {
        // Ignore parse issues; pg will emit clearer errors when connecting.
    }

    let ssl;
    if (process.env.PG_SSL_REJECT_UNAUTHORIZED === 'false') {
        ssl = {rejectUnauthorized: false};
    } else if (process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true') {
        ssl = {rejectUnauthorized: true};
    } else if (sslMode === 'require' || sslMode === 'prefer') {
        ssl = {rejectUnauthorized: false};
    } else if (sslMode === 'verify-full' || sslMode === 'verify-ca') {
        ssl = {rejectUnauthorized: true};
    }

    return {
        connectionString: normalizedConnectionString,
        ...(ssl ? {ssl} : {})
    };
}

async function main() {
    const databaseUrl = process.argv[2] || process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL is missing in .env');
        process.exit(1);
    }

    let host = 'unknown-host';
    try {
        host = new URL(databaseUrl).hostname;
    } catch (_) {
        // Ignore parse failure; connect will fail with a clearer message.
    }

    console.log('DB_CHECK_HOST', host);
    const client = new Client(buildClientConfig(databaseUrl));

    try {
        await client.connect();
        const result = await client.query('SELECT NOW() AS now, current_database() AS db');
        console.log('DB_OK', result.rows[0]);
        process.exit(0);
    } catch (error) {
        console.error('DB_FAIL', error.message);
        process.exit(1);
    } finally {
        try {
            await client.end();
        } catch (_) {
            // ignore close errors
        }
    }
}

main();
