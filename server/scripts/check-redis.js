const path = require('path');
const dotenv = require('dotenv');
const redis = require('redis');

dotenv.config({path: path.resolve(__dirname, '../../.env')});

async function main() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.error('REDIS_URL is missing in .env');
        process.exit(1);
    }

    const client = redis.createClient({url: redisUrl});

    try {
        await client.connect();
        const pong = await client.ping();
        console.log('REDIS_OK', pong);
        process.exit(0);
    } catch (error) {
        console.error('REDIS_FAIL', error.message);
        process.exit(1);
    } finally {
        try {
            await client.quit();
        } catch (_) {
            // ignore close errors
        }
    }
}

main();
