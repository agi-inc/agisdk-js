# AGI SDK Examples

This directory contains example implementations demonstrating how to use the AGI SDK for building and testing web agents in TypeScript/JavaScript. Each example showcases different approaches to agent implementation and configuration.

## Available Examples

### 1. `starter.ts`

The simplest agent implementation that works with any model. This is the best starting point for beginners.

**Features:**
- Minimal implementation using the built-in DemoAgent
- Multiple configuration options for flexibility
- Easy to understand and modify
- Works with OpenAI, Anthropic, and OpenRouter models

**How to run:**
```bash
# Install dependencies
npm install

# Set your API key
export OPENAI_API_KEY="your-api-key"    # or ANTHROPIC_API_KEY

# Run with default settings
npx tsx example/starter.ts

# Run with custom model or configuration
npx tsx example/starter.ts --model gpt-4o --task v2.omnizon-1 --headless false
```

### 2. `custom.ts`

Boilerplate code for creating your own custom agent. Use this as a template when implementing your own agent logic.

**Features:**
- Basic structure for a custom agent implementation
- Minimal code needed to get started
- Clear instructions for extending functionality
- TypeScript interfaces for type safety

**How to run:**
```bash
# Run the custom agent example
npx tsx example/custom.ts
```

### 3. `hackable.ts`

A more advanced, feature-rich agent implementation designed for others to use and improve. This is our recommended agent for most use cases.

**Features:**
- Detailed agent implementation with observation preprocessing
- Support for different model backends (OpenAI, Anthropic, OpenRouter)
- Configurable agent parameters via command-line arguments
- Extensive documentation and examples
- Leaderboard submission support

**How to run:**
```bash
# Run with default configuration
npx tsx example/hackable.ts

# Run with custom parameters
npx tsx example/hackable.ts \
  --model gpt-4o \
  --task v2.omnizon-1 \
  --headless false \
  --use-html true \
  --use-axtree true \
  --use-screenshot true \
  --leaderboard true \
  --run-id your-run-id
```

### 4. `leaderboard.ts`

Example demonstrating how to submit results to the REAL benchmark leaderboard.

**Features:**
- Leaderboard submission configuration
- Environment variable support
- Result tracking and display

**How to run:**
```bash
# Set environment variables
export REAL_API_KEY="your-api-key"
export REAL_RUN_ID="your-run-id"
export REAL_MODEL_NAME="gpt-4o"
export REAL_RUN_NAME="my-test-run"
export OPENAI_API_KEY="your-openai-key"

# Run the example
npx tsx example/leaderboard.ts

# Or pass via command-line
npx tsx example/leaderboard.ts \
  --api-key "your-api-key" \
  --run-id "your-run-id" \
  --model-name "gpt-4o" \
  --run-name "my-test-run"
```

### 5. `run_simple.ts`

Run multiple tasks in sequence to benchmark agent performance across different scenarios.

**Features:**
- Batch task execution
- Performance tracking and statistics
- Configurable task list

**How to run:**
```bash
# Set your API key
export OPENAI_API_KEY="your-key"

# Run with default settings
npx tsx example/run_simple.ts

# Run with custom model
npx tsx example/run_simple.ts --model gpt-4o
```

## Submitting Examples to the REAL Leaderboard

1. **Create an API key** inside the portal (Profile → API Keys).
2. **Get a run ID**:
   - From the portal UI: Profile → Create Run, then copy the `run_id` from the runs table.
   - Or via the API:
     ```bash
     curl "https://www.realevals.ai/api/runKey?api_key=<API_KEY>&model_name=<MODEL>&run_name=<RUN>"
     ```
     The `newRunId` field in the response is your run identifier. You can override the base domain by setting `REAL_API_BASE=https://...` before running the SDK.
3. **Set environment variables** so the examples submit automatically:
   ```bash
   export REAL_API_KEY=<API_KEY>
   export REAL_RUN_ID=<newRunId>
   export REAL_MODEL_NAME=<MODEL>
   export REAL_RUN_NAME=<RUN>
   ```
   Skip these variables if you want to run locally without submitting.
4. Run the example (e.g., `npx tsx example/leaderboard.ts`). The harness uses those values, sets `RUNID`, and the clone will forward results to the leaderboard. Inside the SDK reference tasks as `v2.omnizon-1`; when querying portal APIs use the bare id (`omnizon-1`).

## Harness Configuration

Most examples use the REAL harness, which accepts various configuration parameters:

```typescript
import { REAL } from '@agi-inc/agisdk';

const harness = new REAL.Harness({
    // Agent configuration
    agent: new REAL.DemoAgent({
        modelName: 'gpt-4o',           // OpenAI models
        // or 'sonnet-3.7'             // Anthropic models
        // or 'openrouter/deepseek/deepseek-r1:free'  // OpenRouter models
        useAxtree: true,
        useScreenshot: true,
        useHtml: false,
    }),

    // Task selection (provide one of these)
    taskName: 'v2.omnizon-1',         // Specific task to run
    // taskType: 'omnizon',           // Run all tasks of this type
    // taskId: 1,                     // Run specific task ID within a type

    // Browser configuration
    headless: false,                   // Whether to show the browser
    maxSteps: 25,                      // Maximum number of steps

    // Observation options
    useHtml: false,                    // Include HTML in observations
    useAxtree: true,                   // Include accessibility tree
    useScreenshot: true,               // Include screenshots

    // Leaderboard submission
    leaderboard: false,                // Whether to submit to leaderboard
    runId: 'my_unique_id',             // Unique ID for the submission
    apiKey: 'your-api-key',            // API key for leaderboard

    // Execution options
    // numWorkers: 4,                  // Number of parallel workers (future)
});

// Run tasks
const results = await harness.run();
```

## Creating Your Own Agent

To create your own agent:

1. Implement the `Agent` interface:
   ```typescript
   class MyAgent implements REAL.Agent {
       async getAction(obs: Observation): Promise<string> {
           // Your agent logic here
           return "click('123')";
       }

       async close(): Promise<void> {
           // Optional cleanup
       }
   }
   ```

2. Use your agent with the harness:
   ```typescript
   const harness = new REAL.Harness({
       agent: new MyAgent(),
       taskName: 'v2.omnizon-1',
       headless: false,
   });

   const results = await harness.run();
   ```

See the `MyCustomAgent` class in `custom.ts` or the `DemoAgent` class in the SDK source for implementation examples.

## Using Different Models

The AGI SDK supports various model providers through the `DemoAgent`:

- **OpenAI**: Set `modelName: 'gpt-4o'` or other OpenAI models
- **Anthropic**: Set `modelName: 'sonnet-3.7'` or other Anthropic models
- **OpenRouter**: Set `modelName: 'openrouter/deepseek/deepseek-r1:free'` for Deepseek R1 or other models

Make sure you have the appropriate API keys set in your environment variables:

```bash
# For OpenAI models
export OPENAI_API_KEY="your-openai-api-key"

# For Anthropic models
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# For OpenRouter models
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

## Running Examples

All examples support TypeScript execution using `tsx`:

```bash
# Install tsx globally (optional)
npm install -g tsx

# Or use npx
npx tsx example/starter.ts
```

For production use, compile the TypeScript first:

```bash
npm run build
node dist/example/starter.js
```

## Troubleshooting

### Import Errors

If you get import errors, make sure you've built the SDK first:

```bash
npm run build
```

### API Key Errors

Make sure your API keys are set:

```bash
# Check if API key is set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Set if missing
export OPENAI_API_KEY="your-key-here"
```

### Playwright Browser Not Found

Install Playwright browsers:

```bash
npx playwright install --force
```

## Additional Resources

- [API Documentation](../docs/API_DOCS.md) - Complete API reference
- [Task Guide](../docs/Task.md) - Understanding tasks and evaluations
- [Agent Guide](../docs/manual_vs_basic_agent.md) - Building custom agents
- [Main README](../README.md) - General SDK information
