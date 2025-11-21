# AGI SDK Examples

This directory contains example implementations demonstrating how to use the AGI SDK for building and testing web agents. Each example showcases different approaches to agent implementation and configuration.

## Available Examples

### 1. `starter.ts`

The simplest agent implementation that demonstrates basic usage. This is the best starting point for beginners.

**Features:**
- Minimal implementation
- Easy to understand and modify
- Shows basic agent interface

**How to run:**
```bash
# Run with ts-node
npx ts-node example/starter.ts

# Or compile and run
npm run build
node dist/example/starter.js
```

### 2. `custom.ts`

Boilerplate code for creating your own custom agent. Use this as a template when implementing your own agent logic.

**Features:**
- Basic structure for a custom agent implementation
- Minimal code needed to get started
- Clear instructions for extending functionality

**How to run:**
```bash
npx ts-node example/custom.ts
```

### 3. `simple.ts`

A simple example running multiple tasks sequentially.

**Features:**
- Runs multiple tasks in sequence
- Shows how to iterate over tasks
- Displays results for each task

**How to run:**
```bash
npx ts-node example/simple.ts
```

### 4. `leaderboard.ts`

Example showing how to submit results to the REAL leaderboard.

**Features:**
- Leaderboard submission configuration
- API key and run ID management
- Result submission

**How to run:**
```bash
# Set environment variables first
export REAL_API_KEY="your-api-key"
export REAL_RUN_ID="your-run-id"

npx ts-node example/leaderboard.ts
```

## Harness Configuration

The harness accepts various configuration parameters:

```typescript
const harness = new REAL.Harness(
    agent,                    // Your agent instance
    headless: false,          // Whether to show the browser
    taskDir?: string,         // Optional: custom task directory
    resultsDir: "./results"  // Where to save results
);

// Run a specific task
await harness.run("omnizon-3");

// Run multiple tasks
await harness.run(["omnizon-3", "dashdish-1"]);
```

## Creating Your Own Agent

To create your own agent:

1. Implement the `REAL.Agent` interface:
   ```typescript
   class MyAgent implements REAL.Agent {
       async getAction(obs: REAL.Obs): Promise<string> {
           // Process observation and return action string
           return "click('123')";
       }
   }
   ```

2. Use your agent with the harness:
   ```typescript
   const agent = new MyAgent();
   const harness = new REAL.Harness(agent, false);
   await harness.run("omnizon-3");
   ```

See `custom.ts` for a complete implementation example.

## Supported Actions

- `click(bid)` - Click element by BID
- `fill(bid, text)` - Fill input by BID
- `goto(url)` - Navigate to URL
- `go_back()` - Browser back
- `go_forward()` - Browser forward
- `press(bid, key)` or `press(key)` - Press key
- `scroll(x, y)` - Scroll page
- `send_msg_to_user(text)` - Send message to chat
- `report_infeasible(reason)` - Report task as infeasible

## Observation Structure

Your agent receives observations with the following structure:

```typescript
interface Obs {
    chat_messages: any[];
    goal: string;
    goal_object: any[];
    open_pages_urls: string[];
    active_page_index: number;
    url: string;
    screenshot: Buffer;
    dom_object: any;  // CDP DOMSnapshot
    axtree_object: any;  // CDP AXTree
    focused_element_bid: string;
    last_action: string;
    last_action_error: string;
    elapsed_time: number;
    browser: Browser;
}
```

## Task Directory

By default, the SDK looks for tasks in:
```
../../agisdk/src/agisdk/REAL/browsergym/webclones/v2/tasks
```

You can override this by passing a `taskDir` parameter to the harness constructor.

## Results

Results are saved in the `results/` directory (or your specified `resultsDir`):
- Screenshots: `screenshot_step_N.png`
- Step info: `step_N.json`

Each task run creates a unique directory named `{taskId}_{runId}/`.

