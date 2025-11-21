/**
 * Abstract task interface
 */

import type { Page } from 'playwright';
import type { Task, GoalObject, ChatMessage } from '../../types.js';

/**
 * Abstract base class for all browser tasks
 */
export abstract class AbstractBrowserTask implements Task {
    /**
     * Setup the task on the given page
     */
    abstract setup(page: Page): Promise<[string | GoalObject[], Record<string, any>]>;

    /**
     * Cleanup task resources
     */
    abstract teardown(): Promise<void>;

    /**
     * Validate if task is complete
     */
    abstract validate(
        page: Page,
        chatMessages: ChatMessage[]
    ): Promise<[number, boolean, string, Record<string, any>]>;

    /**
     * Optional cheat method for automated solution
     */
    async cheat(_page: Page, _chatMessages: ChatMessage[]): Promise<void> {
        throw new Error('Cheat method not implemented');
    }
}
