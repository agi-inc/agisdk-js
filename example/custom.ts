#!/usr/bin/env node
/**
 * Custom Agent Example - Boilerplate for creating your own agent
 *
 * This example provides the minimal scaffolding needed to build your own agent.
 * It doesn't do anything right now - if you use this, you're starting from scratch!
 *
 * Usage:
 *   npm install
 *   npx tsx example/custom.ts
 */

import { REAL } from '@theagicompany/agisdk';
import type { Observation } from '@theagicompany/agisdk';

/**
 * MyCustomAgent - Your custom agent implementation
 *
 * Implement the getAction method to define your agent's behavior.
 */
class MyCustomAgent implements REAL.Agent {
    private steps: number = 0;

    /**
     * Core agent logic - analyze observation and decide on action
     *
     * @param obs - Current observation of the browser state
     * @returns The action to take, or null to end the episode
     */
    async getAgentAction(obs: Observation): Promise<{ action?: string; finalMessage?: string }> {
        this.steps++;

        // Example of simple decision making based on URL
        const url = obs.url || '';

        // TODO: Implement your agent logic here
        // You have access to:
        // - obs.url: Current page URL
        // - obs.axtree_object: Accessibility tree (if enabled)
        // - obs.dom_object: DOM tree (if enabled)
        // - obs.screenshot: Screenshot buffer (if enabled)
        // - obs.goal_object: Task goal
        // - obs.last_action_error: Any error from the last action

        // For now, just end after 1 step
        if (this.steps >= 1) {
            return { finalMessage: 'Custom agent ended - implement your logic here!' };
        }

        // Example action (you should implement real logic)
        return { action: "send_msg_to_user('Hello from custom agent!')" };
    }

    /**
     * Convert agent's high-level action to browsergym action
     * This method is required by the browsergym interface
     */
    async getAction(obs: Observation): Promise<string> {
        const { action, finalMessage } = await this.getAgentAction(obs);

        if (finalMessage) {
            // End the episode with a message
            return `send_msg_to_user("${finalMessage}")`;
        } else {
            // Continue with the specified action
            return action!;
        }
    }

    /**
     * Optional: Clean up resources when done
     */
    async close(): Promise<void> {
        console.log(`🎯 Custom agent completed ${this.steps} steps`);
    }
}

/**
 * Run the custom agent
 */
async function runCustomAgent() {
    console.log('🚀 Running Custom Agent Example\n');

    // Create harness with custom agent
    const harness = new REAL.Harness({
        agent: new MyCustomAgent(),
        taskName: 'v2.omnizon-1',
        headless: false,
        maxSteps: 10,
    });

    // Run the task
    const results = await harness.run();

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('Results:');
    console.log('='.repeat(60));
    for (const [task, result] of Object.entries(results)) {
        const success = result.cum_reward === 1;
        console.log(`\n${success ? '✅ SUCCESS' : '❌ FAILURE'}: ${task}`);
        console.log(`Time: ${result.elapsed_time.toFixed(2)}s`);
        console.log(`Reward: ${result.cum_reward}`);
    }

    return results;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCustomAgent().catch(console.error);
}

export { MyCustomAgent };
