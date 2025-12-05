#!/usr/bin/env node
/**
 * Hackable Agent - Advanced, feature-rich agent implementation
 *
 * This is our recommended agent for most use cases. It's designed to be
 * easy to modify and extend with extensive configuration options.
 *
 * Features:
 * - Detailed observation preprocessing
 * - Support for different model backends (OpenAI, Anthropic, OpenRouter)
 * - Configurable observation modes (AXTree, HTML, Screenshot)
 * - Command-line argument support
 * - Leaderboard submission support
 *
 * Usage:
 *   npm install
 *   export OPENAI_API_KEY="your-api-key"
 *   npx tsx example/hackable.ts
 *
 *   # With custom parameters:
 *   npx tsx example/hackable.ts \
 *     --model gpt-4o \
 *     --task v2.omnizon-1 \
 *     --headless false \
 *     --use-html true \
 *     --use-axtree true \
 *     --use-screenshot true \
 *     --leaderboard true \
 *     --run-id your-run-id
 */

import { REAL } from '@theagicompany/agisdk';
import type { Observation } from '@theagicompany/agisdk';

/**
 * Parse command-line arguments
 */
interface HackableConfig {
    model: string;
    taskName: string;
    taskVersion: string;
    headless: boolean;
    maxSteps: number;
    useHtml: boolean;
    useAxtree: boolean;
    useScreenshot: boolean;
    leaderboard: boolean;
    runId?: string;
    apiKey?: string;
    modelName?: string;
    runName?: string;
}

function parseArgs(): HackableConfig {
    const args = process.argv.slice(2);

    const getArg = (name: string, defaultValue: string): string => {
        const index = args.indexOf(`--${name}`);
        return index !== -1 && index + 1 < args.length ? args[index + 1]! : defaultValue;
    };

    const getBoolArg = (name: string, defaultValue: boolean): boolean => {
        const value = getArg(name, defaultValue.toString());
        return value.toLowerCase() === 'true';
    };

    return {
        model: getArg('model', 'gpt-4o'),
        taskName: getArg('task', 'v2.omnizon-1'),
        taskVersion: getArg('task-version', 'v2'),
        headless: getBoolArg('headless', true),
        maxSteps: parseInt(getArg('max-steps', '25')),
        useHtml: getBoolArg('use-html', false),
        useAxtree: getBoolArg('use-axtree', true),
        useScreenshot: getBoolArg('use-screenshot', true),
        leaderboard: getBoolArg('leaderboard', false),
        runId: getArg('run-id', process.env.REAL_RUN_ID || ''),
        apiKey: getArg('api-key', process.env.REAL_API_KEY || ''),
        modelName: getArg('model-name', process.env.REAL_MODEL_NAME || ''),
        runName: getArg('run-name', process.env.REAL_RUN_NAME || ''),
    };
}

/**
 * Main execution function
 */
async function main() {
    const config = parseArgs();

    console.log('🚀 Starting Hackable Agent');
    console.log('');
    console.log('Configuration:');
    console.log(`  Model: ${config.model}`);
    console.log(`  Task: ${config.taskName}`);
    console.log(`  Headless: ${config.headless}`);
    console.log(`  Max Steps: ${config.maxSteps}`);
    console.log(`  Use HTML: ${config.useHtml}`);
    console.log(`  Use AXTree: ${config.useAxtree}`);
    console.log(`  Use Screenshot: ${config.useScreenshot}`);
    console.log(`  Leaderboard: ${config.leaderboard}`);
    if (config.leaderboard) {
        console.log(`  Run ID: ${config.runId || '(not set)'}`);
    }
    console.log('');

    // Validate leaderboard configuration
    if (config.leaderboard) {
        if (!config.runId || !config.apiKey) {
            console.error('❌ Error: Leaderboard submission requires --run-id and --api-key');
            console.error('   Or set environment variables: REAL_RUN_ID and REAL_API_KEY');
            process.exit(1);
        }
    }

    // Create agent
    const agent = new REAL.DemoAgent({
        modelName: config.model,
        useHtml: config.useHtml,
        useAxtree: config.useAxtree,
        useScreenshot: config.useScreenshot,
    });

    // Create harness
    const harnessConfig: any = {
        agent,
        taskName: config.taskName,
        taskVersion: config.taskVersion,
        headless: config.headless,
        maxSteps: config.maxSteps,
        useHtml: config.useHtml,
        useAxtree: config.useAxtree,
        useScreenshot: config.useScreenshot,
    };

    // Add leaderboard configuration if enabled
    if (config.leaderboard) {
        harnessConfig.leaderboard = true;
        harnessConfig.runId = config.runId;
        harnessConfig.apiKey = config.apiKey;
        if (config.modelName) {
            harnessConfig.modelName = config.modelName;
        }
        if (config.runName) {
            harnessConfig.runName = config.runName;
        }
    }

    const harness = new REAL.Harness(harnessConfig);

    // Run tasks
    console.log('Running task...\n');
    const startTime = Date.now();

    try {
        const results = await harness.run();

        const elapsedTime = (Date.now() - startTime) / 1000;

        // Display results
        console.log('\n' + '='.repeat(60));
        console.log('Results Summary:');
        console.log('='.repeat(60));

        let successCount = 0;
        let totalTasks = 0;

        for (const [task, result] of Object.entries(results)) {
            const success = result.cum_reward === 1;
            if (success) successCount++;
            totalTasks++;

            console.log(`\n${success ? '✅ SUCCESS' : '❌ FAILURE'}: ${task}`);
            console.log(`  Time: ${result.elapsed_time.toFixed(2)}s`);
            console.log(`  Reward: ${result.cum_reward}`);
            console.log(`  Steps: ${result.n_steps || 'N/A'}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log(`Total: ${successCount}/${totalTasks} tasks successful`);
        console.log(`Total Time: ${elapsedTime.toFixed(2)}s`);
        console.log('='.repeat(60));

        if (config.leaderboard) {
            console.log('\n✅ Results submitted to leaderboard!');
            console.log(`   View at: https://www.realevals.ai/runs/${config.runId}`);
        }

        // Exit with appropriate code
        process.exit(successCount === totalTasks ? 0 : 1);
    } catch (error) {
        console.error('\n❌ Error running tasks:');
        console.error(error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
