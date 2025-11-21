/**
 * Action execution utilities
 */

import type { Page } from 'playwright';

/**
 * Parse action arguments from a string
 */
function parseArgs(argsString: string): any[] {
    if (!argsString.trim()) {
        return [];
    }

    const args: any[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let i = 0;

    while (i < argsString.length) {
        const char = argsString[i]!;

        if (!inString) {
            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
                current += char;
            } else if (char === '(' || char === '[' || char === '{') {
                depth++;
                current += char;
            } else if (char === ')' || char === ']' || char === '}') {
                depth--;
                current += char;
            } else if (char === ',' && depth === 0) {
                args.push(parseValue(current.trim()));
                current = '';
            } else {
                current += char;
            }
        } else {
            current += char;
            if (char === stringChar && argsString[i - 1] !== '\\') {
                inString = false;
            }
        }

        i++;
    }

    if (current.trim()) {
        args.push(parseValue(current.trim()));
    }

    return args;
}

/**
 * Parse a single value (string, number, boolean, null)
 */
function parseValue(value: string): any {
    value = value.trim();

    // String
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }

    // Number
    if (/^-?\d+$/.test(value)) {
        return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
        return parseFloat(value);
    }

    // Boolean
    if (value === 'True' || value === 'true') {
        return true;
    }
    if (value === 'False' || value === 'false') {
        return false;
    }

    // None/null
    if (value === 'None' || value === 'null') {
        return null;
    }

    // Default: return as string
    return value;
}

/**
 * Parse action string to function name and arguments
 */
export function parseAction(actionString: string): { name: string; args: any[] } {
    // Remove code block markers if present
    let cleaned = actionString.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    // Match function call pattern: function_name(args...)
    const match = cleaned.match(/^(\w+)\s*\((.*)\)\s*$/);
    if (!match) {
        throw new Error(`Invalid action format: ${actionString}`);
    }

    const name = match[1]!;
    const argsString = match[2]!;
    const args = parseArgs(argsString);

    return { name, args };
}

/**
 * Execute an action string on the page
 */
export async function executeAction(action: string, page: Page): Promise<void> {
    const { name, args } = parseAction(action);

    // Execute based on action name
    switch (name) {
        case 'goto':
            if (args.length < 1) throw new Error('goto requires 1 argument');
            await page.goto(args[0] as string);
            break;

        case 'go_back':
            await page.goBack();
            break;

        case 'go_forward':
            await page.goForward();
            break;

        case 'click':
            if (args.length < 1) throw new Error('click requires at least 1 argument');
            const bid = args[0] as string;
            const button = (args[1] as 'left' | 'middle' | 'right') || 'left';
            const modifiers = (args[2] as ('Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift')[]) || [];
            await page.click(`[bid="${bid}"]`, { button, modifiers, timeout: 500 });
            break;

        case 'dblclick':
            if (args.length < 1) throw new Error('dblclick requires at least 1 argument');
            const dblBid = args[0] as string;
            const dblButton = (args[1] as 'left' | 'middle' | 'right') || 'left';
            const dblModifiers = (args[2] as ('Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift')[]) || [];
            await page.dblclick(`[bid="${dblBid}"]`, { button: dblButton, modifiers: dblModifiers, timeout: 500 });
            break;

        case 'fill':
            if (args.length < 2) throw new Error('fill requires 2 arguments');
            await page.fill(`[bid="${args[0]}"]`, String(args[1]), { timeout: 500 });
            break;

        case 'press':
            if (args.length < 2) throw new Error('press requires 2 arguments');
            await page.press(`[bid="${args[0]}"]`, args[1] as string, { timeout: 500 });
            break;

        case 'scroll':
            if (args.length < 2) throw new Error('scroll requires 2 arguments');
            const scrollBid = args[0] as string;
            const direction = args[1] as 'up' | 'down' | 'left' | 'right';
            const element = page.locator(`[bid="${scrollBid}"]`).first();
            await element.scrollIntoViewIfNeeded();
            // Additional scroll logic based on direction
            const box = await element.boundingBox();
            if (box) {
                const centerX = box.x + box.width / 2;
                const centerY = box.y + box.height / 2;
                await page.mouse.move(centerX, centerY);
                const delta = direction === 'up' ? -300 : direction === 'down' ? 300 : direction === 'left' ? -300 : 300;
                await page.mouse.wheel(0, direction === 'up' || direction === 'down' ? delta : 0);
            }
            break;

        case 'hover':
            if (args.length < 1) throw new Error('hover requires 1 argument');
            await page.hover(`[bid="${args[0]}"]`, { timeout: 500 });
            break;

        case 'select_option':
            if (args.length < 2) throw new Error('select_option requires 2 arguments');
            const selectBid = args[0] as string;
            const options = Array.isArray(args[1]) ? args[1] : [args[1]];
            await page.selectOption(`[bid="${selectBid}"]`, options, { timeout: 500 });
            break;

        case 'send_msg_to_user':
            if (args.length < 1) throw new Error('send_msg_to_user requires 1 argument');
            // Call exposed function
            await (page as any).evaluate((text: string) => {
                return (window as any).browsergym_send_message(text);
            }, String(args[0]));
            break;

        case 'report_infeasible':
            if (args.length < 1) throw new Error('report_infeasible requires 1 argument');
            // Call exposed function
            await (page as any).evaluate((reason: string) => {
                return (window as any).browsergym_report_infeasible(reason);
            }, String(args[0]));
            break;

        case 'noop':
            const waitMs = args.length > 0 ? (args[0] as number) : 1000;
            await page.waitForTimeout(waitMs);
            break;

        default:
            throw new Error(`Unknown action: ${name}`);
    }
}
