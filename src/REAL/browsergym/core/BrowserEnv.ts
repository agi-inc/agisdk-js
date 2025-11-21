/**
 * BrowserEnv - Gymnasium-like browser environment
 * 
 * This will be implemented in Phase 3
 */

import type { Task, Observation } from '../../types.js';

/**
 * Browser environment configuration
 */
export interface BrowserEnvConfig {
    taskName: string;
    taskVersion?: string;
    headless?: boolean;
    maxSteps?: number;
    viewport?: { width: number; height: number };
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    runId?: string;
    apiKey?: string;
    modelIdName?: string;
    runName?: string;
}

/**
 * BrowserEnv - Main browser environment class
 * 
 * This is a placeholder - full implementation coming in Phase 3
 */
export class BrowserEnv {
    private _config: BrowserEnvConfig;

    constructor(config: BrowserEnvConfig) {
        this._config = config;
    }

    // Getter for config (will be used in Phase 3)
    protected get config(): BrowserEnvConfig {
        return this._config;
    }

    async reset(_task: Task): Promise<Observation> {
        // TODO: Implement browser environment reset in Phase 3
        throw new Error('BrowserEnv not yet implemented - coming in Phase 3');
    }

    async step(_action: string): Promise<[Observation, number, boolean, boolean, Record<string, any>]> {
        // TODO: Implement step function in Phase 3
        throw new Error('BrowserEnv not yet implemented - coming in Phase 3');
    }

    async close(): Promise<void> {
        // TODO: Implement cleanup in Phase 3
    }
}
