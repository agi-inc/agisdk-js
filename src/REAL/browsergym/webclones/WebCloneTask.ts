/**
 * WebCloneTask - Base class for web clone tasks
 */

import type { Page } from 'playwright';
import { AbstractBrowserTask } from '../core/Task.js';
import type { ChatMessage, GoalObject } from '../../types.js';
import { TaskConfig } from './TaskConfig.js';
import { splitTaskReference } from './TaskConfig.js';
import { logger } from '../../logging.js';
import { WebCloneEvaluator } from './Evaluate.js';
import { getRunIdFromApi, submitToRailway } from './utils.js';

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
    protected evaluator: WebCloneEvaluator;
    private apiKey: string | undefined;
    private modelIdName: string | undefined;
    private runName: string | undefined;

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

        // Store API config for potential run_id generation
        this.apiKey = config.apiKey;
        this.modelIdName = config.modelIdName;
        this.runName = config.runName;

        // Resolve run_id (async init handled separately)
        const envRunId = process.env.RUNID;
        if (envRunId) {
            this.runId = envRunId;
            logger.info(`Using run_id from environment variable: ${this.runId}`);
        } else if (config.runId) {
            this.runId = config.runId;
            logger.info(`Using explicitly provided run_id: ${this.runId}`);
        } else {
            // Use default for now, async init will update if API key provided
            const taskConfigData = this.taskConfig.task.config || {};
            this.runId = taskConfigData.run_id || '0';
            logger.info(`Using run_id from task config or default: ${this.runId}`);
        }

        // Initialize evaluator
        this.evaluator = new WebCloneEvaluator(this.taskConfig);

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
     * Initialize async resources like API-based run_id
     */
    async init(): Promise<void> {
        // Try to get run_id from API if we don't have one and credentials are provided
        if (this.runId === '0' && this.apiKey && this.modelIdName && this.runName) {
            logger.info(`Attempting to get run_id from API for model '${this.modelIdName}' and run '${this.runName}'`);
            const apiRunId = await getRunIdFromApi(this.apiKey, this.modelIdName, this.runName);
            if (apiRunId) {
                this.runId = apiRunId;
                // Also set the environment variable for other components
                process.env.RUNID = apiRunId;
                logger.info(`Successfully obtained run_id from API: ${this.runId}`);
            }
        }
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
     */
    async validate(
        _page: Page,
        chatMessages: ChatMessage[]
    ): Promise<[number, boolean, string, Record<string, any>]> {
        let reward = 0.0;
        let done = false;
        let message = '';
        const info: Record<string, any> = {};

        // Get assistant messages
        const assistantMessages = chatMessages.filter(m => m.role === 'assistant');
        const modelResponse = assistantMessages.length > 0
            ? assistantMessages[assistantMessages.length - 1]!.message
            : '';

        // Task is done when we have more than one assistant message
        if (assistantMessages.length > 1) {
            done = true;
        }

        logger.info(`Validation called. done=${done}, leaderboard_run=${this.runId}`);

        if (done) {
            try {
                // Get environment state from finish endpoint
                const envStateJson = await this.getFinishJson(1000);

                // Evaluate using local evaluator
                const [evalReward, , , evalInfo] = await this.evaluator.evaluate(
                    envStateJson,
                    modelResponse || 'Done'
                );

                reward = evalReward;
                message = done ? 'Task completed!' : 'Task still in progress';
                info.env_state = envStateJson;
                info.local_reward = reward;
                info.eval_info = evalInfo;

                // Handle leaderboard submission
                const isLeaderboardSubmission = this.runId !== '0';
                logger.info(`Leaderboard submission? ${isLeaderboardSubmission}`);

                if (isLeaderboardSubmission) {
                    if (this.evaluator.hasScriptEval()) {
                        logger.info('Detected script eval; using Railway submission path');
                        await this.submitScriptLeaderboard(
                            envStateJson,
                            modelResponse || 'Done',
                            info,
                            reward
                        );
                    } else {
                        logger.info('No script eval; using legacy submit endpoint');
                        await this.submitStandardLeaderboard(modelResponse || 'Done');
                    }
                }
            } catch (e) {
                logger.error(`Validation error: ${e instanceof Error ? e.message : String(e)}`);
                info.error = e instanceof Error ? e.message : String(e);
            }
        }

        return [reward, done, message, info];
    }

    /**
     * Submit results for script-based tasks to the external evaluation service
     */
    private async submitScriptLeaderboard(
        envStateJson: Record<string, any>,
        modelResponse: string,
        info: Record<string, any>,
        localReward: number
    ): Promise<void> {
        logger.info('Preparing Railway submission for script-based task');

        const taskConfigPayload = this.evaluator.buildTaskConfigPayload();
        const result = await submitToRailway(
            envStateJson,
            modelResponse,
            taskConfigPayload,
            this.runId,
            this.canonicalTaskId
        );

        if (result) {
            info.railway_reward = result.reward;
            info.railway_verified = true;
            info.leaderboard_submitted = result.leaderboardSubmitted;

            if (localReward !== result.reward) {
                logger.warning(
                    `⚠️ Evaluation mismatch! Local: ${localReward}, Railway: ${result.reward}`
                );
            }
        } else {
            info.railway_verified = false;
            info.leaderboard_submitted = false;
        }
    }

    /**
     * Submit results to the legacy WebClones leaderboard endpoint
     */
    private async submitStandardLeaderboard(modelResponse: string): Promise<void> {
        if (!this.backgroundPage) {
            logger.warning('Background page not available for leaderboard submission');
            return;
        }

        try {
            logger.info('Submitting result to legacy /submit endpoint');
            const encodedResponse = encodeURIComponent(modelResponse);
            const response = await this.backgroundPage.goto(
                `${this.url}/submit?retrieved_answer=${encodedResponse}`
            );

            if (!response) {
                logger.warning('No response received when submitting to leaderboard');
            } else {
                const status = response.status();
                if (status >= 400) {
                    const statusText = response.statusText();
                    logger.warning(`Leaderboard submission returned HTTP ${status} (${statusText})`);
                }
            }
        } catch (e) {
            logger.warning(`Failed to submit response to server: ${e instanceof Error ? e.message : String(e)}`);
        }
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
