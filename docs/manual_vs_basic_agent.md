# Manual vs. Basic Agent

This note contrasts LLM-driven agents with manual-intervention agents. The JavaScript SDK currently focuses on custom agent implementations where you control the logic.

## Agent Interface

All agents in the JavaScript SDK implement the `REAL.Agent` interface:

```typescript
interface Agent {
    getAction(obs: Obs): Promise<string>;
}
```

## Custom Agent Implementation

### Basic Structure

```typescript
class MyAgent implements REAL.Agent {
    async getAction(obs: REAL.Obs): Promise<string> {
        // Process observation
        // Return action string
        return "click('123')";
    }
}
```

### Observation Processing

Your agent receives observations with:
- `url`: Current page URL
- `dom_object`: DOM structure (CDP DOMSnapshot)
- `axtree_object`: Accessibility tree (CDP AXTree)
- `screenshot`: Page screenshot (Buffer)
- `chat_messages`: Conversation history
- `goal`: Task goal text
- `last_action`: Last action taken
- `last_action_error`: Error from last action (if any)

### Action Format

Actions are returned as strings:
- `click('bid')` - Click element by BID
- `fill('bid', 'text')` - Fill input
- `goto('url')` - Navigate
- `scroll(x, y)` - Scroll
- `send_msg_to_user('message')` - Send chat message
- `report_infeasible('reason')` - End episode

## Example: Simple Agent

```typescript
class SimpleAgent implements REAL.Agent {
    private step = 0;

    async getAction(obs: REAL.Obs): Promise<string> {
        this.step++;
        
        // Check URL
        if (obs.url.includes('search')) {
            return "fill('search-input', 'laptop')";
        }
        
        // Check if we've done enough steps
        if (this.step >= 25) {
            return "report_infeasible('Max steps reached')";
        }
        
        return "scroll(0, 500)";
    }
}
```

## Example: LLM-Based Agent

For LLM-based agents, you would integrate with an LLM API:

```typescript
import OpenAI from 'openai';

class LLMAgent implements REAL.Agent {
    private client: OpenAI;
    private actionHistory: string[] = [];

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async getAction(obs: REAL.Obs): Promise<string> {
        // Build prompt from observation
        const prompt = this.buildPrompt(obs);
        
        // Call LLM
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
        });
        
        const action = response.choices[0].message.content || '';
        this.actionHistory.push(action);
        
        return action;
    }

    private buildPrompt(obs: REAL.Obs): string {
        // Convert observation to text prompt
        // Include goal, URL, DOM structure, etc.
        return `Goal: ${obs.goal}\nURL: ${obs.url}\n...`;
    }
}
```

## Key Differences from Python SDK

1. **No Built-in LLM Agent**: The JavaScript SDK doesn't include a pre-built LLM agent like Python's `DemoAgent`. You need to implement your own.

2. **Simpler Interface**: The JavaScript SDK uses a simpler interface - just `getAction(obs)` returning a promise of a string.

3. **Manual Control**: You have full control over how observations are processed and actions are chosen.

4. **Observation Format**: Observations match the Python SDK structure, so you can use similar logic.

## Best Practices

1. **Preprocess Observations**: Extract relevant information from DOM/AXTree before making decisions
2. **Track State**: Use instance variables to track agent state across steps
3. **Error Handling**: Check `last_action_error` to handle failed actions
4. **Termination**: Always have a termination condition (max steps, task completion, etc.)

See `example/custom.ts` for a complete implementation template.

