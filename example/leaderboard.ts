#!/usr/bin/env node
/**
 * Leaderboard Example - Submit results to the REAL leaderboard
 *
 * This example demonstrates how to submit agent results to the REAL benchmark
 * leaderboard at https://www.realevals.ai
 *
 * Steps to submit to leaderboard:
 * 1. Create an API key in the portal (Profile → API Keys)
 * 2. Get a run ID:
 *    - From portal UI: Profile → Create Run, copy the run_id
 *    - Or via API:
 *      curl "https://www.realevals.ai/api/runKey?api_key=<API_KEY>&model_name=<MODEL>&run_name=<RUN>"
 * 3. Set environment variables or pass via command-line
 * 4. Run this script
 *
 * Usage:
 *   # Set environment variables
 *   export REAL_API_KEY="your-api-key"
 *   export REAL_RUN_ID="your-run-id"
 *   export REAL_MODEL_NAME="gpt-4o"
 *   export REAL_RUN_NAME="my-test-run"
 *   export OPENAI_API_KEY="your-openai-key"
 *
 *   npx tsx example/leaderboard.ts
 *
 *   # Or pass via command-line:
 *   npx tsx example/leaderboard.ts \
 *     --api-key "your-api-key" \
 *     --run-id "your-run-id" \
 *     --model-name "gpt-4o" \
 *     --run-name "my-test-run"
 */

import { REAL } from '@agi-inc/agisdk';

// Get configuration from environment or command-line
const args = process.argv.slice(2);
const getArg = (name: string, envVar: string, placeholder: string): string => {
    const index = args.indexOf(`--${name}`);
    const cliValue = index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
    return cliValue || process.env[envVar] || placeholder;
};

const API_KEY = getArg('api-key', 'REAL_API_KEY', '<Your API key>');
const RUN_ID = getArg('run-id', 'REAL_RUN_ID', '<Your run ID>');
const MODEL_NAME = getArg('model-name', 'REAL_MODEL_NAME', 'gpt-4o');
const RUN_NAME = getArg('run-name', 'REAL_RUN_NAME', 'test-run');

// Model for the agent (can be different from MODEL_NAME which is for leaderboard display)
const AGENT_MODEL = getArg('model', 'OPENAI_MODEL', 'gpt-4o');

// Task to run
const TASK_NAME = getArg('task', 'TASK_NAME', 'v2.omnizon-2');

// Check if we should submit to leaderboard
const submitToLeaderboard =
    API_KEY !== '' &&
    API_KEY !== '<Your API key>' &&
    RUN_ID !== '' &&
    RUN_ID !== '<Your run ID>';

if (!submitToLeaderboard) {
    console.log('⚠️  Warning: Leaderboard submission is disabled');
    console.log('   Set REAL_API_KEY and REAL_RUN_ID environment variables to enable');
    console.log('   Or pass --api-key and --run-id command-line arguments');
    console.log('');
    console.log('   Running in local mode...\n');
}

console.log('🚀 REAL Leaderboard Submission Example');
console.log('');
console.log('Configuration:');
console.log(`  Agent Model: ${AGENT_MODEL}`);
console.log(`  Task: ${TASK_NAME}`);
console.log(`  Leaderboard: ${submitToLeaderboard ? 'Enabled' : 'Disabled'}`);
if (submitToLeaderboard) {
    console.log(`  Model Name: ${MODEL_NAME}`);
    console.log(`  Run Name: ${RUN_NAME}`);
    console.log(`  Run ID: ${RUN_ID}`);
}
console.log('');

// Create agent
const agent = new REAL.DemoAgent({
    modelName: AGENT_MODEL,
    useAxtree: true,
    useScreenshot: true,
    useHtml: false,
});

// Create harness
const harnessConfig: any = {
    agent,
    taskName: TASK_NAME,
    taskVersion: 'v2',
    headless: false,
    maxSteps: 25,
    forceRefresh: true,
    useCache: false,
};

// Add leaderboard configuration if enabled
if (submitToLeaderboard) {
    harnessConfig.leaderboard = true;
    harnessConfig.runId = RUN_ID;
    harnessConfig.apiKey = API_KEY;
    harnessConfig.modelName = MODEL_NAME;
    harnessConfig.runName = RUN_NAME;
}

const harness = new REAL.Harness(harnessConfig);

// Run tasks
console.log('Running task...\n');

try {
    const results = await harness.run();

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('Results:');
    console.log('='.repeat(60));

    for (const [task, result] of Object.entries(results)) {
        const success = result.cum_reward === 1;
        console.log(`\n${success ? '✅ SUCCESS' : '❌ FAILURE'}: ${task}`);
        console.log(`  Time: ${result.elapsed_time.toFixed(2)}s`);
        console.log(`  Reward: ${result.cum_reward}`);
    }

    if (submitToLeaderboard) {
        console.log('\n' + '='.repeat(60));
        console.log('✅ Results submitted to leaderboard!');
        console.log(`   View at: https://www.realevals.ai/runs/${RUN_ID}`);
        console.log('='.repeat(60));
    }
} catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
}
