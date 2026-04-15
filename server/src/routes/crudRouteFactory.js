/**
 * CRUD Route Factory - Generates standard CRUD routers
 *
 * A1-A2 fix: Now uses BaseRepository (async) instead of DataStore.
 * Eliminates the third data layer entirely.
 */
const express = require('express');
const logger = require('../utils/logger');

/**
 * @param {object} opts
 * @param {object} opts.repo        - BaseRepository instance (getByUserId, add, update, remove)
 * @param {string} opts.entityName  - Human-readable name for logs/errors (e.g. "Exam")
 * @param {function} opts.validate  - (body) => string|null. Returns error message or null.
 */
function createCrudRouter({repo, entityName, validate}) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const items = await repo.getByUserId(req.userId);
            res.json(items);
        } catch (error) {
            logger.error(`Error getting ${entityName}`, error);
            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    router.post('/', async (req, res) => {
        try {
            const validationError = validate ? validate(req.body) : null;
            if (validationError) {
                return res.status(400).json({error: validationError});
            }
            const newItem = await repo.add(req.userId, req.body);
            res.status(201).json(newItem);
        } catch (error) {
            logger.error(`Error adding ${entityName}`, error);
            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const updated = await repo.update(req.userId, req.params.id, req.body);
            if (updated) {
                res.json(updated);
            } else {
                res.status(404).json({error: `${entityName} not found`});
            }
        } catch (error) {
            logger.error(`Error updating ${entityName}`, error);
            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await repo.remove(req.userId, req.params.id);
            if (deleted) {
                res.json({success: true});
            } else {
                res.status(404).json({error: `${entityName} not found`});
            }
        } catch (error) {
            logger.error(`Error deleting ${entityName}`, error);
            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    return router;
}

module.exports = {createCrudRouter};
