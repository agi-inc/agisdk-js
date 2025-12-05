#!/usr/bin/env node
/**
 * Starter Example - Simplest agent implementation
 *
 * This is the most basic way to use the AGI SDK with the built-in DemoAgent.
 * Perfect for getting started quickly with any model.
 *
 * Usage:
 *   npm install
 *   export OPENAI_API_KEY="your-api-key"    # or ANTHROPIC_API_KEY
 *   npx tsx example/starter.ts
 *
 *   # With custom options:
 *   npx tsx example/starter.ts --model gpt-4o --task v2.omnizon-1 --headless false
 */

import { REAL } from '@theagicompany/agisdk';

// Parse command-line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue?: string): string | undefined => {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : defaultValue;
};
const getBoolArg = (name: string, defaultValue: boolean): boolean => {
    const value = getArg(name);
    return value ? value.toLowerCase() === 'true' : defaultValue;
};

// Configuration
const model = getArg('model', 'gpt-4o');
const taskName = getArg('task', 'v2.omnizon-1');
const headless = getBoolArg('headless', true);

console.log('🚀 Starting AGI SDK Example');
console.log(`Model: ${model}`);
console.log(`Task: ${taskName}`);
console.log(`Headless: ${headless}`);
console.log('');

// Create agent
const agent = new REAL.DemoAgent({
    modelName: model,
    useAxtree: true,
    useScreenshot: true,
    useHtml: false,
});

// Create harness
const harness = new REAL.Harness({
    agent,
    taskName,
    headless,
    maxSteps: 25,
});

// Run tasks
console.log('Running task...\n');
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
