/**
 * Harness - Main orchestrator for running tasks with agents
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import type { Agent, TaskResult, HarnessConfig } from './types.js';
import { BrowserEnv, BrowserEnvConfig } from './browsergym/core/BrowserEnv.js';
import { WebCloneTask } from './browsergym/webclones/WebCloneTask.js';
import { TaskConfig, splitTaskReference } from './browsergym/webclones/TaskConfig.js';
import { getAllTasks, getCanonicalTaskId } from './browsergym/webclones/utils.js';
import { logger } from './logging.js';
import { DemoAgent, DemoAgentConfig } from './demo_agent/DemoAgent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Harness - Main orchestrator class
 */
export class Harness {
    private config: Required<HarnessConfig>;
    private agent: Agent;
    private resultsDir: string;

    constructor(config: HarnessConfig) {
        // Validate config
        if (!config.agent) {
            throw new Error('Agent must be provided');
        }

        this.agent = config.agent;
        this.resultsDir = config.resultsDir || './results';

        // Set defaults
        this.config = {
            agent: config.agent,
            taskName: config.taskName,
            taskType: config.taskType,
            taskId: config.taskId,
            taskVersion: config.taskVersion || 'v2',
            headless: config.headless ?? true,
            maxSteps: config.maxSteps || 25,
            useHtml: config.useHtml ?? false,
            useAxtree: config.useAxtree ?? true,
            useScreenshot: config.useScreenshot ?? true,
            browserDimensions: config.browserDimensions || [1280, 720],
            viewport: config.viewport || { width: 1280, height: 720 },
            resultsDir: this.resultsDir,
            numWorkers: config.numWorkers || 1,
            useCache: config.useCache ?? true,
            cacheOnly: config.cacheOnly ?? false,
            forceRefresh: config.forceRefresh ?? false,
            sampleTasks: config.sampleTasks || 1,
            leaderboard: config.leaderboard ?? false,
            runId: config.runId,
            apiKey: config.apiKey,
            runName: config.runName,
            modelIdName: config.modelIdName,
        };

        // Ensure results directory exists
        fs.ensureDirSync(this.resultsDir);
    }

    /**
     * Run tasks with the configured agent
     */
    async run(tasks?: string[]): Promise<Record<string, TaskResult>> {
        // Determine which tasks to run
        let tasksToRun: string[] = [];
        if (tasks) {
            tasksToRun = tasks.map(t => this.canonicalizeTaskName(t));
        } else if (this.config.taskName) {
            tasksToRun = [this.config.taskName];
        } else {
            tasksToRun = this.getTasks(
                this.config.taskType,
                this.config.taskId,
                this.config.taskVersion
            );
        }

        if (tasksToRun.length === 0) {
            throw new Error('No tasks found to run');
        }

        logger.info(`Running ${tasksToRun.length} tasks`);

        // Run tasks
        const results = await this.runTasks(tasksToRun);

        // Format and display results
        this.formatResults(results);

        return results;
    }

    /**
     * Get tasks based on filtering criteria
     */
    private getTasks(
        taskType?: string,
        taskId?: number,
        taskVersion?: string
    ): string[] {
        const version = taskVersion || this.config.taskVersion || 'v2';
        const allTasks = getAllTasks(version);

        let filtered = allTasks;

        if (taskType) {
            filtered = filtered.filter(name => name.startsWith(`${taskType}-`));
        }

        if (taskType && taskId !== undefined) {
            const specificTask = `${taskType}-${taskId}`;
            if (filtered.includes(specificTask)) {
                const canonical = getCanonicalTaskId(version, specificTask);
                return Array(this.config.sampleTasks).fill(canonical);
            }
            throw new Error(`Task ${specificTask} not found in version ${version}`);
        }

        return filtered.map(name => getCanonicalTaskId(version, name));
    }

    /**
     * Canonicalize task name
     */
    private canonicalizeTaskName(taskName: string): string {
        let cleaned = taskName.trim();
        if (!cleaned) {
            throw new Error('Task name cannot be empty');
        }

        // Remove prefixes
        if (cleaned.startsWith('webclones.')) {
            cleaned = cleaned.split('.', 2)[1]!;
        }
        if (cleaned.startsWith('browsergym/')) {
            cleaned = cleaned.split('/', 2)[1]!;
        }

        // Check if already canonical
        if (cleaned.includes('.')) {
            const [version, name] = cleaned.split('.', 2);
            return `${version}.${name}`;
        }

        // Use default version
        const version = this.config.taskVersion || 'v2';
        return `${version}.${cleaned}`;
    }

    /**
     * Run tasks (with optional parallelization)
     */
    private async runTasks(tasks: string[]): Promise<Record<string, TaskResult>> {
        const results: Record<string, TaskResult> = {};

        if (this.config.numWorkers > 1) {
            // Parallel execution using worker threads
            logger.info(`Using ${this.config.numWorkers} workers for parallel execution`);
            const workerResults = await this.runTasksParallel(tasks);
            Object.assign(results, workerResults);
        } else {
            // Sequential execution
            for (const taskName of tasks) {
                const result = await this.runSingleTask(taskName);
                results[taskName] = result;
            }
        }

        return results;
    }

    /**
     * Run a single task
     */
    private async runSingleTask(taskName: string): Promise<TaskResult> {
        // Check cache
        if (this.config.useCache && !this.config.forceRefresh) {
            const cached = this.findCachedResult(taskName);
            if (cached) {
                logger.info(`Using cached result for ${taskName}`);
                return cached;
            }
        }

        if (this.config.cacheOnly) {
            throw new Error(`No cached result found for ${taskName} and cacheOnly is enabled`);
        }

        logger.info(`Running task: ${taskName}`);

        // Parse task reference
        const [version, name] = splitTaskReference(taskName);
        const taskConfig = new TaskConfig(version, name);

        // Create task instance
        const task = new WebCloneTask(taskConfig, {
            runId: this.config.runId,
        });

        // Create environment
        const envConfig: BrowserEnvConfig = {
            taskName: taskName,
            taskVersion: version,
            headless: this.config.headless,
            maxSteps: this.config.maxSteps,
            viewport: this.config.viewport,
            useHtml: this.config.useHtml,
            useAxtree: this.config.useAxtree,
            useScreenshot: this.config.useScreenshot,
        };

        const env = new BrowserEnv(envConfig);

        try {
            // Reset environment
            let obs = await env.reset(task);

            // Run agent loop
            let stepCount = 0;
            let cumReward = 0;
            let terminated = false;
            let truncated = false;
            let errMsg: string | undefined = undefined;
            let stackTrace: string | undefined = undefined;

            while (!terminated && !truncated && stepCount < this.config.maxSteps) {
                try {
                    // Get action from agent
                    const action = await this.agent.getAction(obs);

                    // Execute action
                    const [newObs, reward, term, trunc] = await env.step(action);

                    // Update state
                    obs = newObs;
                    cumReward = reward;
                    terminated = term;
                    truncated = trunc;
                    stepCount++;

                    // Check if task is done
                    if (terminated || truncated) {
                        break;
                    }
                } catch (error) {
                    errMsg = error instanceof Error ? error.message : String(error);
                    stackTrace = error instanceof Error ? error.stack : undefined;
                    logger.error(`Error during step ${stepCount}: ${errMsg}`);
                    break;
                }
            }

            // Create result
            const result: TaskResult = {
                cum_reward: cumReward,
                elapsed_time: obs.elapsed_time,
                exp_dir: this.resultsDir,
                num_steps: stepCount,
                success: cumReward === 1,
                ...(errMsg ? { err_msg: errMsg } : {}),
                ...(stackTrace ? { stack_trace: stackTrace } : {}),
            };

            // Save result to cache
            if (this.config.useCache) {
                await this.saveResult(taskName, result);
            }

            return result;
        } finally {
            // Cleanup
            await env.close();
            if (this.agent.close) {
                await this.agent.close();
            }
        }
    }

    /**
     * Run tasks in parallel using worker threads
     */
    private async runTasksParallel(tasks: string[]): Promise<Record<string, TaskResult>> {
        // For now, implement sequential execution
        // Full worker thread implementation would require more setup
        logger.warning('Parallel execution not yet fully implemented, falling back to sequential');
        const results: Record<string, TaskResult> = {};
        for (const task of tasks) {
            results[task] = await this.runSingleTask(task);
        }
        return results;
    }

    /**
     * Find cached result for a task
     */
    private findCachedResult(taskName: string): TaskResult | null {
        const cacheFile = path.join(this.resultsDir, `${taskName}.json`);
        if (fs.existsSync(cacheFile)) {
            try {
                const data = fs.readJsonSync(cacheFile);
                return data as TaskResult;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Save result to cache
     */
    private async saveResult(taskName: string, result: TaskResult): Promise<void> {
        const cacheFile = path.join(this.resultsDir, `${taskName}.json`);
        await fs.writeJson(cacheFile, result, { spaces: 2 });
    }

    /**
     * Format and display results
     */
    private formatResults(results: Record<string, TaskResult>): void {
        if (Object.keys(results).length === 0) {
            logger.warning('No results to display');
            return;
        }

        // Calculate statistics
        const successCount = Object.values(results).filter(r => r.success).length;
        const successRate = (successCount / Object.keys(results).length) * 100;

        const allTimes = Object.values(results).map(r => r.elapsed_time);
        const successfulTimes = Object.values(results)
            .filter(r => r.success)
            .map(r => r.elapsed_time);

        logger.success('BENCHMARK RESULTS');
        logger.info(`Tasks completed successfully: ${successCount}/${Object.keys(results).length}`);
        logger.info(`Success rate: ${successRate.toFixed(2)}%`);

        if (allTimes.length > 0) {
            const avgTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
            const minTime = Math.min(...allTimes);
            const maxTime = Math.max(...allTimes);
            logger.info(`Average time: ${avgTime.toFixed(2)} seconds`);
            logger.info(`Min time: ${minTime.toFixed(2)} seconds`);
            logger.info(`Max time: ${maxTime.toFixed(2)} seconds`);
        }

        if (successfulTimes.length > 0) {
            const avgSuccessTime =
                successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length;
            logger.info(`Average time (successful): ${avgSuccessTime.toFixed(2)} seconds`);
        }
    }
}

/**
 * Create a Harness instance with DemoAgent
 */
export function createHarness(config: {
    modelName: string;
    taskName?: string;
    taskType?: string;
    taskId?: number;
    taskVersion?: string;
    headless?: boolean;
    maxSteps?: number;
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    resultsDir?: string;
    numWorkers?: number;
    useCache?: boolean;
    cacheOnly?: boolean;
    forceRefresh?: boolean;
    sampleTasks?: number;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    openrouterApiKey?: string;
}): Harness {
    const agentConfig: DemoAgentConfig = {
        modelName: config.modelName,
        ...(config.useHtml !== undefined ? { useHtml: config.useHtml } : {}),
        ...(config.useAxtree !== undefined ? { useAxtree: config.useAxtree } : {}),
        ...(config.useScreenshot !== undefined ? { useScreenshot: config.useScreenshot } : {}),
        ...(config.openaiApiKey ? { openaiApiKey: config.openaiApiKey } : {}),
        ...(config.anthropicApiKey ? { anthropicApiKey: config.anthropicApiKey } : {}),
        ...(config.openrouterApiKey ? { openrouterApiKey: config.openrouterApiKey } : {}),
    };

    const agent = new DemoAgent(agentConfig);

    const harnessConfig: HarnessConfig = {
        agent,
        ...(config.taskName ? { taskName: config.taskName } : {}),
        ...(config.taskType ? { taskType: config.taskType } : {}),
        ...(config.taskId !== undefined ? { taskId: config.taskId } : {}),
        ...(config.taskVersion ? { taskVersion: config.taskVersion } : {}),
        ...(config.headless !== undefined ? { headless: config.headless } : {}),
        ...(config.maxSteps !== undefined ? { maxSteps: config.maxSteps } : {}),
        ...(config.useHtml !== undefined ? { useHtml: config.useHtml } : {}),
        ...(config.useAxtree !== undefined ? { useAxtree: config.useAxtree } : {}),
        ...(config.useScreenshot !== undefined ? { useScreenshot: config.useScreenshot } : {}),
        ...(config.resultsDir ? { resultsDir: config.resultsDir } : {}),
        ...(config.numWorkers !== undefined ? { numWorkers: config.numWorkers } : {}),
        ...(config.useCache !== undefined ? { useCache: config.useCache } : {}),
        ...(config.cacheOnly !== undefined ? { cacheOnly: config.cacheOnly } : {}),
        ...(config.forceRefresh !== undefined ? { forceRefresh: config.forceRefresh } : {}),
        ...(config.sampleTasks !== undefined ? { sampleTasks: config.sampleTasks } : {}),
    };

    return new Harness(harnessConfig);
}
