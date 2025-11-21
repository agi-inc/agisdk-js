/**
 * DemoAgent - Built-in LLM-based agent
 * 
 * This will be implemented in Phase 5
 */

import type { Agent, Observation } from '../types.js';

export interface DemoAgentConfig {
    modelName: string;
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    systemMessageHandling?: 'separate' | 'combined';
    openaiApiKey?: string;
    anthropicApiKey?: string;
    openrouterApiKey?: string;
}

/**
 * DemoAgent - Built-in agent using LLM providers
 * 
 * Supports OpenAI, Anthropic, and OpenRouter models.
 * 
 * This is a placeholder - full implementation coming in Phase 5
 */
export class DemoAgent implements Agent {
    private _config: DemoAgentConfig;

    constructor(config: DemoAgentConfig) {
        this._config = config;
        // TODO: Initialize LLM clients in Phase 5
    }

    // Getter for config (will be used in Phase 5)
    protected get config(): DemoAgentConfig {
        return this._config;
    }

    async getAction(_obs: Observation): Promise<string> {
        // TODO: Implement LLM-based action generation in Phase 5
        throw new Error('DemoAgent not yet implemented - coming in Phase 5');
    }
}
