/**
 * WebCloneTask - Base class for web clone tasks
 */

import type { Page } from 'playwright';
import { AbstractBrowserTask } from '../core/Task.js';
import type { ChatMessage, GoalObject } from '../../types.js';
import { TaskConfig } from './TaskConfig.js';
import { splitTaskReference } from './TaskConfig.js';
import { logger } from '../../logging.js';

const DEFAULT_VERSION = 'v2';

export interface WebCloneTaskConfig {
    taskName?: string;
    taskVersion?: string;
    taskId?: string;
    runId?: string;
    apiKey?: string;
    modelIdName?: string;
    runName?: string;
    seed?: number;
}

/**
 * WebCloneTask - Base class for all web clone tasks
 */
export class WebCloneTask extends AbstractBrowserTask {
    protected taskConfig: TaskConfig;
    protected taskName: string;
    protected taskVersion: string;
    protected canonicalTaskId: string;
    protected runId: string;
    protected goal: string;
    protected url: string;
    protected page: Page | null = null;
    protected backgroundPage: Page | null = null;

    constructor(config: WebCloneTaskConfig) {
        super();
        
        let resolvedName: string;
        let resolvedVersion: string;

        // Resolve task name and version
        if (config.taskName && config.taskVersion) {
            resolvedName = config.taskName;
            resolvedVersion = config.taskVersion;
        } else if (config.taskId) {
            [resolvedVersion, resolvedName] = splitTaskReference(config.taskId);
        } else if (config.taskName) {
            resolvedName = config.taskName;
            resolvedVersion = config.taskVersion || DEFAULT_VERSION;
        } else {
            throw new Error('taskName and taskVersion are required');
        }

        // Load task configuration
        this.taskConfig = new TaskConfig(resolvedName, resolvedVersion);
        this.taskName = this.taskConfig.task_name;
        this.taskVersion = this.taskConfig.version;
        this.canonicalTaskId = this.taskConfig.canonical_id;

        // Resolve run_id
        const envRunId = process.env.RUNID;
        if (envRunId) {
            this.runId = envRunId;
            logger.info(`Using run_id from environment variable: ${this.runId}`);
        } else if (config.runId) {
            this.runId = config.runId;
            logger.info(`Using explicitly provided run_id: ${this.runId}`);
        } else {
            // TODO: Implement API-based run_id generation in Phase 6
            // For now, use default
            const taskConfig = this.taskConfig.task.config || {};
            this.runId = taskConfig.run_id || '0';
            logger.info(`Using run_id from task config or default: ${this.runId}`);
        }

        // Get goal and URL
        this.goal = this.taskConfig.getGoal();
        this.url = this.taskConfig.getStartUrl();

        if (!this.url) {
            const webcloneUrl = process.env.WEBCLONE_URL || process.env.WEBCLONES_URL;
            if (webcloneUrl) {
                this.url = webcloneUrl;
            } else {
                throw new Error(
                    'Provide a WebClones base URL or set it up as WEBCLONE_URL env var.'
                );
            }
        }

        logger.info(`⚙️ Initialized ${this.canonicalTaskId} task.`);
        logger.info(`🎯 Goal: ${this.goal}`);
    }

    /**
     * Setup the task on the given page
     */
    async setup(page: Page): Promise<[string | GoalObject[], Record<string, any>]> {
        this.page = page;
        
        // Create background page for configuration
        this.backgroundPage = await page.context().newPage();

        // Determine config task ID (v1 uses bare task ID for leaderboard)
        let configTaskId = this.canonicalTaskId;
        if (this.taskVersion === 'v1' && this.runId !== '0') {
            configTaskId = this.taskName;
        }

        // Configure task via background page
        const configUrl = `${this.url}/config?run_id=${this.runId}&task_id=${configTaskId}&latency=0`;
        await this.backgroundPage.goto(configUrl);
        await this.backgroundPage.waitForLoadState('networkidle');

        // Navigate to finish endpoint
        const finishUrl = `${this.url}/finish`;
        await this.backgroundPage.goto(finishUrl);

        // Bring main page to front and navigate to web clone
        await page.bringToFront();
        await page.goto(this.url);

        return [this.goal, {}];
    }

    /**
     * Cleanup task resources
     */
    async teardown(): Promise<void> {
        if (this.backgroundPage) {
            await this.backgroundPage.close();
            this.backgroundPage = null;
        }
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
    }

    /**
     * Validate if task is complete
     * 
     * TODO: Implement full evaluation logic in Phase 7
     */
    async validate(
        _page: Page,
        _chatMessages: ChatMessage[]
    ): Promise<[number, boolean, string, Record<string, any>]> {
        // Placeholder implementation - will be completed in Phase 7 with Evaluator
        // For now, return not done
        return [0.0, false, 'Evaluation not yet implemented', {}];
    }

    /**
     * Get goal string
     */
    getGoal(): string {
        return this.goal;
    }

    /**
     * Get task configuration
     */
    getTaskConfig(): TaskConfig {
        return this.taskConfig;
    }

    /**
     * Fetch finish JSON (environment state) from the finish endpoint
     */
    async getFinishJson(timeout: number = 1000): Promise<Record<string, any>> {
        if (!this.backgroundPage) {
            throw new Error('Background page not initialized. Call setup() first.');
        }

        let envStateJson: Record<string, any> = {};
        let errorMessage = '';

        try {
            // Navigate to finish endpoint
            await this.backgroundPage.goto(`${this.url}/finish`, { timeout });
            await this.backgroundPage.waitForLoadState('networkidle', { timeout });

            // Get state from <pre> element
            const preElement = await this.backgroundPage.waitForSelector('pre', { timeout });
            if (preElement) {
                const envState = await preElement.textContent();
                if (envState) {
                    try {
                        envStateJson = JSON.parse(envState);
                    } catch (e) {
                        errorMessage = `Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`;
                    }
                } else {
                    errorMessage = 'No state data available';
                }
            } else {
                errorMessage = 'No state data available';
            }
        } catch (e) {
            if (e instanceof Error && e.message.includes('timeout')) {
                errorMessage = 'Validation endpoint not yet available';
            } else {
                errorMessage = `Validation error: ${e instanceof Error ? e.message : String(e)}`;
            }
        }

        if (errorMessage) {
            throw new Error(errorMessage);
        }

        return envStateJson;
    }
}
