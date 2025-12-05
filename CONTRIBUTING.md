# Contributing to AGI SDK

Thank you for your interest in contributing to the AGI SDK! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agisdk-js.git
   cd agisdk-js
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/agi-inc/agisdk-js.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers

```bash
npx playwright install --with-deps chromium
```

### Build the Project

```bash
npm run build
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes

### 2. Make Changes

- Write clear, concise code
- Follow the code style guidelines
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format

# Build
npm run build
```

### 4. Commit Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add new task filtering feature"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

- Go to the original repository on GitHub
- Click "New Pull Request"
- Select your fork and branch
- Fill out the PR template
- Submit the PR

## Code Style

We use ESLint and Prettier to enforce code style.

### TypeScript Guidelines

- Use TypeScript for all new code
- Provide type annotations for function parameters and return types
- Avoid `any` types when possible
- Use interfaces for object shapes
- Export types that might be used by consumers

### Code Formatting

Run Prettier before committing:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

### Linting

Run ESLint to check for issues:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint:fix
```

### Code Quality Checklist

- [ ] Code follows TypeScript best practices
- [ ] All functions have JSDoc comments
- [ ] Types are properly defined
- [ ] No console.logs (use logger instead)
- [ ] Error handling is implemented
- [ ] Code is formatted with Prettier
- [ ] ESLint passes with no errors
- [ ] TypeScript compilation succeeds

## Testing

### Running Tests

Currently, the SDK uses manual testing via examples. We're working on adding automated tests.

### Testing Checklist

When making changes, test:

- [ ] Build succeeds: `npm run build`
- [ ] Type check passes: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] Examples run correctly
- [ ] Changes work with different LLM providers (if applicable)
- [ ] Documentation is updated

## Submitting Changes

### Pull Request Guidelines

1. **One PR per feature/fix** - Keep PRs focused on a single change
2. **Update documentation** - Update docs if you change APIs
3. **Add examples** - Include examples for new features
4. **Write tests** - Add tests for new functionality (when test infrastructure is ready)
5. **Update CHANGELOG** - Add an entry to CHANGELOG.md

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Examples updated (if applicable)
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Delete your branch after merge

## Reporting Issues

### Bug Reports

When reporting bugs, include:

- **Clear title** - Summarize the issue
- **Description** - Detailed explanation
- **Steps to reproduce** - How to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Node version, SDK version
- **Code sample** - Minimal reproducible example

### Feature Requests

When requesting features, include:

- **Use case** - Why is this needed?
- **Proposed solution** - How should it work?
- **Alternatives** - Other approaches considered
- **Additional context** - Any other relevant information

### Issue Labels

- `bug` - Something isn't working
- `feature` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed

## Project Structure

```
agisdk-js/
├── src/                    # Source code
│   ├── REAL/              # Main SDK code
│   │   ├── browsergym/    # Browser environment
│   │   ├── demo_agent/    # Built-in agent
│   │   ├── Harness.ts     # Main orchestrator
│   │   └── types.ts       # TypeScript types
│   └── index.ts           # Package entry point
├── example/               # Usage examples
├── docs/                  # Documentation
├── dist/                  # Build output (generated)
├── .github/               # GitHub workflows
└── tests/                 # Tests (future)
```

## Development Tips

### Useful Commands

```bash
# Clean build artifacts
npm run clean

# Rebuild from scratch
npm run clean && npm run build

# Watch mode (manual - use nodemon or similar)
npx nodemon --watch src --exec "npm run build"

# Run an example
npm run build
npx tsx example/starter.ts

# Format all files
npm run format

# Fix lint issues
npm run lint:fix
```

### Debugging

- Use `headless: false` to watch the browser
- Add `console.log` statements (but remove before committing)
- Use the TypeScript debugger in VS Code
- Check the `dist/` output to see compiled code

### Common Issues

**Issue**: Import errors
- **Solution**: Run `npm run build` to regenerate types

**Issue**: Playwright browser not found
- **Solution**: Run `npx playwright install --with-deps chromium`

**Issue**: TypeScript errors in examples
- **Solution**: Examples use `@theagicompany/agisdk` which may not be published yet. For local development, use relative imports or `npm link`.

## Questions?

- Open an issue on GitHub
- Check existing issues and PRs
- Read the documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

Thank you for contributing to AGI SDK! 🎉
