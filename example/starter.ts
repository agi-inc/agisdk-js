import { REAL } from '../src/index.js';

class DemoAgent implements REAL.Agent {
    step = 0;

    async getAction(obs: REAL.Obs): Promise<string> {
        console.log(`Observed URL: ${obs.url}`);
        this.step++;
        
        // Simple hardcoded behavior for demo
        if (this.step === 1) {
             // Try to search
             // In a real agent, we'd look for the search box bid in obs.dom_object
             // For now, let's assume a bid or just wait
             return "send_msg_to_user('Starting task!')";
        }
        
        if (this.step < 5) {
            return "scroll(0, 500)";
        }

        return "report_infeasible('Finished demo')";
    }
}

async function main() {
    const agent = new DemoAgent();
    // Point to the python tasks directory
    const taskDir = process.env.TASK_DIR; 
    
    const harness = new REAL.Harness(agent, false, taskDir);
    
    console.log("Starting harness...");
    // Find a task to run
    // We can try running 'omnizon-3' if available
    await harness.run("omnizon-3");
}

main();

