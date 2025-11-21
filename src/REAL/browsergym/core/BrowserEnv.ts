/**
 * BrowserEnv - Gymnasium-like browser environment
 */

import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';
import type { Task, Observation, ChatMessage, GoalObject } from '../../types.js';
import { extractObservation } from './Observation.js';
import { executeAction } from './ActionExecutor.js';
import { logger } from '../../logging.js';

/**
 * Browser environment configuration
 */
export interface BrowserEnvConfig {
    taskName: string;
    taskVersion?: string;
    headless?: boolean;
    maxSteps?: number;
    viewport?: { width: number; height: number };
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    runId?: string;
    apiKey?: string;
    modelIdName?: string;
    runName?: string;
    tagsToMark?: 'all' | 'standard_html';
    slowMo?: number;
    timeout?: number;
}

/**
 * BrowserEnv - Main browser environment class
 */
export class BrowserEnv {
    private _config: Required<BrowserEnvConfig>;
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private cdpSession: CDPSession | null = null;
    private task: Task | null = null;
    private startTime: number = 0;
    private chatMessages: ChatMessage[] = [];
    private goalObject: GoalObject[] = [];
    private lastAction: string = '';
    private lastActionError: string = '';
    private pageHistory: Map<Page, null> = new Map();

    constructor(config: BrowserEnvConfig) {
        this._config = {
            taskName: config.taskName,
            taskVersion: config.taskVersion || 'v2',
            headless: config.headless ?? true,
            maxSteps: config.maxSteps ?? 25,
            viewport: config.viewport || { width: 1280, height: 720 },
            useHtml: config.useHtml ?? false,
            useAxtree: config.useAxtree ?? true,
            useScreenshot: config.useScreenshot ?? true,
            runId: config.runId || '',
            apiKey: config.apiKey || '',
            modelIdName: config.modelIdName || '',
            runName: config.runName || '',
            tagsToMark: config.tagsToMark || 'standard_html',
            slowMo: config.slowMo || 0,
            timeout: config.timeout || 5000,
        };
    }

    protected get config(): Required<BrowserEnvConfig> {
        return this._config;
    }

    /**
     * Reset the environment with a new task
     */
    async reset(task: Task): Promise<Observation> {
        // Cleanup previous task
        await this.close();

        // Launch browser
        this.browser = await chromium.launch({
            headless: this._config.headless,
            slowMo: this._config.slowMo,
        });

        // Create context
        this.context = await this.browser.newContext({
            viewport: this._config.viewport,
        });

        // Set default timeout
        this.context.setDefaultTimeout(this._config.timeout);

        // Set test ID attribute to 'bid' (Playwright API)
        // Note: This needs to be done via Playwright's selectors API
        // We'll handle this in the page context

        // Setup page tracking
        await this.setupPageTracking();

        // Create new page
        this.page = await this.context.newPage();
        this.pageHistory.set(this.page, null);

        // Expose functions for send_msg_to_user and report_infeasible
        await this.page.exposeFunction('browsergym_send_message', (text: string) => {
            this.chatMessages.push({ role: 'assistant', message: text });
        });
        await this.page.exposeFunction('browsergym_report_infeasible', (reason: string) => {
            this.chatMessages.push({ role: 'infeasible', message: reason });
        });

        // Create CDP session
        this.cdpSession = await this.context.newCDPSession(this.page);

        // Store task
        this.task = task;

        // Setup task
        const [goal] = await task.setup(this.page);

        // Process goal
        if (goal === null || goal === undefined) {
            this.goalObject = [];
        } else if (typeof goal === 'string') {
            this.goalObject = [{ type: 'text', text: goal }];
        } else if (Array.isArray(goal)) {
            this.goalObject = goal;
        } else {
            throw new Error(`Invalid goal type: ${typeof goal}`);
        }

        // Initialize chat
        this.chatMessages = [
            {
                role: 'assistant',
                message: 'Hi! I am your UI assistant, I can perform web tasks for you. What can I help you with?',
            },
        ];

        // Add goal to chat
        for (const message of this.goalObject) {
            if (message.type === 'text') {
                this.chatMessages.push({
                    role: 'user',
                    message: message.text || '',
                });
            } else if (message.type === 'image_url') {
                const imageUrl = typeof message.image_url === 'string' 
                    ? message.image_url 
                    : message.image_url?.url || '';
                this.chatMessages.push({
                    role: 'user_image',
                    message: imageUrl,
                });
            }
        }

        // Wait for DOM to load
        await this.waitDOMLoaded();

        // Check active page
        await this.activePageCheck();

        // Initialize timing
        this.startTime = Date.now();
        this.lastAction = '';
        this.lastActionError = '';

        // Extract initial observation
        const obs = await this.getObservation();

        return obs;
    }

    /**
     * Execute an action and return new observation
     */
    async step(action: string): Promise<[Observation, number, boolean, boolean, Record<string, any>]> {
        if (!this.page || !this.task) {
            throw new Error('Environment not initialized. Call reset() first.');
        }

        // Store action
        this.lastAction = action;
        this.lastActionError = '';

        const actionExecStart = Date.now();

        // Helper function for reporting infeasible
        const reportInfeasible = (reason: string) => {
            this.chatMessages.push({ role: 'infeasible', message: reason });
        };

        // Execute action
        let actionExecuted = false;
        try {
            await executeAction(action, this.page);
            actionExecuted = true;
        } catch (error) {
            this.lastActionError = error instanceof Error 
                ? `${error.constructor.name}: ${error.message}` 
                : String(error);
            logger.error(`Error executing action: ${this.lastActionError}`);
            if (actionExecuted) {
                reportInfeasible(`Execution failed: ${this.lastActionError}`);
            }
        }

        // Wait a bit for JS events if action was executed
        if (actionExecuted) {
            await new Promise(resolve => setTimeout(resolve, 500));
            // Trigger Playwright callbacks
            try {
                await this.context!.cookies();
            } catch (e) {
                // Ignore errors
            }
        }

        // Wait for DOM to stabilize
        await this.waitDOMLoaded();

        // Check active page
        await this.activePageCheck();

        // Validate task
        const [reward, done, userMessage, taskInfo] = await this.task.validate(
            this.page,
            this.chatMessages
        );

        // Add user message if provided
        if (userMessage) {
            this.chatMessages.push({ role: 'user', message: userMessage });
        }

        // Extract observation
        const obs = await this.getObservation();

        const actionExecStop = Date.now();
        const info: Record<string, any> = {
            action_exec_start: actionExecStart,
            action_exec_stop: actionExecStop,
            task_info: taskInfo,
        };

        const terminated = done;
        const truncated = false;

        return [obs, reward, terminated, truncated, info];
    }

    /**
     * Close environment and cleanup resources
     */
    async close(): Promise<void> {
        if (this.task) {
            try {
                await this.task.teardown();
            } catch (e) {
                logger.warning(`Error during task teardown: ${e}`);
            }
        }

        if (this.cdpSession) {
            try {
                await this.cdpSession.detach();
            } catch (e) {
                // Ignore errors
            }
            this.cdpSession = null;
        }

        if (this.context) {
            try {
                await this.context.close();
            } catch (e) {
                // Ignore errors
            }
            this.context = null;
        }

        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) {
                // Ignore errors
            }
            this.browser = null;
        }

        this.page = null;
        this.pageHistory.clear();
    }

    /**
     * Setup page tracking via JavaScript callbacks
     */
    private async setupPageTracking(): Promise<void> {
        if (!this.context) return;

        // Expose binding for page activation
        await this.context.exposeBinding('browsergym_page_activated', async ({ page }) => {
            await this.activatePageFromJS(page);
        });

        // Inject init script to track page activation
        await this.context.addInitScript(`
            window.browsergym_page_activated();
            ['focus', 'load', 'pageshow', 'mousemove', 'mouseup', 'mousedown', 
             'wheel', 'keyup', 'keydown', 'input', 'touchstart', 'touchend'].forEach(event => {
                window.addEventListener(event, () => { window.browsergym_page_activated(); }, {capture: true});
            });
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    window.browsergym_page_activated();
                }
            }, {capture: true});
        `);
    }

    /**
     * Activate page from JavaScript callback
     */
    private async activatePageFromJS(page: Page): Promise<void> {
        if (!this.context || page.context() !== this.context) {
            return;
        }

        // Update page history
        if (this.pageHistory.has(page)) {
            this.pageHistory.delete(page);
        }
        this.pageHistory.set(page, null);

        this.page = page;
    }

    /**
     * Wait for DOM to load on all pages
     */
    private async waitDOMLoaded(): Promise<void> {
        if (!this.context) return;

        const pages = this.context.pages();
        for (const page of pages) {
            try {
                await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
            } catch (e) {
                // Ignore timeout errors
            }
            // Also wait for network idle
            try {
                await page.waitForLoadState('networkidle', { timeout: 5000 });
            } catch (e) {
                // Ignore timeout errors
            }
        }
    }

    /**
     * Check and fix active page if needed
     */
    private async activePageCheck(): Promise<void> {
        if (!this.context) return;

        // Ensure there's always a page open
        if (this.context.pages().length === 0) {
            logger.warning('All pages are closed, opening a new page.');
            this.page = await this.context.newPage();
            this.pageHistory.set(this.page, null);
            return;
        }

        // If active page is closed, get last page from history
        while (this.page && (this.page.isClosed() || !this.context.pages().includes(this.page))) {
            this.pageHistory.delete(this.page);
            const historyPages = Array.from(this.pageHistory.keys());
            if (historyPages.length > 0) {
                this.page = historyPages[historyPages.length - 1]!;
            } else {
                // No history, use first available page
                this.page = this.context.pages()[0]!;
                this.pageHistory.set(this.page, null);
            }
        }

        // Ensure page is valid
        if (!this.page || !this.context.pages().includes(this.page)) {
            this.page = this.context.pages()[0]!;
            this.pageHistory.set(this.page, null);
        }

        if (this.page.isClosed()) {
            throw new Error('Active page has been closed');
        }
    }

    /**
     * Extract observation from current browser state
     */
    private async getObservation(): Promise<Observation> {
        if (!this.page || !this.cdpSession) {
            throw new Error('Page or CDP session not initialized');
        }

        return await extractObservation(
            this.page,
            this.cdpSession,
            this.goalObject,
            this._config.taskName,
            this.chatMessages,
            this.startTime,
            this.lastAction,
            this.lastActionError,
            this._config.useHtml,
            this._config.useAxtree,
            this._config.useScreenshot
        );
    }
}
