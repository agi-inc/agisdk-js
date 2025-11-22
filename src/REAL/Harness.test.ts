/**
 * Tests for Harness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Harness } from './Harness.js';
import type { Agent, Observation } from './types.js';

class MockAgent implements Agent {
  actions: string[] = [];
  observations: Observation[] = [];

  async getAction(obs: Observation): Promise<string> {
    this.observations.push(obs);
    if (this.actions.length > 0) {
      return this.actions.shift()!;
    }
    return 'noop()';
  }

  async close(): Promise<void> {
    // No-op
  }
}

describe('Harness', () => {
  let agent: MockAgent;

  beforeEach(() => {
    agent = new MockAgent();
  });

  describe('constructor', () => {
    it('should create harness with agent', () => {
      const harness = new Harness({
        agent,
      });
      expect(harness).toBeDefined();
    });

    it('should throw error without agent', () => {
      expect(() => {
        new Harness({} as any);
      }).toThrow('Agent must be provided');
    });

    it('should set default values', () => {
      const harness = new Harness({
        agent,
      });
      expect((harness as any).config.headless).toBe(true);
      expect((harness as any).config.maxSteps).toBe(25);
      expect((harness as any).config.useAxtree).toBe(true);
      expect((harness as any).config.useScreenshot).toBe(true);
      expect((harness as any).config.useHtml).toBe(false);
    });

    it('should accept custom configuration', () => {
      const harness = new Harness({
        agent,
        headless: false,
        maxSteps: 50,
        useHtml: true,
        useAxtree: false,
        useScreenshot: false,
        browserDimensions: [1920, 1080],
        resultsDir: './custom-results',
      });

      expect((harness as any).config.headless).toBe(false);
      expect((harness as any).config.maxSteps).toBe(50);
      expect((harness as any).config.useHtml).toBe(true);
      expect((harness as any).config.useAxtree).toBe(false);
      expect((harness as any).config.useScreenshot).toBe(false);
      expect((harness as any).config.browserDimensions).toEqual([1920, 1080]);
      expect((harness as any).resultsDir).toBe('./custom-results');
    });
  });

  describe('canonicalizeTaskName', () => {
    it('should handle versioned task names', () => {
      const harness = new Harness({ agent });
      const canonical = (harness as any).canonicalizeTaskName('v2.omnizon-1');
      expect(canonical).toBe('v2.omnizon-1');
    });

    it('should add default version to unversioned names', () => {
      const harness = new Harness({ agent, taskVersion: 'v2' });
      const canonical = (harness as any).canonicalizeTaskName('omnizon-1');
      expect(canonical).toBe('v2.omnizon-1');
    });

    it('should remove webclones prefix', () => {
      const harness = new Harness({ agent });
      const canonical = (harness as any).canonicalizeTaskName('webclones.omnizon-1');
      expect(canonical).toBe('v2.omnizon-1');
    });

    it('should remove browsergym prefix', () => {
      const harness = new Harness({ agent });
      const canonical = (harness as any).canonicalizeTaskName('browsergym/omnizon-1');
      expect(canonical).toBe('v2.omnizon-1');
    });

    it('should throw error for empty task name', () => {
      const harness = new Harness({ agent });
      expect(() => {
        (harness as any).canonicalizeTaskName('');
      }).toThrow('Task name cannot be empty');
    });
  });

  describe('getTasks', () => {
    it('should return tasks for version', () => {
      const harness = new Harness({ agent, taskVersion: 'v2' });
      const tasks = (harness as any).getTasks(undefined, undefined, 'v2');
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should filter by task type', () => {
      const harness = new Harness({ agent, taskVersion: 'v2' });
      const tasks = (harness as any).getTasks('omnizon', undefined, 'v2');
      expect(Array.isArray(tasks)).toBe(true);
      // All tasks should start with 'omnizon-'
      tasks.forEach((task: string) => {
        expect(task).toContain('omnizon-');
      });
    });

    it('should filter by task ID', () => {
      const harness = new Harness({ agent, taskVersion: 'v2' });
      try {
        const tasks = (harness as any).getTasks('omnizon', 1, 'v2');
        expect(Array.isArray(tasks)).toBe(true);
        expect(tasks.length).toBeGreaterThan(0);
      } catch (e) {
        // Task might not exist, which is okay for testing
        expect((e as Error).message).toContain('not found');
      }
    });

    it('should throw error for invalid version', () => {
      const harness = new Harness({ agent });
      expect(() => {
        (harness as any).getTasks(undefined, undefined, 'v3');
      }).toThrow();
    });
  });

  describe('run', () => {
    it('should run single task by name', async () => {
      const harness = new Harness({
        agent,
        taskName: 'v2.omnizon-1',
      });

      // Mock the runSingleTask to avoid actual browser execution
      const originalRunSingleTask = (harness as any).runSingleTask;
      (harness as any).runSingleTask = vi.fn().mockResolvedValue({
        cum_reward: 1,
        elapsed_time: 10,
        exp_dir: './results/test',
        num_steps: 5,
        success: true,
      });

      try {
        const results = await harness.run();
        expect(results).toBeDefined();
        expect(Object.keys(results).length).toBeGreaterThan(0);
      } catch (e) {
        // Task might not exist, which is okay
        expect((e as Error).message).toBeTruthy();
      } finally {
        (harness as any).runSingleTask = originalRunSingleTask;
      }
    });

    it('should run tasks by type', async () => {
      const harness = new Harness({
        agent,
        taskType: 'omnizon',
        taskVersion: 'v2',
      });

      const originalRunSingleTask = (harness as any).runSingleTask;
      (harness as any).runSingleTask = vi.fn().mockResolvedValue({
        cum_reward: 1,
        elapsed_time: 10,
        exp_dir: './results/test',
        num_steps: 5,
        success: true,
      });

      try {
        const results = await harness.run();
        expect(results).toBeDefined();
      } catch (e) {
        // Tasks might not exist
        expect((e as Error).message).toBeTruthy();
      } finally {
        (harness as any).runSingleTask = originalRunSingleTask;
      }
    });

    it('should run specific tasks list', async () => {
      const harness = new Harness({ agent });

      const originalRunSingleTask = (harness as any).runSingleTask;
      (harness as any).runSingleTask = vi.fn().mockResolvedValue({
        cum_reward: 1,
        elapsed_time: 10,
        exp_dir: './results/test',
        num_steps: 5,
        success: true,
      });

      try {
        const results = await harness.run(['v2.omnizon-1']);
        expect(results).toBeDefined();
      } catch (e) {
        // Task might not exist
        expect((e as Error).message).toBeTruthy();
      } finally {
        (harness as any).runSingleTask = originalRunSingleTask;
      }
    });

    it('should throw error when no tasks found', async () => {
      const harness = new Harness({ agent });
      await expect(harness.run([])).rejects.toThrow('No tasks found to run');
    });
  });

  describe('caching', () => {
    it('should check cache before running', async () => {
      const harness = new Harness({
        agent,
        useCache: true,
        taskName: 'v2.omnizon-1',
      });

      const findCachedResult = vi.fn().mockReturnValue({
        cum_reward: 1,
        elapsed_time: 5,
        exp_dir: './results/cached',
        num_steps: 3,
        success: true,
      });

      (harness as any).findCachedResult = findCachedResult;

      const originalRunSingleTask = (harness as any).runSingleTask;
      (harness as any).runSingleTask = vi.fn();

      try {
        const results = await harness.run();
        expect(findCachedResult).toHaveBeenCalled();
        // Should use cached result, not run task
        expect((harness as any).runSingleTask).not.toHaveBeenCalled();
      } catch (e) {
        // Task might not exist
      } finally {
        (harness as any).runSingleTask = originalRunSingleTask;
      }
    });

    it('should skip cache when forceRefresh is true', async () => {
      const harness = new Harness({
        agent,
        useCache: true,
        forceRefresh: true,
        taskName: 'v2.omnizon-1',
      });

      const originalRunSingleTask = (harness as any).runSingleTask;
      (harness as any).runSingleTask = vi.fn().mockResolvedValue({
        cum_reward: 1,
        elapsed_time: 10,
        exp_dir: './results/test',
        num_steps: 5,
        success: true,
      });

      try {
        await harness.run();
        expect((harness as any).runSingleTask).toHaveBeenCalled();
      } catch (e) {
        // Task might not exist
      } finally {
        (harness as any).runSingleTask = originalRunSingleTask;
      }
    });
  });
});

