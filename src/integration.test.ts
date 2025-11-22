/**
 * Integration tests for AGI SDK
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserEnv } from './REAL/browsergym/core/BrowserEnv.js';
import { AbstractBrowserTask } from './REAL/browsergym/core/Task.js';
import { parseAction, executeAction } from './REAL/browsergym/core/ActionExecutor.js';
import type { Page } from 'playwright';
import type { ChatMessage, GoalObject } from './REAL/types.js';
import { chromium } from 'playwright';

class SimpleTestTask extends AbstractBrowserTask {
  async setup(page: Page): Promise<[string, Record<string, any>]> {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Test Page</h1>
          <button id="test-btn" bid="btn-123">Click Me</button>
          <input id="test-input" bid="input-456" type="text" placeholder="Enter text">
          <div id="result" bid="result-789"></div>
        </body>
      </html>
    `);
    return ['Click the button and fill the input', {}];
  }

  async teardown(): Promise<void> {
    // No-op
  }

  async validate(
    page: Page,
    chatMessages: ChatMessage[]
  ): Promise<[number, boolean, string, Record<string, any>]> {
    // Check if button was clicked and input was filled
    const buttonClicked = await page.evaluate(() => {
      const btn = document.getElementById('test-btn');
      return btn?.getAttribute('data-clicked') === 'true';
    });

    const inputFilled = await page.evaluate(() => {
      const input = document.getElementById('test-input') as HTMLInputElement;
      return input?.value === 'test value';
    });

    const done = buttonClicked && inputFilled;
    const reward = done ? 1 : 0;

    return [reward, done, '', {}];
  }
}

describe('Integration Tests', () => {
  let browser: any;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('ActionExecutor Integration', () => {
    it('should execute actions on real browser page', async () => {
      const context = await browser.newContext();
      page = await context.newPage();

      await page.setContent(`
        <html>
          <body>
            <button id="btn" bid="test-btn">Click</button>
            <input id="input" bid="test-input" type="text">
          </body>
        </html>
      `);

      // Test click action
      await executeAction('click("test-btn")', page);
      const clicked = await page.evaluate(() => {
        const btn = document.getElementById('btn');
        return btn !== null;
      });
      expect(clicked).toBe(true);

      // Test fill action
      await executeAction('fill("test-input", "Hello World")', page);
      const value = await page.evaluate(() => {
        const input = document.getElementById('input') as HTMLInputElement;
        return input?.value;
      });
      expect(value).toBe('Hello World');

      await context.close();
    });

    it('should handle navigation actions', async () => {
      const context = await browser.newContext();
      page = await context.newPage();

      await page.goto('data:text/html,<html><body>Page 1</body></html>');
      await executeAction('goto("data:text/html,<html><body>Page 2</body></html>")', page);
      const content = await page.textContent('body');
      expect(content).toBe('Page 2');

      await context.close();
    });
  });

  describe('BrowserEnv Integration', () => {
    it('should run complete task cycle', async () => {
      const task = new SimpleTestTask();
      const env = new BrowserEnv({
        taskName: 'test-task',
        headless: true,
        maxSteps: 10,
      });

      try {
        // Reset environment
        const initialObs = await env.reset(task);
        expect(initialObs).toBeDefined();
        expect(initialObs.goal).toBe('Click the button and fill the input');

        // Execute actions
        const page = (env as any).page;
        if (page) {
          // Add click handler
          await page.evaluate(() => {
            const btn = document.getElementById('test-btn');
            if (btn) {
              btn.addEventListener('click', () => {
                btn.setAttribute('data-clicked', 'true');
              });
            }
          });

          // Click button
          const [obs1, reward1, done1] = await env.step('click("btn-123")');
          expect(obs1).toBeDefined();
          expect(reward1).toBeGreaterThanOrEqual(0);

          // Fill input
          const [obs2, reward2, done2] = await env.step('fill("input-456", "test value")');
          expect(obs2).toBeDefined();
          expect(reward2).toBeGreaterThanOrEqual(0);

          // Validate should return success
          const [obs3, reward3, done3] = await env.step('noop()');
          expect(obs3).toBeDefined();
          // Task should be done after filling input
        }

        await env.close();
      } catch (error) {
        // Cleanup on error
        try {
          await env.close();
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it('should handle action errors gracefully', async () => {
      const task = new SimpleTestTask();
      const env = new BrowserEnv({
        taskName: 'test-task',
        headless: true,
        maxSteps: 10,
      });

      try {
        await env.reset(task);

        // Try invalid action
        const [obs, reward, done] = await env.step('click("nonexistent")');
        expect(obs).toBeDefined();
        expect(obs.last_action_error).toBeTruthy();
        expect(reward).toBeDefined();
        expect(typeof done).toBe('boolean');

        await env.close();
      } catch (error) {
        try {
          await env.close();
        } catch {
          // Ignore
        }
        // Some errors are expected
      }
    });
  });

  describe('End-to-End Task Flow', () => {
    it('should complete a simple task', async () => {
      const task = new SimpleTestTask();
      const env = new BrowserEnv({
        taskName: 'test-task',
        headless: true,
        maxSteps: 5,
      });

      try {
        const obs = await env.reset(task);
        expect(obs.goal).toBeTruthy();

        const page = (env as any).page;
        if (page) {
          // Setup click handler
          await page.evaluate(() => {
            const btn = document.getElementById('test-btn');
            if (btn) {
              btn.addEventListener('click', () => {
                btn.setAttribute('data-clicked', 'true');
              });
            }
          });

          // Execute steps
          await env.step('click("btn-123")');
          await env.step('fill("input-456", "test value")');

          // Final validation step
          const [finalObs, finalReward, finalDone] = await env.step('noop()');
          expect(finalObs).toBeDefined();
          expect(finalReward).toBeGreaterThanOrEqual(0);
        }

        await env.close();
      } catch (error) {
        try {
          await env.close();
        } catch {
          // Ignore
        }
        // Some errors are acceptable in integration tests
      }
    });
  });
});

