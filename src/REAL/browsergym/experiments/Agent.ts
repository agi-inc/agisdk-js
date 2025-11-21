/**
 * Abstract agent interface
 */

import type { Agent, Observation } from '../../types.js';

/**
 * Abstract base class for all agents
 * 
 * Implement this class to create custom agents.
 * The DemoAgent class provides a reference implementation.
 */
export abstract class AbstractAgent implements Agent {
    /**
     * Optional preprocessing of observations
     */
    obsPreprocessor?(obs: Observation): Observation | Promise<Observation>;

    /**
     * Get the next action based on the current observation
     */
    abstract getAction(obs: Observation): string | Promise<string>;

    /**
     * Optional cleanup when agent is done
     */
    close?(): void | Promise<void>;
}
