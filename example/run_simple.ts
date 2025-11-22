#!/usr/bin/env node
/**
 * Simple Task Runner - Test multiple tasks with an agent
 *
 * This example demonstrates how to run multiple tasks in sequence with
 * the same agent configuration. Useful for benchmarking and testing.
 *
 * Usage:
 *   export OPENAI_API_KEY="your-key"
 *   npx tsx example/run_simple.ts
 *
 *   # With custom model:
 *   npx tsx example/run_simple.ts --model gpt-4o
 */

import { REAL } from '@agi-inc/agisdk';

// Parse command-line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string): string => {
    const index = args.indexOf(`--${name}`);
    return index !== -1 && index + 1 < args.length ? args[index + 1]! : defaultValue;
};

const MODEL = getArg('model', 'gpt-4o');
const HEADLESS = getArg('headless', 'false') === 'true';

// Define the tasks you want to test
// 2 random tasks from each category (except flyunified and gocalendar)
const tasks = [
    'v2.dashdish-3',
    'v2.dashdish-10',
    'v2.gomail-2',
    'v2.gomail-4',
    'v2.marrisuite-3',
    'v2.marrisuite-12',
    'v2.networkin-11',
    'v2.networkin-17',
    'v2.omnizon-4',
    'v2.omnizon-10',
    'v2.opendining-7',
    'v2.opendining-11',
    'v2.staynb-4',
    'v2.staynb-7',
    'v2.topwork-3',
    'v2.topwork-4',
    'v2.udriver-10',
    'v2.udriver-3',
    'v2.zilloft-14',
    'v2.zilloft-3',
];

console.log('🚀 Running Multiple Tasks Example');
console.log('');
console.log(`Model: ${MODEL}`);
console.log(`Tasks: ${tasks.length}`);
console.log(`Headless: ${HEADLESS}`);
console.log('');

// Track overall stats
let totalSuccess = 0;
let totalFailure = 0;
let totalTime = 0;

// Run each task
for (const taskName of tasks) {
    console.log('='.repeat(60));
    console.log(`🚀 Running task: ${taskName}`);
    console.log('='.repeat(60));

    try {
        // Create agent for this task
        const agent = new REAL.DemoAgent({
            modelName: MODEL,
            useAxtree: true,
            useScreenshot: true,
            useHtml: false,
        });

        // Create harness for this task
        const harness = new REAL.Harness({
            agent,
            taskName,
            headless: HEADLESS,
            maxSteps: 25,
            useCache: false,
        });

        // Run and capture results
        const results = await harness.run();

        // Display results
        for (const [task, result] of Object.entries(results)) {
            const success = result.cum_reward === 1;
            const time = result.elapsed_time;

            if (success) {
                totalSuccess++;
                console.log(`\n✅ SUCCESS: ${task}`);
            } else {
                totalFailure++;
                console.log(`\n❌ FAILURE: ${task}`);
            }
            console.log(`  Time: ${time.toFixed(2)}s`);
            console.log(`  Reward: ${result.cum_reward}`);

            totalTime += time;
        }
    } catch (error) {
        console.error(`\n❌ ERROR running ${taskName}:`, error);
        totalFailure++;
    }

    console.log('');
}

// Display final summary
console.log('='.repeat(60));
console.log('Final Summary:');
console.log('='.repeat(60));
console.log(`Total Tasks: ${tasks.length}`);
console.log(`Successes: ${totalSuccess} (${((totalSuccess / tasks.length) * 100).toFixed(1)}%)`);
console.log(`Failures: ${totalFailure} (${((totalFailure / tasks.length) * 100).toFixed(1)}%)`);
console.log(`Total Time: ${totalTime.toFixed(2)}s`);
console.log(`Average Time: ${(totalTime / tasks.length).toFixed(2)}s per task`);
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(totalFailure === 0 ? 0 : 1);
