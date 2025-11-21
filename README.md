# 🚀 AGI SDK (JavaScript/TypeScript)

<p align="center">
  <a href="https://arxiv.org/abs/2504.11543">📄 Paper</a> •
  <a href="https://www.theagi.company/blog/introducing-real-bench">📝 Blog</a> •
  <a href="https://www.theagi.company">🏢 AGI Inc</a> •
  <a href="https://www.realevals.ai">🏆 Leaderboard</a>
</p>

<p align="center">
  <b>Build, evaluate, and level up your AI agents for the real web.</b>
</p>

## ✨ What is AGI SDK?

**AGI SDK** is a toolkit for **building** and **evaluating** AI browser agents in real-world environments.

It powers [REAL Bench](https://realevals.xyz): the first high-fidelity benchmark for AI agents navigating modern websites like Amazon, DoorDash, Airbnb, and more.

🔹 **Train agents** to browse and interact with real apps  
🔹 **Benchmark agents** with robust, standardized tasks  
🔹 **Submit to the leaderboard** and see how your agents stack up!

> **Note:** This SDK is currently under active development. Core functionality is being implemented according to our implementation strategy.

## 🛠️ Installation

```bash
# Install the SDK
npm install @agi-inc/agisdk

# Install Playwright browser dependencies
npx playwright install --force

# Set your LLM API key (for LLM-based agents)
export OPENAI_API_KEY="your-api-key"   # or ANTHROPIC_API_KEY, etc.
```

✅ Supports OpenAI, Anthropic, OpenRouter, and custom models!

## ⏱️ Quick Start

```typescript
import { REAL } from '@agi-inc/agisdk';

// Create a custom agent
class MyAgent implements REAL.Agent {
    async getAction(obs: REAL.Observation): Promise<string> {
        // Your agent logic here
        return "click('123')";
    }
}

// Create harness
const harness = new REAL.Harness({
    agent: new MyAgent(),
    headless: false,
    taskType: 'omnizon'
});

// Run tasks
const results = await harness.run();
console.log(results);
```

## 🔥 Features

- Full-stack **web replicas** of top real-world apps (Amazon, Uber, Gmail, Airbnb, etc.)
- **Robust agent API**: Observations, Actions, Memory, Errors
- **Built-in LLM agent** supporting OpenAI, Anthropic, and OpenRouter
- **Customizable harness**: plug your own agents
- **TypeScript support**: Full type definitions included
- **Bundled tasks**: All tasks included in package (no external dependencies)

## 🌐 Available Tasks

The AGI SDK includes high-fidelity, fully-deterministic websites for agents to explore:

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

## 📚 Documentation

- [API Reference](./docs/API_DOCS.md) - Complete API documentation
- [Task Guide](./docs/Task.md) - Understanding tasks and evaluations
- [Agent Guide](./docs/manual_vs_basic_agent.md) - Building custom agents

## 🔄 Implementation Status

This SDK is being built in phases:

- ✅ **Phase 1**: Foundation & Core Types (Complete)
- 🚧 **Phase 2**: Task System & Bundling (In Progress)
- ⏳ **Phase 3**: Browser Environment
- ⏳ **Phase 4**: Action System
- ⏳ **Phase 5**: Built-in LLM Agent
- ⏳ **Phase 6**: Harness System
- ⏳ **Phase 7**: Evaluation System
- ⏳ **Phase 8**: Parallel Execution

## 🤝 Contributing

We welcome contributions of all kinds:
- 📢 Feature requests? [Open an Issue](https://github.com/agi-inc/agisdk-js/issues)
- 🐛 Bug reports? [Create a ticket](https://github.com/agi-inc/agisdk-js/issues)
- 🛠️ Submit code? Fork + PR - we love clean commits!

Let's build the future of agents together. 🔥

## 📄 License

Apache 2.0 - see LICENSE file for details.
