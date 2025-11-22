# Building Custom Agents: DemoAgent vs Custom Implementation

This guide explains the difference between using the built-in `DemoAgent` and implementing your own custom agent, helping you understand when to use each approach and how to build your own.

## Overview

The AGI SDK provides flexibility in agent implementation:

1. **DemoAgent**: Built-in LLM-powered agent (OpenAI, Anthropic, OpenRouter)
2. **Custom Agent**: Implement your own logic by implementing the `Agent` interface

## Agent Interface

All agents must implement this simple interface:

```typescript
interface Agent {
    /**
     * Get the next action based on the current observation
     */
    getAction(obs: Observation): string | Promise<string>;

    /**
     * Optional: Preprocess observations before decision-making
     */
    obsPreprocessor?(obs: Observation): Observation | Promise<Observation>;

    /**
     * Optional: Clean up resources when done
     */
    close?(): void | Promise<void>;
}
```

## DemoAgent

The built-in agent that uses LLM APIs to make decisions.

### Features

- **Multi-model support**: OpenAI, Anthropic, OpenRouter
- **Observation preprocessing**: Automatic HTML pruning, AXTree flattening
- **Vision support**: Can process screenshots
- **Chat mode**: Supports conversational tasks
- **Action history**: Maintains context across steps

### Usage

```typescript
import { REAL } from '@agi-inc/agisdk';

const agent = new REAL.DemoAgent({
    modelName: 'gpt-4o',
    useAxtree: true,
    useScreenshot: true,
    useHtml: false,
});

const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
});

const results = await harness.run();
```

### Configuration Options

```typescript
interface DemoAgentConfig {
    modelName: string;                 // Required: Model to use
    useHtml?: boolean;                 // Include HTML (default: false)
    useAxtree?: boolean;               // Include AXTree (default: true)
    useScreenshot?: boolean;           // Include screenshot (default: true)
    systemMessageHandling?: 'separate' | 'combined';
    thinkingBudget?: number;           // For extended thinking models
    openaiApiKey?: string;             // Override env variable
    anthropicApiKey?: string;          // Override env variable
    openrouterApiKey?: string;         // Override env variable
}
```

### When to Use DemoAgent

Use `DemoAgent` when:
- You want to quickly test with different LLM models
- You need a baseline for comparison
- You're prototyping agent behavior
- You don't need custom decision logic

## Custom Agent Implementation

Implement your own agent for full control over decision-making.

### Basic Custom Agent

```typescript
import { REAL } from '@agi-inc/agisdk';
import type { Observation } from '@agi-inc/agisdk';

class MyCustomAgent implements REAL.Agent {
    private steps: number = 0;

    async getAction(obs: Observation): Promise<string> {
        this.steps++;

        // Your custom logic here
        if (obs.url?.includes('login')) {
            return "fill('username', 'myuser')";
        }

        if (this.steps > 10) {
            return "send_msg_to_user('Task completed')";
        }

        // Default action
        return "noop()";
    }

    async close(): Promise<void> {
        console.log(`Completed in ${this.steps} steps`);
    }
}
```

### Advanced Custom Agent with Preprocessing

```typescript
class AdvancedAgent implements REAL.Agent {
    private actionHistory: string[] = [];
    private llmClient: OpenAI;

    constructor(config: { apiKey: string }) {
        this.llmClient = new OpenAI({ apiKey: config.apiKey });
    }

    // Preprocess observations
    obsPreprocessor(obs: Observation): Observation {
        // Custom preprocessing logic
        const processed = { ...obs };

        // Example: Extract specific information
        if (obs.axtree_object) {
            processed.simplified_tree = this.simplifyAXTree(obs.axtree_object);
        }

        return processed;
    }

    async getAction(obs: Observation): Promise<string> {
        // Use your own LLM prompting strategy
        const prompt = this.buildPrompt(obs);
        const response = await this.llmClient.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
        });

        const action = this.parseAction(response.choices[0]!.message.content!);
        this.actionHistory.push(action);

        return action;
    }

    private buildPrompt(obs: Observation): string {
        // Custom prompt building logic
        return `Current URL: ${obs.url}\nGoal: ${obs.goal}\nWhat should we do next?`;
    }

    private parseAction(response: string): string {
        // Custom action parsing logic
        return response.trim();
    }

    private simplifyAXTree(tree: any): any {
        // Custom tree simplification
        return tree;
    }

    async close(): Promise<void> {
        console.log(`Actions taken: ${this.actionHistory.length}`);
    }
}
```

### Rule-Based Agent

```typescript
class RuleBasedAgent implements REAL.Agent {
    async getAction(obs: Observation): Promise<string> {
        // Pure rule-based logic
        const url = obs.url || '';

        // Navigate to product page
        if (url.includes('/home')) {
            return "goto('/products')";
        }

        // Search for items
        if (url.includes('/products')) {
            return "fill('search', 'laptop')";
        }

        // Add to cart
        if (url.includes('/product/')) {
            return "click('add-to-cart-btn')";
        }

        // Checkout
        if (url.includes('/cart')) {
            return "click('checkout-btn')";
        }

        // Complete
        return "send_msg_to_user('Order placed')";
    }
}
```

### Hybrid Agent (LLM + Rules)

```typescript
class HybridAgent implements REAL.Agent {
    private demoAgent: REAL.DemoAgent;
    private currentStep: number = 0;

    constructor() {
        this.demoAgent = new REAL.DemoAgent({
            modelName: 'gpt-4o',
            useAxtree: true,
            useScreenshot: false,  // Save tokens
        });
    }

    async getAction(obs: Observation): Promise<string> {
        this.currentStep++;

        // Use rules for common patterns
        if (this.shouldUseRule(obs)) {
            return this.getRuleBasedAction(obs);
        }

        // Fall back to LLM for complex decisions
        return await this.demoAgent.getAction(obs);
    }

    private shouldUseRule(obs: Observation): boolean {
        // Use rules for known patterns
        const url = obs.url || '';
        return url.includes('/login') || url.includes('/checkout');
    }

    private getRuleBasedAction(obs: Observation): string {
        const url = obs.url || '';

        if (url.includes('/login')) {
            return "fill('username', 'testuser')";
        }

        if (url.includes('/checkout')) {
            return "click('place-order')";
        }

        return "noop()";
    }

    async close(): Promise<void> {
        await this.demoAgent.close();
    }
}
```

## Comparison Table

| Feature | DemoAgent | Custom Agent |
|---------|-----------|--------------|
| Implementation effort | None (built-in) | Medium to high |
| LLM integration | Built-in (OpenAI, Anthropic, OpenRouter) | You implement |
| Observation preprocessing | Automatic | You implement |
| Action parsing | Automatic | You implement |
| Prompt engineering | Fixed strategy | Full control |
| Custom logic | Limited | Unlimited |
| Cost | LLM API costs | Your choice |
| Best for | Quick prototyping, baselines | Production, specialized logic |

## Key Concepts

### Observations

Observations contain the current state of the browser:

```typescript
interface Observation {
    url: string;                       // Current URL
    goal?: string;                     // Task goal
    goal_object: GoalObject[];         // Structured goal
    screenshot?: Buffer;               // Screenshot (if enabled)
    axtree_object?: AXNode;            // Accessibility tree
    dom_object?: DOMNode;              // DOM tree
    last_action?: string;              // Previous action
    last_action_error?: string;        // Error from last action
    chat_messages?: ChatMessage[];     // Chat history
}
```

### Actions

Actions are strings that the browser environment will execute:

```typescript
// Navigation
"goto('https://example.com')"
"go_back()"
"go_forward()"

// Interaction
"click('element-id')"                  // Click element by BID
"fill('input-id', 'text')"             // Fill input
"hover('element-id')"                  // Hover over element
"press('input-id', 'Enter')"           // Press key
"select_option('dropdown-id', 'value')" // Select option
"scroll('container-id', 'down')"       // Scroll (up/down/left/right)

// Task control
"send_msg_to_user('message')"          // End with success message
"report_infeasible('reason')"          // Report task cannot be completed
"noop()"                               // Do nothing
```

### Action History

Track previous actions for context:

```typescript
class ContextAwareAgent implements REAL.Agent {
    private actionHistory: string[] = [];

    async getAction(obs: Observation): Promise<string> {
        // Build context from history
        const context = this.actionHistory.join('\n');

        // Make decision with context
        const action = this.decideAction(obs, context);

        // Track action
        this.actionHistory.push(action);

        return action;
    }

    private decideAction(obs: Observation, context: string): string {
        // Your logic here
        return "noop()";
    }
}
```

## Best Practices

### 1. Handle Errors Gracefully

```typescript
class RobustAgent implements REAL.Agent {
    async getAction(obs: Observation): Promise<string> {
        try {
            // Check for errors from last action
            if (obs.last_action_error) {
                return this.handleError(obs.last_action_error);
            }

            return await this.normalAction(obs);
        } catch (error) {
            console.error('Agent error:', error);
            return "report_infeasible('Agent encountered an error')";
        }
    }

    private handleError(error: string): string {
        // Retry logic or alternative approach
        return "noop()";
    }

    private async normalAction(obs: Observation): Promise<string> {
        // Normal decision logic
        return "noop()";
    }
}
```

### 2. Use Observation Preprocessing

```typescript
class EfficientAgent implements REAL.Agent {
    obsPreprocessor(obs: Observation): Observation {
        // Simplify observations to reduce processing
        return {
            ...obs,
            // Keep only what you need
            url: obs.url,
            goal: obs.goal,
            axtree_object: obs.axtree_object,
            // Remove expensive fields if not needed
            screenshot: undefined,
            dom_object: undefined,
        };
    }

    async getAction(obs: Observation): Promise<string> {
        // Work with preprocessed observation
        return "noop()";
    }
}
```

### 3. Implement Proper Cleanup

```typescript
class CleanAgent implements REAL.Agent {
    private resources: any[] = [];

    async getAction(obs: Observation): Promise<string> {
        // Your logic
        return "noop()";
    }

    async close(): Promise<void> {
        // Clean up resources
        for (const resource of this.resources) {
            await resource.cleanup();
        }
        console.log('Agent cleaned up successfully');
    }
}
```

### 4. Log for Debugging

```typescript
class DebuggableAgent implements REAL.Agent {
    async getAction(obs: Observation): Promise<string> {
        console.log(`[Step] URL: ${obs.url}`);
        console.log(`[Step] Goal: ${obs.goal}`);

        const action = this.decide(obs);
        console.log(`[Action] ${action}`);

        return action;
    }

    private decide(obs: Observation): string {
        // Your logic
        return "noop()";
    }
}
```

## When to Build a Custom Agent

Build a custom agent when you need:

1. **Specialized Logic**: Domain-specific decision-making
2. **Cost Optimization**: Reduce LLM API calls
3. **Performance**: Faster decisions without LLM latency
4. **Custom Models**: Use models not supported by DemoAgent
5. **Hybrid Approach**: Combine rules with LLM
6. **Research**: Experiment with novel agent architectures

## Examples

See working examples in the [example/ directory](../example/):

- [custom.ts](../example/custom.ts) - Basic custom agent template
- [hackable.ts](../example/hackable.ts) - Advanced configurable agent
- [starter.ts](../example/starter.ts) - Simple DemoAgent usage

## See Also

- [API Documentation](./API_DOCS.md) - Complete API reference
- [Task Guide](./Task.md) - Understanding tasks
- [Examples](../example/README.md) - Working examples
- [Main README](../README.md) - Getting started
