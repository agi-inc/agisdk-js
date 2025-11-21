/**
 * Leaderboard submission example
 * 
 * Usage:
 *   export REAL_API_KEY="your-api-key"
 *   export REAL_RUN_ID="your-run-id"
 *   npx ts-node example/leaderboard.ts
 */

import { REAL } from '../src/index.js';

// Optional leaderboard configuration.
// Set REAL_API_KEY / REAL_RUN_ID in your environment
// (or replace the placeholders below) to submit results to the REAL portal.
const API_KEY = process.env.REAL_API_KEY || "<Your API key>";
const RUN_ID = process.env.REAL_RUN_ID || "<Your run ID>";

const submitToLeaderboard = (
    API_KEY !== "" && 
    API_KEY !== "<Your API key>" &&
    RUN_ID !== "" &&
    RUN_ID !== "<Your run ID>"
);

// Simple demo agent
class LeaderboardAgent implements REAL.Agent {
    private step = 0;

    async getAction(obs: REAL.Obs): Promise<string> {
        this.step++;
        
        if (this.step === 1) {
            return "send_msg_to_user('Starting leaderboard submission!')";
        }
        
        if (this.step < 10) {
            return "scroll(0, 300)";
        }

        return "report_infeasible('Task completed')";
    }
}

async function main() {
    if (!submitToLeaderboard) {
        console.warn("⚠️  Leaderboard submission disabled. Set REAL_API_KEY and REAL_RUN_ID to enable.");
        console.warn("   Running in local-only mode...\n");
    }

    const agent = new LeaderboardAgent();
    
    // Note: Leaderboard submission is not yet fully implemented in JS SDK
    // This example shows the structure for when it's added
    const harness = new REAL.Harness(
        agent,
        false,  // headless = false
    );

    console.log("Running task: omnizon-3");
    const results = await harness.run("omnizon-3");
    
    console.log("\nResults:", results);
    
    if (submitToLeaderboard) {
        console.log("\n📊 Results would be submitted to leaderboard with:");
        console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
        console.log(`   Run ID: ${RUN_ID}`);
    }
}

main().catch(console.error);

