/**
 * Test multiple tasks sequentially
 * 
 * Usage:
 *   export OPENAI_API_KEY="your-key"  # If using LLM-based agent
 *   npx ts-node example/simple.ts
 */

import { REAL } from '../src/index.js';

// Simple demo agent
class SimpleAgent implements REAL.Agent {
    private step = 0;

    async getAction(obs: REAL.Obs): Promise<string> {
        this.step++;
        console.log(`Observed URL: ${obs.url}`);
        
        // Simple hardcoded behavior for demo
        if (this.step === 1) {
            return "send_msg_to_user('Starting task!')";
        }
        
        if (this.step < 5) {
            return "scroll(0, 500)";
        }

        return "report_infeasible('Finished demo')";
    }
}

// Define the tasks you want to test
const tasks = [
    "omnizon-3",
    "dashdish-1",
    // Add more tasks as needed
];

async function main() {
    const agent = new SimpleAgent();
    
    // Run each task
    for (const taskName of tasks) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 Running task: ${taskName}`);
        console.log(`${'='.repeat(60)}`);

        // Create harness for this task
        const harness = new REAL.Harness(
            agent,
            false,  // headless = false (show browser)
        );

        // Run and print results
        const results = await harness.run(taskName);

        // Display results
        for (const [task, result] of Object.entries(results)) {
            const success = (result as any).success || false;
            const steps = (result as any).steps || 0;
            console.log(`\n${success ? '✅ SUCCESS' : '❌ FAILURE'}: ${task}`);
            console.log(`Steps: ${steps}`);
        }
    }
}

main().catch(console.error);

