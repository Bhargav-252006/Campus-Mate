/**
 * 🔧 TOOL EXECUTION LAYER (shim)
 *
 * Re-exports from the modular tools/registry.js for backward compatibility.
 * All tool logic now lives in server/src/tools/*.js
 */
const registry = require('../tools/registry');

module.exports = registry;
