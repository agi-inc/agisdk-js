# Changelog

All notable changes to the AGI SDK (JavaScript/TypeScript) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.6] - 2025-12-05

### Added
- **WebCloneEvaluator**: Full evaluation system matching Python SDK parity
  - JMESPath-based evaluation for JSON state verification
  - LLM-based fuzzy matching evaluation
  - Python subprocess execution for custom eval scripts
  - Exact match evaluation
- **API Integration**: Complete leaderboard submission support
  - `getRunIdFromApi()` function for obtaining run IDs
  - `submitToRailway()` function for script-based task submission
  - Legacy `/submit` endpoint support
- **Enhanced WebCloneTask**: Full validation and leaderboard submission
  - Async `init()` method for API-based run_id initialization
  - Complete `validate()` implementation with evaluation
  - Script-based and standard leaderboard submission paths
- **Harness Improvements**: Async initialization for API credentials
- Comprehensive example directory with starter, custom, hackable, leaderboard, and run_simple examples
- Complete API documentation (API_DOCS.md, Task.md, manual_vs_basic_agent.md)
- ESLint configuration for code quality
- Prettier configuration for code formatting
- Enhanced CI workflow with linting, type-checking, and format checks
- CONTRIBUTING.md with contribution guidelines
- Production-ready project configuration

### Changed
- Package name standardized to `@theagicompany/agisdk`
- API endpoint updated to `realevals.ai`
- Version bumped to 0.3.5 for Python SDK parity

## [0.1.0] - 2025-01-21

### Added
- Initial release of AGI SDK for JavaScript/TypeScript
- Core classes: Harness, DemoAgent, BrowserEnv
- Task system with v1 and v2 task support
- Bundled web clone tasks (Omnizon, DashDish, Staynb, NetworkIn, etc.)
- Built-in LLM agent supporting OpenAI, Anthropic, and OpenRouter
- Browser automation via Playwright
- Observation preprocessing utilities
- Action execution system
- Leaderboard submission support
- TypeScript type definitions
- Basic documentation and README

### Features
- **Multi-model support**: OpenAI (GPT-4o, o1, o3), Anthropic (Claude), OpenRouter
- **Observation modes**: HTML, AXTree, Screenshot
- **Task bundling**: All tasks included in package
- **Type safety**: Full TypeScript support
- **Flexible API**: Support for custom agents

## [0.0.1] - 2025-01-15

### Added
- Project initialization
- Basic project structure
- TypeScript configuration
- Build system setup

---

## Release Notes

### Version 0.1.0

This is the first production release of the AGI SDK for JavaScript/TypeScript. It provides feature parity with the Python SDK and includes:

- **Complete API**: All core functionality for building and evaluating web agents
- **Examples**: Ready-to-use examples for quick start
- **Documentation**: Comprehensive docs for all features
- **Production quality**: ESLint, Prettier, CI/CD, proper testing

### Upgrading

When upgrading between versions, check this changelog for breaking changes and migration guides.

---

## Links

- [GitHub Repository](https://github.com/agi-inc/agisdk-js)
- [npm Package](https://www.npmjs.com/package/@theagicompany/agisdk)
- [Documentation](./docs/API_DOCS.md)
- [REAL Leaderboard](https://www.realevals.ai)
