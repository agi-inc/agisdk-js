# 🚀 AGI SDK (JavaScript/TypeScript)

<p align="center">
  <a href="https://www.npmjs.com/package/@agi-inc/agisdk"><img src="https://img.shields.io/npm/v/@agi-inc/agisdk?color=blue" alt="npm version"></a>
  <a href="https://github.com/agi-inc/agisdk-js/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://github.com/agi-inc/agisdk-js/actions"><img src="https://img.shields.io/github/actions/workflow/status/agi-inc/agisdk-js/ci.yml?branch=main" alt="CI Status"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9-blue" alt="TypeScript"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js"></a>
</p>

<p align="center">
  <a href="https://arxiv.org/abs/2504.11543">📄 Paper</a> •
  <a href="https://www.theagi.company/blog/introducing-real-bench">📝 Blog</a> •
  <a href="https://www.theagi.company">🏢 AGI Inc</a> •
  <a href="https://www.realevals.ai">🏆 Leaderboard</a> •
  <a href="./docs/API_DOCS.md">📚 API Docs</a> •
  <a href="./example/README.md">💡 Examples</a>
</p>

<p align="center">
  <b>Build, evaluate, and level up your AI agents for the real web.</b>
</p>

---

## ✨ What is AGI SDK?

**AGI SDK** is a production-ready toolkit for **building** and **evaluating** AI browser agents in real-world environments.

It powers [REAL Bench](https://realevals.ai): a high-fidelity benchmark for AI agents navigating modern websites like Amazon, DoorDash, Airbnb, and more.

🔹 **Train agents** to browse and interact with real apps
🔹 **Benchmark agents** with robust, standardized tasks
🔹 **Submit to the leaderboard** and see how your agents stack up!

**Features:**
- ✅ Full TypeScript support with complete type definitions
- ✅ Built-in LLM agent (OpenAI, Anthropic, OpenRouter)
- ✅ 140+ bundled real-world tasks across 11 website clones
- ✅ Flexible custom agent API
- ✅ Production-ready with comprehensive documentation
- ✅ Leaderboard integration for benchmarking

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

## ⚡ Quick Start

### Using the Built-in Agent

```typescript
import { REAL } from '@agi-inc/agisdk';

// Set your API key
process.env.OPENAI_API_KEY = 'your-api-key';

// Create agent with built-in LLM
const agent = new REAL.DemoAgent({
    modelName: 'gpt-4o',
    useAxtree: true,
    useScreenshot: true,
});

// Create harness
const harness = new REAL.Harness({
    agent,
    taskName: 'v2.omnizon-1',
    headless: false,
});

// Run task
const results = await harness.run();
console.log(results);
```

### Building a Custom Agent

```typescript
import { REAL } from '@agi-inc/agisdk';

class MyAgent implements REAL.Agent {
    async getAction(obs: REAL.Observation): Promise<string> {
        // Your custom logic here
        if (obs.url?.includes('product')) {
            return "click('add-to-cart')";
        }
        return "send_msg_to_user('Task complete')";
    }
}

const harness = new REAL.Harness({
    agent: new MyAgent(),
    taskName: 'v2.omnizon-1',
});

const results = await harness.run();
```

See [examples/](./example/README.md) for more detailed examples.

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

Comprehensive documentation is available:

- **[API Reference](./docs/API_DOCS.md)** - Complete API documentation for all classes and methods
- **[Task Guide](./docs/Task.md)** - Understanding tasks, evaluation, and task configuration
- **[Agent Guide](./docs/manual_vs_basic_agent.md)** - Building custom agents and understanding DemoAgent
- **[Examples](./example/README.md)** - Working examples with detailed explanations
- **[Contributing](./CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[Changelog](./CHANGELOG.md)** - Version history and release notes

## 📖 Learning Resources

- **New to the SDK?** Start with [example/starter.ts](./example/starter.ts)
- **Building a custom agent?** See [example/custom.ts](./example/custom.ts)
- **Want advanced features?** Check out [example/hackable.ts](./example/hackable.ts)
- **Submitting to leaderboard?** Follow [example/leaderboard.ts](./example/leaderboard.ts)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

**Ways to contribute:**
- 📢 Feature requests and ideas
- 🐛 Bug reports and fixes
- 📝 Documentation improvements
- 💡 New examples and tutorials
- 🧪 Test coverage improvements

**Development setup:**
```bash
git clone https://github.com/agi-inc/agisdk-js.git
cd agisdk-js
npm install
npm run build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 💬 Community & Support

- **Issues**: [GitHub Issues](https://github.com/agi-inc/agisdk-js/issues)
- **Discussions**: [GitHub Discussions](https://github.com/agi-inc/agisdk-js/discussions)
- **Website**: [AGI Inc](https://www.theagi.company)
- **Leaderboard**: [REAL Bench](https://www.realevals.ai)

## 🌟 Show Your Support

If you find this project useful, please consider:
- ⭐ Starring the repository
- 🐦 Sharing on social media
- 📝 Writing about your experience
- 🤝 Contributing to the project

## 📄 License

Apache 2.0 - see LICENSE file for details.
