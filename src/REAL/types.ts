/**
 * Type definitions for AGI SDK
 */

import type { Browser, Page } from 'playwright';

/**
 * Chat message structure
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'infeasible' | 'user_image';
    message: string;
}

/**
 * Goal object structure (supports text and images)
 */
export interface GoalObject {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: string | { url: string; detail?: 'low' | 'high' | 'auto' };
}

/**
 * DOM snapshot structure (from Chrome DevTools Protocol)
 */
export interface DOMSnapshot {
    documents?: any[];
    strings?: string[];
    [key: string]: any;
}

/**
 * Accessibility tree structure (from Chrome DevTools Protocol)
 */
export interface AXTree {
    nodes?: any[];
    [key: string]: any;
}

/**
 * Observation structure - what the agent sees
 */
export interface Observation {
    chat_messages: ChatMessage[];
    goal: string;
    goal_object: GoalObject[];
    task_id: string;
    open_pages_urls: string[];
    active_page_index: number;
    url: string;
    screenshot: Buffer;
    dom_object: DOMSnapshot;
    axtree_object: AXTree;
    extra_element_properties: Record<string, Record<string, any>>;
    focused_element_bid: string;
    last_action: string;
    last_action_error: string;
    elapsed_time: number;
    browser: Browser;
}

/**
 * Agent interface - implement this to create custom agents
 */
export interface Agent {
    /**
     * Optional preprocessing of observations before getAction is called
     */
    obsPreprocessor?(obs: Observation): Observation | Promise<Observation>;

    /**
     * Get the next action based on the current observation
     * @param obs The current observation
     * @returns Action string (e.g., "click('123')")
     */
    getAction(obs: Observation): string | Promise<string>;

    /**
     * Optional cleanup when agent is done
     */
    close?(): void | Promise<void>;
}

/**
 * Task interface - implement this to create custom tasks
 */
export interface Task {
    /**
     * Setup the task on the given page
     * @param page Playwright page instance
     * @returns Tuple of [goal, info_dict]
     */
    setup(page: Page): Promise<[string | GoalObject[], Record<string, any>]>;

    /**
     * Cleanup task resources
     */
    teardown(): Promise<void>;

    /**
     * Validate if task is complete
     * @param page Playwright page instance
     * @param chatMessages Chat message history
     * @returns Tuple of [reward, done, message, info]
     */
    validate(
        page: Page,
        chatMessages: ChatMessage[]
    ): Promise<[number, boolean, string, Record<string, any>]>;

    /**
     * Optional cheat method for automated solution
     */
    cheat?(page: Page, chatMessages: ChatMessage[]): Promise<void>;
}

/**
 * Task result structure
 */
export interface TaskResult {
    cum_reward: number;
    elapsed_time: number;
    exp_dir: string;
    num_steps: number;
    success: boolean;
    err_msg?: string;
    stack_trace?: string;
}

/**
 * Harness configuration
 */
export interface HarnessConfig {
    agent: Agent;
    taskName?: string;
    taskType?: string;
    taskId?: number;
    taskVersion?: string;
    headless?: boolean;
    maxSteps?: number;
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    browserDimensions?: [number, number];
    viewport?: { width: number; height: number };
    resultsDir?: string;
    numWorkers?: number;
    useCache?: boolean;
    cacheOnly?: boolean;
    forceRefresh?: boolean;
    sampleTasks?: number;
    leaderboard?: boolean;
    runId?: string;
    apiKey?: string;
    runName?: string;
    modelIdName?: string;
}
