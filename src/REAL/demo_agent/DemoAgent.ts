/**
 * DemoAgent - Built-in LLM-based agent
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { Agent, Observation } from '../types.js';
import { flattenAXTreeToStr, flattenDOMToStr, pruneHTML } from '../browsergym/utils/obs.js';
import { logger } from '../logging.js';

export interface DemoAgentConfig {
    modelName: string;
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    systemMessageHandling?: 'separate' | 'combined';
    thinkingBudget?: number;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    openrouterApiKey?: string;
    openrouterSiteUrl?: string;
    openrouterSiteName?: string;
}

/**
 * DemoAgent - Built-in agent using LLM providers
 * 
 * Supports OpenAI, Anthropic, and OpenRouter models.
 */
export class DemoAgent implements Agent {
    private config: Required<DemoAgentConfig>;
    private client: OpenAI | Anthropic;
    private modelName: string;
    private actionHistory: string[] = [];
    private sessionStartTime: number = 0;

    constructor(config: DemoAgentConfig) {
        this.config = {
            modelName: config.modelName,
            useHtml: config.useHtml ?? false,
            useAxtree: config.useAxtree ?? true,
            useScreenshot: config.useScreenshot ?? true,
            systemMessageHandling: config.systemMessageHandling || 'separate',
            thinkingBudget: config.thinkingBudget || 10000,
            openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY || '',
            anthropicApiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
            openrouterApiKey: config.openrouterApiKey || process.env.OPENROUTER_API_KEY || '',
            openrouterSiteUrl: config.openrouterSiteUrl || process.env.OPENROUTER_SITE_URL || '',
            openrouterSiteName: config.openrouterSiteName || process.env.OPENROUTER_SITE_NAME || '',
        };

        if (!this.config.useHtml && !this.config.useAxtree) {
            throw new Error('Either useHtml or useAxtree must be set to true');
        }

        // Initialize client based on model name
        if (
            this.config.modelName.startsWith('gpt-') ||
            this.config.modelName.startsWith('o1') ||
            this.config.modelName.startsWith('o3')
        ) {
            this.client = new OpenAI({ apiKey: this.config.openaiApiKey });
            this.modelName = this.config.modelName;
        } else if (this.config.modelName.startsWith('openrouter/')) {
            const actualModel = this.config.modelName.replace('openrouter/', '');
            this.client = new OpenAI({
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: this.config.openrouterApiKey,
            });
            this.modelName = actualModel;
        } else if (
            this.config.modelName.startsWith('claude-') ||
            this.config.modelName.startsWith('sonnet-')
        ) {
            // Model mapping
            const ANTHROPIC_MODELS: Record<string, string> = {
                'claude-3-opus': 'claude-3-opus-20240229',
                'claude-3-sonnet': 'claude-3-sonnet-20240229',
                'claude-3-haiku': 'claude-3-haiku-20240307',
                'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
                'claude-opus-4': 'claude-opus-4-20250514',
                'claude-sonnet-4': 'claude-sonnet-4-20250514',
                'sonnet-3.7': 'claude-3-7-sonnet-20250219',
            };

            const baseModelName = this.config.modelName.replace(':thinking', '');

            this.modelName = ANTHROPIC_MODELS[baseModelName] || baseModelName;
            this.client = new Anthropic({ apiKey: this.config.anthropicApiKey });
        } else {
            throw new Error(
                `Unsupported model: ${this.config.modelName}. Use a model name starting with 'gpt-', 'claude-', 'sonnet-', or 'openrouter/'`
            );
        }
    }

    obsPreprocessor(obs: Observation): Observation {
        // Process observation for LLM consumption
        const processed: any = {
            ...obs,
        };

        // Flatten AXTree
        if (this.config.useAxtree && obs.axtree_object) {
            processed.axtree_txt = flattenAXTreeToStr(obs.axtree_object);
        }

        // Prune HTML
        if (this.config.useHtml && obs.dom_object) {
            const domStr = flattenDOMToStr(obs.dom_object);
            processed.pruned_html = pruneHTML(domStr);
        }

        // Convert screenshot to base64
        if (this.config.useScreenshot && obs.screenshot) {
            processed.screenshot_base64 = obs.screenshot.toString('base64');
        }

        return processed as Observation;
    }

    async getAction(obs: Observation): Promise<string> {
        // Log task start on first action
        if (this.actionHistory.length === 0) {
            const goalStr =
                obs.goal_object && obs.goal_object.length > 0
                    ? obs.goal_object.find(g => g.type === 'text')?.text || ''
                    : obs.goal || '';
            logger.taskStart(goalStr, this.modelName);
            this.sessionStartTime = Date.now();
        }

        // Build system message
        const systemMsg = this.buildSystemMessage();

        // Build user messages
        const userMsgs = this.buildUserMessages(obs);

        // Query LLM
        const response = await this.queryModel(systemMsg, userMsgs);

        // Extract action from response
        const action = this.extractAction(response);
        this.actionHistory.push(action);

        // Log action
        const stepNum = this.actionHistory.length;
        const actionType = action.split('(')[0] || 'unknown';
        logger.taskStep(stepNum, actionType);

        return action;
    }

    private async queryModel(systemMsg: string, userMsgs: any[]): Promise<string> {
        // Check client type by checking for OpenAI-specific methods
        if ('chat' in this.client && 'completions' in (this.client as any).chat) {
            return await this.queryOpenAI(systemMsg, userMsgs);
        } else if ('messages' in this.client && 'create' in (this.client as any).messages) {
            return await this.queryAnthropic(systemMsg, userMsgs);
        }
        throw new Error('Unsupported client type');
    }

    private async queryOpenAI(systemMsg: string, userMsgs: any[]): Promise<string> {
        const client = this.client as OpenAI;
        const messages: any[] = [];

        if (this.config.systemMessageHandling === 'combined') {
            // Combine system and user messages
            let combinedContent = systemMsg + '\n\n';
            for (const msg of userMsgs) {
                if (msg.type === 'text') {
                    combinedContent += msg.text + '\n';
                }
            }
            messages.push({ role: 'user', content: combinedContent });
        } else {
            // Separate system message
            if (systemMsg) {
                messages.push({ role: 'system', content: systemMsg });
            }

            // Add user messages
            for (const msg of userMsgs) {
                if (msg.type === 'text') {
                    messages.push({ role: 'user', content: msg.text });
                } else if (msg.type === 'image_url') {
                    const imageUrl = typeof msg.image_url === 'string' ? msg.image_url : msg.image_url?.url || '';
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: msg.text || '' },
                            { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
                        ],
                    });
                }
            }
        }

        // Add headers for OpenRouter if needed
        const extraHeaders: Record<string, string> = {};
        if (this.config.modelName.includes('openrouter')) {
            extraHeaders['HTTP-Referer'] = this.config.openrouterSiteUrl;
            extraHeaders['X-Title'] = this.config.openrouterSiteName;
        }

        const completion = await client.chat.completions.create({
            model: this.modelName,
            messages,
            ...(Object.keys(extraHeaders).length > 0 ? { extraHeaders } : {}),
        });

        return completion.choices[0]!.message.content || '';
    }

    private async queryAnthropic(systemMsg: string, userMsgs: any[]): Promise<string> {
        const client = this.client as Anthropic;
        const content: any[] = [];

        for (const msg of userMsgs) {
            if (msg.type === 'text') {
                content.push({ type: 'text', text: msg.text });
            } else if (msg.type === 'image_url') {
                const imageUrl = typeof msg.image_url === 'string' ? msg.image_url : msg.image_url?.url || '';
                if (imageUrl.startsWith('data:image/jpeg;base64,')) {
                    const base64Data = imageUrl.replace('data:image/jpeg;base64,', '');
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/jpeg',
                            data: base64Data,
                        },
                    });
                }
            }
        }

        // Handle system message
        let systemContent: string | undefined = undefined;
        if (this.config.systemMessageHandling === 'combined') {
            // Prepend system message to content
            content.unshift({ type: 'text', text: systemMsg });
        } else {
            systemContent = systemMsg;
        }

        const message = await client.messages.create({
            model: this.modelName,
            max_tokens: 8000,
            system: systemContent,
            messages: [{ role: 'user', content }],
        });

        // Extract text content (ignore thinking blocks)
        for (const block of message.content) {
            if (block.type === 'text') {
                return block.text;
            }
        }

        throw new Error('No text content in Anthropic response');
    }

    private extractAction(response: string): string {
        // Look for code blocks with actions
        const codeBlockMatch = response.match(/```[\s\S]*?```/);
        if (codeBlockMatch) {
            const code = codeBlockMatch[0]!.replace(/```/g, '').trim();
            if (this.isValidAction(code)) {
                return code;
            }
        }

        // Fallback: try to find action in text
        const actionMatch = response.match(/(\w+)\([^)]*\)/);
        if (actionMatch) {
            return actionMatch[0]!;
        }

        throw new Error(`Could not extract action from response: ${response.substring(0, 200)}...`);
    }

    private isValidAction(action: string): boolean {
        const validActions = [
            'click',
            'fill',
            'goto',
            'scroll',
            'send_msg_to_user',
            'report_infeasible',
            'hover',
            'press',
            'select_option',
            'go_back',
            'go_forward',
        ];
        return validActions.some(valid => action.startsWith(valid + '('));
    }

    private buildSystemMessage(): string {
        return `# Instructions

Review the current state of the page and all other information to find the best
possible next action to accomplish your goal. Your answer will be interpreted
and executed by a program, make sure to follow the formatting instructions.`;
    }

    private buildUserMessages(obs: Observation): any[] {
        const messages: any[] = [];

        // Goal
        messages.push({ type: 'text', text: '# Goal' });
        messages.push(...obs.goal_object);

        // AXTree
        if (this.config.useAxtree && (obs as any).axtree_txt) {
            messages.push({
                type: 'text',
                text: `# Current page Accessibility Tree\n\n${(obs as any).axtree_txt}`,
            });
        }

        // HTML
        if (this.config.useHtml && (obs as any).pruned_html) {
            messages.push({
                type: 'text',
                text: `# Current page DOM\n\n${(obs as any).pruned_html}`,
            });
        }

        // Screenshot
        if (this.config.useScreenshot && (obs as any).screenshot_base64) {
            messages.push({ type: 'text', text: '# Current page Screenshot' });
            messages.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${(obs as any).screenshot_base64}`,
                    detail: 'auto',
                },
            });
        }

        // Action space description
        messages.push({ type: 'text', text: this.getActionSpaceDescription() });

        // History
        if (this.actionHistory.length > 0) {
            messages.push({ type: 'text', text: '# History of past actions' });
            for (const action of this.actionHistory) {
                messages.push({ type: 'text', text: action });
            }
        }

        // Last error
        if (obs.last_action_error) {
            messages.push({
                type: 'text',
                text: `# Error message from last action\n\n${obs.last_action_error}`,
            });
        }

        // Next action prompt
        messages.push({
            type: 'text',
            text: `# Next action

You will now think step by step and produce your next best action. Reflect on your past actions, any resulting error message, the current state of the page before deciding on your next action.`,
        });

        return messages;
    }

    private getActionSpaceDescription(): string {
        return `# Action Space

Available actions:
- click('bid'): Click an element by its BID
- fill('bid', 'text'): Fill an input field
- goto('url'): Navigate to a URL
- scroll('bid', 'direction'): Scroll an element (direction: 'up', 'down', 'left', 'right')
- hover('bid'): Hover over an element
- press('bid', 'key'): Press a key on an element
- select_option('bid', 'value'): Select an option in a dropdown
- go_back(): Navigate back
- go_forward(): Navigate forward
- send_msg_to_user('message'): Send a message to the user
- report_infeasible('reason'): Report that the task is infeasible

Format your response as: \`\`\`action('args')\`\`\``;
    }

    async close(): Promise<void> {
        // Cleanup if needed
        if (this.actionHistory.length > 0) {
            logger.info(`🎯 Session completed - ${this.actionHistory.length} actions taken`);
        }
    }
}
