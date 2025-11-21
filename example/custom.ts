import { REAL } from '../src/index.js';

/**
 * Custom agent: minimal scaffolding to build your own agent on.
 * It doesn't do anything right now! If you use this, you're starting from scratch!
 */
class MyCustomAgent implements REAL.Agent {
    private steps = 0;

    async getAction(obs: REAL.Obs): Promise<string> {
        /**
         * Core agent logic - analyze observation and decide on action.
         * 
         * Returns:
         *   - Action string (e.g., "click('123')")
         *   - To end episode, return "report_infeasible('reason')"
         */
        this.steps++;

        // Example of simple decision making based on URL
        const url = obs.url;
        console.log(`Step ${this.steps}: Current URL is ${url}`);

        // TODO: Implement your agent logic here!
        // You have access to:
        // - obs.url: current page URL
        // - obs.dom_object: DOM structure
        // - obs.axtree_object: accessibility tree
        // - obs.screenshot: page screenshot (Buffer)
        // - obs.chat_messages: conversation history
        // - obs.goal: task goal text

        // For now, just send a message and end
        if (this.steps >= 5) {
            return "report_infeasible('Demo completed')";
        }

        return "send_msg_to_user('Working on it...')";
    }
}

/**
 * Example creating and using a custom agent
 */
async function runCustomAgent() {
    // Create agent
    const agent = new MyCustomAgent();

    // Create harness with custom agent
    const harness = new REAL.Harness(
        agent,
        false,  // headless = false (show browser)
    );

    // Run a task
    const results = await harness.run("omnizon-3");
    
    console.log("\nResults:", results);
    return results;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCustomAgent().catch(console.error);
}

