/**
 * Harness - Main orchestrator for running agents on tasks
 * 
 * This will be implemented in Phase 6
 */

import type { HarnessConfig, TaskResult } from './types.js';

/**
 * Harness class - Main entry point for running agents
 * 
 * This is a placeholder - full implementation coming in Phase 6
 */
export class Harness {
    private _config: HarnessConfig;

    constructor(config: HarnessConfig) {
        this._config = config;
    }

    // Getter for config (will be used in Phase 6)
    protected get config(): HarnessConfig {
        return this._config;
    }

    async run(_tasks?: string | string[]): Promise<Record<string, TaskResult>> {
        // TODO: Implement harness run logic in Phase 6
        throw new Error('Harness not yet implemented - coming in Phase 6');
    }
}
