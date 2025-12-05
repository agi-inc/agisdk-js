# Tasks in AGI SDK

Tasks are the foundation of agent evaluation in the AGI SDK. They define browser-based challenges that AI agents must complete to demonstrate their capabilities in real-world web environments.

## Task Structure

Tasks are defined in JSON format with the following structure:

```json
{
  "id": "unique-task-id",
  "goal": "Human-readable description of what the agent should accomplish",
  "website": {
    "id": "website-id",
    "name": "Website Name",
    "similarTo": "Real-world equivalent (e.g., LinkedIn, Amazon)",
    "previewImage": "/path/to/preview/image.jpg",
    "url": "https://website-url.example.com/"
  },
  "difficulty": "easy|medium|hard",
  "challengeType": "retrieval|generation|navigation",
  "possible": true,
  "evals": [
    {
      "description": "Evaluation criteria description",
      "type": "jmespath|llm_boolean",
      "query": "jmespath.query.string",
      "expected_value": "expected result"
    }
  ],
  "points": 1,
  "config": {}
}
```

### Key Fields

- **id**: Unique identifier for the task (e.g., "staynb-1", "omnizon-3")
- **goal**: Human-readable instructions describing what the agent should accomplish
- **website**: Information about the website the agent will interact with
  - **id**: Website identifier (e.g., "networkin", "omnizon")
  - **name**: Display name for the website
  - **similarTo**: Real-world equivalent (e.g., "LinkedIn", "Amazon")
  - **url**: URL where the website is hosted
- **difficulty**: Relative difficulty rating ("easy", "medium", "hard")
- **challengeType**: Category of challenge ("retrieval", "generation", "navigation")
- **evals**: Array of evaluation criteria that determine if the task was completed successfully
- **points**: Points awarded for completing the task

## Task Versions

The AGI SDK supports two task versions:

### Version 1 (v1)

- Original task format
- Reference as: `v1.omnizon-1`, `v1.dashdish-3`
- Simpler evaluation criteria

### Version 2 (v2) - Recommended

- Enhanced task definitions
- More comprehensive evaluation
- Better error reporting
- Reference as: `v2.omnizon-1`, `v2.dashdish-3`

**Always use v2 tasks unless you have a specific reason to use v1.**

## Evaluation Mechanisms

Tasks are evaluated through two primary mechanisms:

### JMESPath Evaluations

JMESPath queries check specific values in the environment state:

```json
{
  "description": "Exactly one post was modified in the feed",
  "type": "jmespath",
  "query": "length(feedPostsDiff.modified)",
  "expected_value": 1
}
```

**Example in TypeScript:**
```typescript
// The evaluation is performed automatically by the task system
// Your agent just needs to perform the correct actions
const action = "click('123')";  // Click the right element
```

### LLM Boolean Evaluations

LLM evaluations use an AI model to determine if the agent's response meets criteria:

```json
{
  "description": "Email contains all required information",
  "type": "llm_boolean",
  "query": "Did the email contain all the requested information?",
  "context_key": "emailContent"
}
```

## Available Tasks

The AGI SDK includes tasks across multiple website clones:

| Website | Task Prefix | Count | Example Tasks |
|---------|-------------|-------|---------------|
| Omnizon (Amazon) | `v2.omnizon-*` | 20+ | Product search, add to cart, checkout |
| DashDish (DoorDash) | `v2.dashdish-*` | 15+ | Restaurant search, order food |
| Staynb (Airbnb) | `v2.staynb-*` | 10+ | Search properties, book accommodation |
| NetworkIn (LinkedIn) | `v2.networkin-*` | 20+ | Post updates, connect with users |
| GoMail (Gmail) | `v2.gomail-*` | 10+ | Compose and send emails |
| GoCalendar | `v2.gocalendar-*` | 8+ | Schedule meetings, manage calendar |
| OpenDining (OpenTable) | `v2.opendining-*` | 12+ | Restaurant reservations |
| Udriver (Uber) | `v2.udriver-*` | 10+ | Book rides, estimate fares |
| TopWork (UpWork) | `v2.topwork-*` | 8+ | Find freelance jobs |
| Zilloft (Zillow) | `v2.zilloft-*` | 15+ | Browse properties, search homes |

## Running Tasks

### Running a Specific Task

```typescript
import { REAL } from '@theagicompany/agisdk';

const agent = new REAL.DemoAgent({ modelName: 'gpt-4o' });

const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',  // Specific task
    headless: false,
});

const results = await harness.run();
console.log(results);
```

### Running All Tasks of a Type

```typescript
const harness = new REAL.Harness({
    agent,
    taskType: 'omnizon',       // All Omnizon tasks
    taskVersion: 'v2',
    headless: true,
});

const results = await harness.run();
```

### Running Multiple Specific Tasks

```typescript
const tasks = [
    'v2.omnizon-1',
    'v2.omnizon-2',
    'v2.dashdish-1',
];

const harness = new REAL.Harness({
    agent,
    headless: true,
});

const results = await harness.run(tasks);
```

## Task Results

Results are returned as a record mapping task names to their outcomes:

```typescript
{
  'v2.omnizon-1': {
    cum_reward: 1,          // 1 = success, 0 = failure
    elapsed_time: 45.2,     // Time in seconds
    n_steps: 12,            // Number of steps taken
    task_name: 'v2.omnizon-1',
    // ... additional metadata
  }
}
```

### Interpreting Results

- **cum_reward**: Total reward (0-1). A value of 1 means all evaluation criteria passed.
- **elapsed_time**: Total time spent on the task in seconds.
- **n_steps**: Number of actions the agent took.
- **error**: If present, contains error message explaining failure.

## Task Discovery

### List All Available Tasks

```typescript
import { getAllTasks } from '@theagicompany/agisdk';

const allTasks = getAllTasks('v2');
console.log(allTasks);  // Array of all v2 task names
```

### Filter Tasks by Type

```typescript
import { getTasksByType } from '@theagicompany/agisdk';

const omnizonTasks = getTasksByType('omnizon', 'v2');
console.log(omnizonTasks);  // All v2.omnizon-* tasks
```

## Task Configuration

### Observation Options

Configure what information the agent receives:

```typescript
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
    useAxtree: true,        // Accessibility tree (recommended)
    useHtml: false,         // Raw HTML (expensive)
    useScreenshot: true,    // Visual screenshot (recommended)
});
```

### Step Limits

Control maximum steps per task:

```typescript
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
    maxSteps: 25,           // Default: 25
});
```

## Task Caching

Tasks can be cached for faster repeated runs:

```typescript
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
    useCache: true,         // Use cached task data
    cacheOnly: false,       // Only use cache (fail if not cached)
    forceRefresh: false,    // Force refresh cache
});
```

## Leaderboard Submission

Submit task results to the REAL benchmark leaderboard:

```typescript
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
    leaderboard: true,
    runId: process.env.REAL_RUN_ID,
    apiKey: process.env.REAL_API_KEY,
    modelName: 'gpt-4o',
    runName: 'my-test-run',
});

const results = await harness.run();
// Results automatically submitted to https://www.realevals.ai
```

See the [Leaderboard Example](../example/leaderboard.ts) for complete setup instructions.

## Task Examples

### E-commerce Task (Omnizon)

```typescript
// Task: Find a laptop under $1000 and add to cart
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-5',
});

const results = await harness.run();
```

### Calendar Task (GoCalendar)

```typescript
// Task: Schedule a meeting for next Tuesday at 2pm
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.gocalendar-3',
});

const results = await harness.run();
```

### Social Network Task (NetworkIn)

```typescript
// Task: Post an update about a new project
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.networkin-7',
});

const results = await harness.run();
```

## Debugging Tasks

### Visual Debugging

Run with browser visible to watch the agent:

```typescript
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
    headless: false,        // Show browser
    slowMo: 100,            // Slow down actions (ms)
});
```

### Verbose Logging

Enable detailed logging:

```typescript
import { setLogLevel } from '@theagicompany/agisdk';

setLogLevel('debug');  // Show all debug information

const results = await harness.run();
```

## Best Practices

1. **Start with v2 tasks**: Always use the latest task version
2. **Use AXTree + Screenshot**: Best balance of information and performance
3. **Test locally first**: Use `headless: false` to debug
4. **Respect rate limits**: Don't overwhelm the LLM API
5. **Cache task data**: Use `useCache: true` for faster iteration
6. **Handle errors**: Wrap `harness.run()` in try-catch

## See Also

- [API Documentation](./API_DOCS.md) - Complete API reference
- [Agent Guide](./manual_vs_basic_agent.md) - Building custom agents
- [Examples](../example/README.md) - Working examples
- [Main README](../README.md) - Getting started guide
