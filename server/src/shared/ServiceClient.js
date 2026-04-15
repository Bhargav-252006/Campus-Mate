// Shared utilities for inter-service communication
// Services communicate via REST APIs with standardized requests/responses

const axios = require('axios');
const logger = require('../utils/logger');

class ServiceClient {
    constructor(baseURL, timeout = 5000) {
        this.client = axios.create({
            baseURL,
            timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Request': 'true'
            }
        });
    }

    async get(path, config = {}) {
        try {
            const response = await this.client.get(path, config);
            return response.data;
        } catch (error) {
            logger.error(`ServiceClient GET ${path}:`, error.message);
            throw new Error(`Service call failed: ${error.message}`);
        }
    }

    async post(path, data, config = {}) {
        try {
            const response = await this.client.post(path, data, config);
            return response.data;
        } catch (error) {
            logger.error(`ServiceClient POST ${path}:`, error.message);
            throw new Error(`Service call failed: ${error.message}`);
        }
    }

    async put(path, data, config = {}) {
        try {
            const response = await this.client.put(path, data, config);
            return response.data;
        } catch (error) {
            logger.error(`ServiceClient PUT ${path}:`, error.message);
            throw new Error(`Service call failed: ${error.message}`);
        }
    }

    async delete(path, config = {}) {
        try {
            const response = await this.client.delete(path, config);
            return response.data;
        } catch (error) {
            logger.error(`ServiceClient DELETE ${path}:`, error.message);
            throw new Error(`Service call failed: ${error.message}`);
        }
    }
}

module.exports = ServiceClient;
