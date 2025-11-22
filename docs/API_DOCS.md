# AGI SDK API Documentation

This document provides comprehensive API reference for the AGI SDK (JavaScript/TypeScript).

## Table of Contents

- [Core Classes](#core-classes)
  - [Harness](#harness)
  - [DemoAgent](#demoagent)
  - [BrowserEnv](#browserenv)
- [Interfaces](#interfaces)
  - [Agent](#agent-interface)
  - [Observation](#observation)
  - [TaskResult](#taskresult)
- [Utilities](#utilities)
- [Leaderboard API](#leaderboard-api)

---

## Core Classes

### Harness

The main orchestrator class for running tasks with agents.

#### Constructor

```typescript
new Harness(config: HarnessConfig)
```

#### HarnessConfig

```typescript
interface HarnessConfig {
    // Required
    agent: Agent;                      // The agent to run

    // Task selection (provide one)
    taskName?: string;                 // Specific task (e.g., 'v2.omnizon-1')
    taskType?: string;                 // Task type (e.g., 'omnizon')
    taskId?: number;                   // Task ID within a type

    // Task configuration
    taskVersion?: string;              // Default: 'v2'
    sampleTasks?: number;              // Number of tasks to sample

    // Browser configuration
    headless?: boolean;                // Default: true
    maxSteps?: number;                 // Default: 25
    browserDimensions?: [number, number];  // Default: [1280, 720]
    viewport?: { width: number; height: number };  // Default: {width: 1280, height: 720}

    // Observation configuration
    useHtml?: boolean;                 // Include HTML. Default: false
    useAxtree?: boolean;               // Include accessibility tree. Default: true
    useScreenshot?: boolean;           // Include screenshots. Default: true

    // Cache configuration
    useCache?: boolean;                // Use cached task data. Default: true
    cacheOnly?: boolean;               // Only use cache. Default: false
    forceRefresh?: boolean;            // Force refresh cache. Default: false

    // Leaderboard submission
    leaderboard?: boolean;             // Submit to leaderboard. Default: false
    runId?: string;                    // Run ID for leaderboard
    apiKey?: string;                   // API key for leaderboard
    modelName?: string;                // Model name for leaderboard
    runName?: string;                  // Run name for leaderboard

    // Output configuration
    resultsDir?: string;               // Results directory. Default: './results'

    // Parallel execution (future)
    numWorkers?: number;               // Number of parallel workers. Default: 1
}
```

#### Methods

##### `run(tasks?: string[]): Promise<Record<string, TaskResult>>`

Run tasks with the configured agent.

**Parameters:**
- `tasks` (optional): Array of task names to run. If not provided, uses the config settings.

**Returns:**
- Promise resolving to a record mapping task names to their results.

**Example:**
```typescript
const harness = new Harness({
    agent: new DemoAgent({ modelName: 'gpt-4o' }),
    taskName: 'v2.omnizon-1',
    headless: false,
});

const results = await harness.run();
console.log(results);
// {
//   'v2.omnizon-1': {
//     cum_reward: 1,
//     elapsed_time: 45.2,
//     n_steps: 12,
//     ...
//   }
// }
```

---

### DemoAgent

Built-in LLM-based agent supporting OpenAI, Anthropic, and OpenRouter.

#### Constructor

```typescript
new DemoAgent(config: DemoAgentConfig)
```

#### DemoAgentConfig

```typescript
interface DemoAgentConfig {
    // Required
    modelName: string;                 // Model identifier

    // Observation configuration
    useHtml?: boolean;                 // Include HTML. Default: false
    useAxtree?: boolean;               // Include accessibility tree. Default: true
    useScreenshot?: boolean;           // Include screenshots. Default: true

    // LLM configuration
    systemMessageHandling?: 'separate' | 'combined';  // Default: 'separate'
    thinkingBudget?: number;           // Thinking budget. Default: 10000

    // API Keys (uses environment variables by default)
    openaiApiKey?: string;             // OPENAI_API_KEY
    anthropicApiKey?: string;          // ANTHROPIC_API_KEY
    openrouterApiKey?: string;         // OPENROUTER_API_KEY
    openrouterSiteUrl?: string;        // OPENROUTER_SITE_URL
    openrouterSiteName?: string;       // OPENROUTER_SITE_NAME
}
```

#### Supported Models

**OpenAI:**
- `gpt-4o`, `gpt-4o-mini`
- `o1`, `o3`
- Any model starting with `gpt-`

**Anthropic:**
- `sonnet-3.7` → `claude-3-7-sonnet-20250219`
- `claude-opus-4` → `claude-opus-4-20250514`
- `claude-sonnet-4` → `claude-sonnet-4-20250514`
- Any model starting with `claude-`

**OpenRouter:**
- Use format: `openrouter/<provider>/<model>`
- Example: `openrouter/deepseek/deepseek-r1:free`

#### Methods

##### `getAction(obs: Observation): Promise<string>`

Get the next action based on observation.

**Parameters:**
- `obs`: Current observation

**Returns:**
- Promise resolving to an action string

##### `obsPreprocessor(obs: Observation): Observation`

Optional preprocessing of observations.

##### `close(): Promise<void>`

Optional cleanup when agent is done.

**Example:**
```typescript
const agent = new DemoAgent({
    modelName: 'gpt-4o',
    useAxtree: true,
    useScreenshot: true,
    useHtml: false,
});

// Use with harness
const harness = new Harness({ agent, taskName: 'v2.omnizon-1' });
const results = await harness.run();
```

---

### BrowserEnv

Low-level browser environment for custom control.

#### Constructor

```typescript
new BrowserEnv(config: BrowserEnvConfig)
```

#### BrowserEnvConfig

```typescript
interface BrowserEnvConfig {
    task: Task;                        // Task to run
    headless?: boolean;                // Default: true
    viewport?: { width: number; height: number };
    browserDimensions?: [number, number];
    maxSteps?: number;
    useHtml?: boolean;
    useAxtree?: boolean;
    useScreenshot?: boolean;
    slowMo?: number;                   // Slow down actions (ms)
}
```

#### Methods

##### `reset(): Promise<Observation>`

Reset the environment to initial state.

##### `step(action: string): Promise<{ obs: Observation; reward: number; done: boolean; info: any }>`

Execute an action and get the next observation.

##### `close(): Promise<void>`

Close the browser and clean up resources.

**Example:**
```typescript
const env = new BrowserEnv({
    task: myTask,
    headless: false,
    maxSteps: 25,
});

let obs = await env.reset();
let done = false;

while (!done) {
    const action = await agent.getAction(obs);
    const step = await env.step(action);
    obs = step.obs;
    done = step.done;
}

await env.close();
```

---

## Interfaces

### Agent Interface

Interface that all agents must implement.

```typescript
interface Agent {
    /**
     * Get the next action based on the current observation
     */
    getAction(obs: Observation): string | Promise<string>;

    /**
     * Optional preprocessing of observations
     */
    obsPreprocessor?(obs: Observation): Observation | Promise<Observation>;

    /**
     * Optional cleanup when agent is done
     */
    close?(): void | Promise<void>;
}
```

**Example:**
```typescript
class MyAgent implements Agent {
    async getAction(obs: Observation): Promise<string> {
        // Your agent logic
        return "click('123')";
    }

    async close(): Promise<void> {
        // Cleanup
    }
}
```

---

### Observation

Observation object containing the current state.

```typescript
interface Observation {
    // Page state
    url: string;                       // Current URL
    screenshot?: Buffer;               // Screenshot (if enabled)

    // Task information
    goal?: string;                     // Task goal (text)
    goal_object: GoalObject[];         // Structured goal

    // DOM representations
    dom_object?: DOMNode;              // Full DOM tree (if enabled)
    axtree_object?: AXNode;            // Accessibility tree (if enabled)

    // Action feedback
    last_action?: string;              // Last action taken
    last_action_error?: string;        // Error from last action

    // Chat (for interactive tasks)
    chat_messages?: ChatMessage[];     // Chat history

    // Internal (preprocessed)
    axtree_txt?: string;               // Flattened AXTree
    pruned_html?: string;              // Pruned HTML
    screenshot_base64?: string;        // Base64 screenshot
}

interface GoalObject {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: string | { url: string };
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'infeasible';
    message: string;
}
```

---

### TaskResult

Result of a task execution.

```typescript
interface TaskResult {
    cum_reward: number;                // Total reward (0-1)
    elapsed_time: number;              // Time in seconds
    n_steps: number;                   // Number of steps taken
    task_name: string;                 // Task identifier
    error?: string;                    // Error message (if failed)
    [key: string]: any;                // Additional metadata
}
```

---

## Utilities

### Action Space

The following actions are available:

```typescript
// Navigation
goto('https://example.com')           // Navigate to URL
go_back()                              // Navigate back
go_forward()                           // Navigate forward

// Interaction
click('bid')                           // Click element by BID
fill('bid', 'text')                    // Fill input field
hover('bid')                           // Hover over element
press('bid', 'Enter')                  // Press key on element
select_option('bid', 'value')          // Select dropdown option
scroll('bid', 'down')                  // Scroll element (up/down/left/right)

// Task control
send_msg_to_user('message')            // Send message to user
report_infeasible('reason')            // Report task as infeasible
```

### Observation Preprocessing

```typescript
import { flattenAXTreeToStr, flattenDOMToStr, pruneHTML } from '@agi-inc/agisdk';

// Flatten accessibility tree to string
const axtreeStr = flattenAXTreeToStr(obs.axtree_object);

// Flatten DOM to string
const domStr = flattenDOMToStr(obs.dom_object);

// Prune HTML for LLM consumption
const prunedHtml = pruneHTML(domStr);
```

---

## Leaderboard API

Submit results to the REAL benchmark leaderboard at [realevals.ai](https://www.realevals.ai).

### Getting API Credentials

1. **Create API Key**: Profile → API Keys in the portal
2. **Get Run ID**:
   ```bash
   curl "https://www.realevals.ai/api/runKey?api_key=<API_KEY>&model_name=<MODEL>&run_name=<RUN>"
   ```
   The response contains `newRunId`.

### Environment Variables

```bash
export REAL_API_KEY="your-api-key"
export REAL_RUN_ID="your-run-id"
export REAL_MODEL_NAME="gpt-4o"
export REAL_RUN_NAME="my-test-run"
```

### Submitting Results

```typescript
const harness = new Harness({
    agent: myAgent,
    taskName: 'v2.omnizon-1',
    leaderboard: true,
    runId: process.env.REAL_RUN_ID,
    apiKey: process.env.REAL_API_KEY,
    modelName: 'gpt-4o',
    runName: 'my-test-run',
});

const results = await harness.run();
// Results automatically submitted to leaderboard
```

### API Endpoints

#### Get Run ID

```
GET https://www.realevals.ai/api/runKey?api_key=<KEY>&model_name=<MODEL>&run_name=<NAME>
```

**Response:**
```json
{
  "newRunId": "uuid-here",
  "message": "Success"
}
```

#### Get Run Results

```
GET https://www.realevals.ai/api/getRunTask?api_key=<KEY>&display_name=<NAME>
```

**Response:**
```json
{
  "run_id": "uuid",
  "model_id": "model-id",
  "success_rate": 85.5,
  "total_runs": 20,
  "runs": [
    {
      "task_id": "omnizon-1",
      "evals_passed": 3,
      "evals_failed": 0,
      "points": 1.0,
      "accuracy": 100.0
    }
  ]
}
```

---

## TypeScript Types

Full TypeScript type definitions are available in the package:

```typescript
import type {
    Agent,
    Observation,
    TaskResult,
    HarnessConfig,
    DemoAgentConfig,
} from '@agi-inc/agisdk';
```

---

## Error Handling

```typescript
try {
    const results = await harness.run();
} catch (error) {
    if (error instanceof Error) {
        console.error('Task failed:', error.message);
    }
}
```

Common errors:
- `Agent must be provided` - No agent configured
- `No tasks found to run` - Invalid task configuration
- `Could not extract action` - LLM response parsing failed
- `Unsupported model` - Invalid model name

---

## Best Practices

1. **Always close agents**: Use `agent.close()` when done
2. **Handle errors**: Wrap `harness.run()` in try-catch
3. **Use type safety**: Leverage TypeScript types
4. **Cache tasks**: Set `useCache: true` for faster reruns
5. **Headless for CI**: Use `headless: true` in CI/CD
6. **Rate limits**: Be mindful of API rate limits

---

## See Also

- [Task Guide](./Task.md) - Understanding tasks and evaluations
- [Agent Guide](./manual_vs_basic_agent.md) - Building custom agents
- [Examples](../example/README.md) - Working examples
- [Main README](../README.md) - Getting started guide
