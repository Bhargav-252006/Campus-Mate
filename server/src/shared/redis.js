// Shared Redis utilities for caching, pub/sub, and rate limiting

const redis = require('redis');
const logger = require('../utils/logger');

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379/0',
    socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => Math.min(1000 + retries * 250, 5000)
    }
});

let redisReady = false;
let lastRedisErrorLogAt = 0;

function logRedisErrorThrottled(prefix, err) {
    const now = Date.now();
    if (now - lastRedisErrorLogAt < 5000) {
        return;
    }
    lastRedisErrorLogAt = now;
    logger.error(prefix, err);
}

function isRedisUsable() {
    return redisReady && redisClient.isOpen;
}

redisClient.on('error', (err) => {
    redisReady = false;
    logRedisErrorThrottled('Redis connection error:', err);
});

redisClient.on('connect', () => {
    logger.info('Redis connected');
});

redisClient.on('ready', () => {
    redisReady = true;
    logger.info('Redis ready');
});

redisClient.on('end', () => {
    redisReady = false;
    logger.warn('Redis connection closed');
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        redisReady = false;
        logger.error('Failed to connect to Redis:', error);
    }
})();

// Cache operations
const cache = {
    async set(key, value, ttl = 3600) {
        if (!isRedisUsable()) {
            return;
        }
        try {
            const serialized = JSON.stringify(value);
            if (ttl) {
                await redisClient.setEx(key, ttl, serialized);
            } else {
                await redisClient.set(key, serialized);
            }
            logger.debug(`Cache SET: ${key}`);
        } catch (error) {
            logRedisErrorThrottled(`Cache SET error for ${key}:`, error);
        }
    },

    async get(key) {
        if (!isRedisUsable()) {
            return null;
        }
        try {
            const value = await redisClient.get(key);
            if (value) {
                logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(value);
            }
            logger.debug(`Cache MISS: ${key}`);
            return null;
        } catch (error) {
            logRedisErrorThrottled(`Cache GET error for ${key}:`, error);
            return null;
        }
    },

    async delete(key) {
        if (!isRedisUsable()) {
            return;
        }
        try {
            await redisClient.del(key);
            logger.debug(`Cache DELETE: ${key}`);
        } catch (error) {
            logRedisErrorThrottled(`Cache DELETE error for ${key}:`, error);
        }
    },

    async flush() {
        if (!isRedisUsable()) {
            return;
        }
        try {
            await redisClient.flushDb();
            logger.info('Cache flushed');
        } catch (error) {
            logRedisErrorThrottled('Cache flush error:', error);
        }
    }
};

// Pub/Sub for event broadcasting
const pubSub = {
    async publish(channel, message) {
        if (!isRedisUsable()) {
            return 0;
        }
        try {
            const subscribers = await redisClient.publish(channel, JSON.stringify(message));
            logger.debug(`Published to ${channel}: ${subscribers} subscribers`);
            return subscribers;
        } catch (error) {
            logRedisErrorThrottled(`Publish error on ${channel}:`, error);
            return 0;
        }
    },

    async subscribe(channel, handler) {
        if (!isRedisUsable()) {
            return null;
        }
        try {
            const subscriber = redisClient.duplicate();
            await subscriber.connect();

            subscriber.subscribe(channel, (message) => {
                logger.debug(`Received message on ${channel}`);
                handler(JSON.parse(message));
            });

            logger.info(`Subscribed to ${channel}`);
            return subscriber;
        } catch (error) {
            logRedisErrorThrottled(`Subscribe error on ${channel}:`, error);
            return null;
        }
    }
};

// Rate limiting  
const rateLimit = {
    async isLimited(key, limit = 100, window = 60) {
        if (!isRedisUsable()) {
            return false;
        }
        try {
            const count = await redisClient.incr(key);
            if (count === 1) {
                await redisClient.expire(key, window);
            }
            return count > limit;
        } catch (error) {
            logRedisErrorThrottled(`Rate limit check error for ${key}:`, error);
            return false;
        }
    }
};

module.exports = {
    redisClient,
    cache,
    pubSub,
    rateLimit
};
