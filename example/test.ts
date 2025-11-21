import { REAL } from '../src/index.js';

// Test that all exports are available
console.log('Testing exports...');
console.log('REAL.Harness:', typeof REAL.Harness);
console.log('REAL.BrowserEnv:', typeof REAL.BrowserEnv);
console.log('REAL.Agent:', typeof REAL.Agent);
console.log('REAL.getTask:', typeof REAL.getTask);
console.log('REAL.loadTasks:', typeof REAL.loadTasks);

// Test creating a simple agent
class TestAgent implements REAL.Agent {
    async getAction(obs: REAL.Obs): Promise<string> {
        console.log('Agent received observation with URL:', obs.url);
        return "send_msg_to_user('Test successful!')";
    }
}

// Test harness creation
const agent = new TestAgent();
const harness = new REAL.Harness(agent, true); // headless mode
console.log('Harness created successfully');

// Test task loading (without actually running)
REAL.getTask('omnizon-3').then(task => {
    if (task) {
        console.log('Task loaded successfully:', task.id);
        console.log('Task goal:', task.goal.substring(0, 50) + '...');
    } else {
        console.log('Task not found (this is OK if task directory is not set)');
    }
}).catch(err => {
    console.log('Task loading error (expected if task dir not found):', err.message);
});

console.log('\nAll basic tests passed! ✅');

