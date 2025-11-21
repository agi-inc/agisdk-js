<p align="center">
  <h1 align="center">🚀 AGI SDK (JavaScript)</h1>
</p>


<p align="center">
  <a href="https://arxiv.org/abs/2504.11543">📄 Paper</a> •
  <a href="https://www.theagi.company/blog/introducing-real-bench">📝 Blog</a> •
  <a href="https://www.theagi.company">🏢 AGI Inc</a> •
  <a href="https://www.realevals.ai">🏆 Leaderboard</a>
</p>

<p align="center">
  <b>Build, evaluate, and level up your AI agents for the real web.</b>
</p>

# ✨ What is AGI SDK?

**AGI SDK** is a toolkit for **building** and **evaluating** AI browser agents in real-world environments.

It powers [REAL Bench](https://realevals.xyz): the first high-fidelity benchmark for AI agents navigating modern websites like Amazon, DoorDash, Airbnb, and more.

🔹 **Train agents** to browse and interact with real apps
🔹 **Benchmark agents** with robust, standardized tasks
🔹 **Submit to the leaderboard** and see how your agents stack up!

> **TL;DR**: Go from "idea" to "benchmarked agent" in <60 seconds

## 🛠️ Installation (30 s)

```bash
# Clone or download the repository
git clone https://github.com/agi-inc/agisdk-js.git
cd agisdk-js

# Install dependencies
npm install

# Install Playwright browser dependencies
npx playwright install --force

# Set your LLM API key (if using LLM-based agents)
export OPENAI_API_KEY="your-api-key"   # or ANTHROPIC_API_KEY, etc.
```

✅ Supports any LLM provider via custom agent implementations!

## ⏱️ 60-second Quick-Start

Here's a minimal example to get you started:

```typescript
import { REAL } from './src';

class MyAgent implements REAL.Agent {
    async getAction(obs: REAL.Obs): Promise<string> {
        // Your agent logic here
        return "click('123')";
    }
}

const agent = new MyAgent();
const harness = new REAL.Harness(agent, false); // headless = false

await harness.run("omnizon-3");
```

Need more examples? [See full examples ›](example/)

## 🔥 Features

- Full-stack **web replicas** of top real-world apps (Amazon, Uber, Gmail, Airbnb, etc.)
- **Robust agent API**: Observations, Actions, Memory, Errors
- **Leaderboard integration** (REAL Bench) - coming soon
- **Customizable harness**: plug your own agents
- **Multi-model support**: Works with any LLM via custom agents
- **TypeScript support**: Full type definitions included

## Running Custom Agents

Checkout the README.md in the `example` folder. There are several examples:

- `example/starter.ts`: A simple example to get you started
- `example/custom.ts`: A template for building your own agent
- `example/simple.ts`: Running multiple tasks sequentially
- `example/leaderboard.ts`: Leaderboard submission template

## Local Development

If you want to develop locally:

```bash
# Clone the repository
git clone https://github.com/agi-inc/agisdk-js.git
cd agisdk-js

# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npx ts-node example/starter.ts
```

## 🌐 Available Tasks

> **Versioning:** The SDK supports `v2` task sets. Tasks are referenced with the `v2.` prefix (e.g., `v2.omnizon-1`), but you can also use bare task IDs (e.g., `omnizon-1`) when loading tasks.

The AGI SDK includes high-fidelity, fully-deterministic websites for agents to explore. These are modern web stack sites (React + Next.js) with rich functionality for core user flows, realistic mock data, and consistent behavior for testing and evaluation.

The benchmark includes these environments:

| App Clone | Task Prefix | Example Use Case |
| :--- | :--- | :--- |
| 🛒 Amazon → Omnizon | `v2.omnizon-*` | Buy a laptop, find a gift |
| 🍔 DoorDash → DashDish | `v2.dashdish-*` | Order dinner |
| ✈️ United → FlyUnified | `v2.flyunified-*` | Book a flight |
| 🏡 Airbnb → Staynb | `v2.staynb-*` | Reserve accommodation |
| 📅 Google Calendar → GoCalendar | `v2.gocalendar-*` | Schedule a meeting |
| 📬 Gmail → GoMail | `v2.gomail-*` | Compose an email |
| 🍽️ OpenTable → OpenDining | `v2.opendining-*` | Book a restaurant |
| 👔 LinkedIn → NetworkIn | `v2.networkin-*` | Accept a connection |
| 🚗 Uber → Udriver | `v2.udriver-*` | Book a ride |
| 💼 UpWork → TopWork | `v2.topwork-*` | Find a freelance gig |
| 🏠 Zillow → Zilloft | `v2.zilloft-*` | Browse houses |

Each task comes with **human-written goals** designed to stress-test agent capabilities.

## 🔑 API Keys

To use LLM-based agents, set their respective API keys:

```bash
# For OpenAI models
export OPENAI_API_KEY="your-openai-api-key"

# For Anthropic models
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# For OpenRouter models
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

## 👁️ Observation Structure

Your agent gets access to the following observation structure:

```typescript
interface Obs {
    chat_messages: any[];          // History of chat messages
    goal: string;                   // Text description of the goal
    goal_object: any[];              // Structured goal object with text and images
    open_pages_urls: string[];      // List of open page URLs
    active_page_index: number;      // Index of the active page
    url: string;                    // Current URL
    screenshot: Buffer;             // Screenshot as Buffer
    dom_object: any;                // DOM structure (CDP DOMSnapshot)
    axtree_object: any;             // Accessibility tree (CDP AXTree)
    focused_element_bid: string;    // ID of the focused element
    last_action: string;            // Last action performed
    last_action_error: string;      // Error from last action (if any)
    elapsed_time: number;           // Time elapsed in the episode
    browser: Browser;               // Playwright browser object (for direct control)
}
```

## 🎯 Actions

Actions are specified as strings in the format of function calls. Here are some commonly used actions:

```typescript
// Navigation
"goto('https://www.google.com')"
"go_back()"
"go_forward()"

// Interaction
"click('element_id')"
"fill('input_id', 'text to enter')"
"press('Enter')"

// Communication
"send_msg_to_user('I found the answer: $42.99')"

// Reporting infeasible tasks
"report_infeasible('The requested item is out of stock')"
```

## ⚙️ Harness Configuration

The harness constructor accepts the following parameters:

```typescript
const harness = new REAL.Harness(
    agent,                    // Your agent instance (implements REAL.Agent)
    headless: false,          // Whether to show the browser
    taskDir?: string,         // Optional: custom task directory
    resultsDir: "./results"   // Where to store results
);

// Run tasks
await harness.run("v2.omnizon-1");           // Specific task
await harness.run(["v2.omnizon-1", "v2.dashdish-1"]); // Multiple tasks
```

## 🏆 Submitting to the REAL Leaderboard

> **Note:** Leaderboard submission is not yet fully implemented in the JavaScript SDK. This section describes the planned functionality.

1. **Create an API key** – use the leaderboard portal (Account → API Keys) to generate a key tied to your Supabase user.
2. **Mint a run ID** – use the API:
   ```bash
   curl "https://www.realevals.ai/api/runKey?api_key=<API_KEY>&model_name=<MODEL_NAME>&run_name=<RUN_NAME>"
   ```
   The JSON response returns `newRunId`.
3. **Run the harness** (when implemented):
   ```typescript
   const harness = new REAL.Harness(
       agent,
       false,
       undefined,
       "./results"
   );
   // Leaderboard submission will be added in a future release
   await harness.run("v2.omnizon-1");
   ```

## 🤝 Contributing

We welcome contributions of all kinds:
- 📢 Feature requests? [Open an Issue](https://github.com/agi-inc/agisdk-js/issues)
- 🐛 Bug reports? [Create a ticket](https://github.com/agi-inc/agisdk-js/issues)
- 🛠️ Submit code? Fork + PR - we love clean commits!

Let's build the future of agents together. 🔥

## 💬 Community

- [Join our Discord](https://discord.gg/c95EJDfXzx) (_coming soon!_)
- [Follow AGI Inc. on LinkedIn](https://www.linkedin.com/company/the-agi-company/)

## ⭐️ Why AGI SDK?

Because **your agents deserve better** than toy environments. <br>
Because **the real web is messy** and that's where the magic happens. <br>
Because **the future is agentic** and it starts here.

## 📚 Documentation

- [Examples](example/README.md) - Complete examples and tutorials
- [Task Documentation](docs/Task.md) - Understanding tasks and evaluations
- [API Documentation](docs/API_DOCS.md) - API reference
- [Agent Guide](docs/manual_vs_basic_agent.md) - Building custom agents

## 🔄 Differences from Python SDK

The JavaScript SDK maintains API compatibility with the Python SDK but has some differences:

1. **Custom Agents**: You implement the `REAL.Agent` interface directly
2. **No Built-in LLM Agent**: You need to integrate LLM APIs yourself (see examples)
3. **TypeScript Support**: Full type definitions included
4. **Task Directory**: Defaults to Python SDK's task directory (can be overridden)
5. **Leaderboard**: Submission coming soon

## 📄 License

ISC License - see LICENSE file for details.
