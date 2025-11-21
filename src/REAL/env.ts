import { type Browser, type BrowserContext, type Page, chromium } from 'playwright';
import { extractDOMSnapshot, extractMergedAXTree, extractScreenshot, extractFocusedElementBid, preExtract, postExtract } from './observation.js';
import { BROWSERGYM_ID_ATTRIBUTE } from './constants.js';

export interface TaskConfig {
    id: string;
    goal: string;
    website: {
        url: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface Obs {
    chat_messages: any[];
    goal: string;
    goal_object: any[];
    open_pages_urls: string[];
    active_page_index: number;
    url: string;
    screenshot: Buffer;
    dom_object: any;
    axtree_object: any;
    focused_element_bid: string;
    last_action: string;
    last_action_error: string;
    elapsed_time: number;
    browser: Browser;
}

export class BrowserEnv {
    browser: Browser | null = null;
    context: BrowserContext | null = null;
    page: Page | null = null;
    chatMessages: any[] = [];
    task: TaskConfig | null = null;
    startTime: number = 0;
    lastAction: string = "";
    lastActionError: string = "";
    public headless: boolean;
    
    constructor(headless: boolean = true) {
        this.headless = headless;
    }

    async reset(task: TaskConfig) {
        this.task = task;
        if (this.browser) {
            await this.browser.close();
        }
        
        this.browser = await chromium.launch({ headless: this.headless });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 }
        });
        
        // Initialize page
        this.page = await this.context.newPage();
        
        this.startTime = Date.now();
        this.chatMessages = [];
        this.lastAction = "";
        this.lastActionError = "";

        // Setup task
        await this.page.goto(task.website.url);
        
        // Add initial goal message
        this.chatMessages.push({
            role: "assistant",
            message: "Hi! I am your UI assistant, I can perform web tasks for you. What can I help you with?"
        });
        this.chatMessages.push({
            role: "user",
            message: task.goal
        });
    }

    async step(action: string) {
        this.lastAction = action;
        this.lastActionError = "";
        
        try {
            await this.executeAction(action);
        } catch (e: any) {
            this.lastActionError = e.message;
            console.error(`Action failed: ${action}`, e);
        }
        
        // Wait for network idle?
        try {
            await this.page?.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
        } catch {}

        return await this.getObs();
    }

    async getObs(): Promise<Obs> {
        if (!this.page) throw new Error("Env not initialized");

        await preExtract(this.page, "standard_html");
        
        const screenshot = await extractScreenshot(this.page);
        const dom = await extractDOMSnapshot(this.page);
        const axtree = await extractMergedAXTree(this.page);
        const focusedBid = await extractFocusedElementBid(this.page);

        await postExtract(this.page);

        // @ts-ignore: Context possibly null check handled by logic but TS complains
        const openPages = this.context?.pages().map(p => p.url()) || [];
        // @ts-ignore
        const activePageIndex = this.context?.pages().indexOf(this.page) || 0;

        return {
            chat_messages: [...this.chatMessages],
            goal: this.task?.goal || "",
            goal_object: [{ type: "text", text: this.task?.goal || "" }],
            open_pages_urls: openPages,
            active_page_index: activePageIndex,
            url: this.page.url(),
            screenshot: screenshot,
            dom_object: dom,
            axtree_object: axtree,
            focused_element_bid: focusedBid,
            last_action: this.lastAction,
            last_action_error: this.lastActionError,
            elapsed_time: (Date.now() - this.startTime) / 1000,
            browser: this.browser!
        };
    }

    async close() {
        await this.browser?.close();
    }

    async executeAction(action: string) {
        if (!this.page) return;

        // Parse action string like "click('123')"
        // Simple regex parser for demo purposes
        const match = action.match(/^(\w+)\((.*)\)$/);
        if (!match) {
            throw new Error(`Invalid action format: ${action}`);
        }

        const func = match[1];
        const argsStr = match[2];
        
        // Split args respecting quotes (simple version)
        const args: string[] = argsStr ? argsStr.split(',').map(s => {
            s = s.trim();
            if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
                return s.slice(1, -1);
            }
            return s;
        }) : [];

        switch (func) {
            case 'click': {
                const bid = args[0];
                if (!bid) throw new Error("click action requires a bid");
                const selector = `[${BROWSERGYM_ID_ATTRIBUTE}="${bid}"]`;
                await this.page.click(selector);
                break;
            }
            case 'fill': {
                const bid = args[0];
                const text = args[1];
                if (!bid || text === undefined) throw new Error("fill action requires a bid and text");
                const selector = `[${BROWSERGYM_ID_ATTRIBUTE}="${bid}"]`;
                await this.page.fill(selector, text);
                break;
            }
            case 'goto': {
                const url = args[0];
                if (!url) throw new Error("goto action requires a url");
                await this.page.goto(url);
                break;
            }
            case 'go_back': {
                await this.page.goBack();
                break;
            }
            case 'go_forward': {
                await this.page.goForward();
                break;
            }
            case 'press': {
                const bid = args.length > 1 ? args[0] : null;
                const key = args.length > 1 ? args[1] : args[0];
                if (!key) throw new Error("press action requires a key");
                if (bid) {
                     const selector = `[${BROWSERGYM_ID_ATTRIBUTE}="${bid}"]`;
                     await this.page.press(selector, key);
                } else {
                     await this.page.keyboard.press(key);
                }
                break;
            }
            case 'scroll': {
                const x = parseInt(args[0] || "0");
                const y = parseInt(args[1] || "0");
                await this.page.mouse.wheel(x, y);
                break;
            }
            case 'send_msg_to_user': {
                const msg = args[0] || "";
                this.chatMessages.push({ role: "assistant", message: msg });
                console.log("Agent says:", msg);
                break;
            }
            case 'report_infeasible': {
                const msg = args[0] || "";
                this.chatMessages.push({ role: "infeasible", message: msg });
                console.log("Agent reports infeasible:", msg);
                break;
            }
            default:
                throw new Error(`Unknown action: ${func}`);
        }
    }
}
