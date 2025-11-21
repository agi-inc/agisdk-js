/**
 * Observation extraction utilities
 */

import type { Page, CDPSession } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Observation, GoalObject, ChatMessage, DOMSnapshot, AXTree } from '../../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BID_ATTR = 'bid';

/**
 * Mark DOM elements with BIDs (Browser IDs)
 */
export async function markElements(
    page: Page,
    tagsToMark: 'all' | 'standard_html' = 'standard_html'
): Promise<void> {
    const markScript = await fs.readFile(
        path.join(__dirname, '../../javascript/frame_mark_elements.js'),
        'utf-8'
    );

    // The script is an async function that takes [parent_bid, bid_attr_name, tags_to_mark]
    // We need to evaluate it and call it with the parameters
    await page.evaluate(
        async ([scriptContent, framePrefix, bidAttr, tagsToMarkValue]) => {
            // The script content is an async function definition
            // We need to execute it as a function
            try {
                // Try to evaluate as a function expression
                const func = eval(`(${scriptContent})`);
                if (typeof func === 'function') {
                    await func([framePrefix, bidAttr, tagsToMarkValue]);
                } else {
                    throw new Error('Script did not evaluate to a function');
                }
            } catch (e) {
                // Fallback: wrap in async function
                const wrapped = new Function('return async function(params) { ' + scriptContent + ' }')();
                await wrapped([framePrefix, bidAttr, tagsToMarkValue]);
            }
        },
        [markScript, '', BID_ATTR, tagsToMark]
    );
}

/**
 * Unmark DOM elements (cleanup)
 */
export async function unmarkElements(page: Page): Promise<void> {
    const unmarkScript = await fs.readFile(
        path.join(__dirname, '../../javascript/frame_unmark_elements.js'),
        'utf-8'
    );

    await page.evaluate(unmarkScript);
}

/**
 * Extract DOM snapshot using Chrome DevTools Protocol
 */
export async function extractDOMSnapshot(
    cdpSession: CDPSession,
    includeDOMRects: boolean = true,
    includePaintOrder: boolean = true
): Promise<DOMSnapshot> {
    const response = await cdpSession.send('DOMSnapshot.captureSnapshot', {
        computedStyles: [],
        includeDOMRects,
        includePaintOrder,
    });

    return response as DOMSnapshot;
}

/**
 * Extract accessibility tree using Chrome DevTools Protocol
 */
export async function extractAXTree(cdpSession: CDPSession): Promise<AXTree> {
    const response = await cdpSession.send('Accessibility.getFullAXTree');
    return response as AXTree;
}

/**
 * Extract screenshot using Chrome DevTools Protocol
 */
export async function extractScreenshot(cdpSession: CDPSession): Promise<Buffer> {
    const response = await cdpSession.send('Page.captureScreenshot', {
        format: 'png',
    });

    // Decode base64 to buffer
    const base64Data = response.data as string;
    return Buffer.from(base64Data, 'base64');
}

/**
 * Extract complete observation from browser state
 */
export async function extractObservation(
    page: Page,
    cdpSession: CDPSession,
    goal: string | GoalObject[],
    taskId: string,
    chatMessages: ChatMessage[],
    startTime: number,
    lastAction: string = '',
    lastActionError: string = '',
    useHtml: boolean = false,
    useAxtree: boolean = true,
    useScreenshot: boolean = true
): Promise<Observation> {
    // Mark elements before extraction
    await markElements(page);

    // Extract DOM, AXTree, and screenshot in parallel
    const [domSnapshot, axtree, screenshot] = await Promise.all([
        useHtml ? extractDOMSnapshot(cdpSession) : Promise.resolve({} as DOMSnapshot),
        useAxtree ? extractAXTree(cdpSession) : Promise.resolve({} as AXTree),
        useScreenshot ? extractScreenshot(cdpSession) : Promise.resolve(Buffer.alloc(0)),
    ]);

    // Unmark elements after extraction
    await unmarkElements(page);

    // Get URL and navigation state
    const url = page.url();
    const context = page.context();
    const pages = context.pages();
    const openPagesUrls = pages.map(p => p.url());
    const activePageIndex = pages.indexOf(page);

    // Convert goal to goal_object format
    const goalObject: GoalObject[] = Array.isArray(goal)
        ? goal
        : [{ type: 'text', text: goal }];

    const goalText = Array.isArray(goal)
        ? goal.find(g => g.type === 'text')?.text || ''
        : goal;

    // Get focused element BID (if any)
    const focusedElementBid = await page.evaluate(() => {
        const activeElement = document.activeElement;
        return activeElement?.getAttribute('bid') || '';
    }).catch(() => '');

    // Get browser instance
    const browser = context.browser();
    if (!browser) {
        throw new Error('Browser instance not available');
    }

    // Calculate elapsed time
    const elapsedTime = (Date.now() - startTime) / 1000;

    return {
        chat_messages: chatMessages,
        goal: goalText,
        goal_object: goalObject,
        task_id: taskId,
        open_pages_urls: openPagesUrls,
        active_page_index: activePageIndex,
        url,
        screenshot,
        dom_object: domSnapshot,
        axtree_object: axtree,
        extra_element_properties: {},
        focused_element_bid: focusedElementBid,
        last_action: lastAction,
        last_action_error: lastActionError,
        elapsed_time: elapsedTime,
        browser,
    };
}
