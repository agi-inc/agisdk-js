/**
 * Tests for type definitions and interfaces
 */

import { describe, it, expect } from 'vitest';
import type {
  ChatMessage,
  GoalObject,
  Observation,
  Agent,
  Task,
  TaskResult,
  HarnessConfig,
} from './types.js';
import type { Page } from 'playwright';

describe('Type Definitions', () => {
  describe('ChatMessage', () => {
    it('should accept valid chat message roles', () => {
      const messages: ChatMessage[] = [
        { role: 'user', message: 'Hello' },
        { role: 'assistant', message: 'Hi there' },
        { role: 'infeasible', message: 'Cannot complete' },
        { role: 'user_image', message: 'data:image/png;base64,...' },
      ];

      messages.forEach(msg => {
        expect(msg.role).toBeDefined();
        expect(msg.message).toBeDefined();
      });
    });
  });

  describe('GoalObject', () => {
    it('should accept text goal', () => {
      const goal: GoalObject = { type: 'text', text: 'Complete task' };
      expect(goal.type).toBe('text');
      expect(goal.text).toBe('Complete task');
    });

    it('should accept image URL goal', () => {
      const goal: GoalObject = {
        type: 'image_url',
        image_url: 'https://example.com/image.png',
      };
      expect(goal.type).toBe('image_url');
      expect(goal.image_url).toBeDefined();
    });

    it('should accept image URL with detail', () => {
      const goal: GoalObject = {
        type: 'image_url',
        image_url: { url: 'https://example.com/image.png', detail: 'high' },
      };
      expect(goal.type).toBe('image_url');
      if (typeof goal.image_url === 'object') {
        expect(goal.image_url.detail).toBe('high');
      }
    });
  });

  describe('Observation', () => {
    it('should have all required fields', () => {
      const obs: Observation = {
        chat_messages: [],
        goal: 'Test',
        goal_object: [{ type: 'text', text: 'Test' }],
        task_id: 'test',
        open_pages_urls: [],
        active_page_index: 0,
        url: 'https://example.com',
        screenshot: Buffer.from('test'),
        dom_object: {},
        axtree_object: {},
        extra_element_properties: {},
        focused_element_bid: '',
        last_action: '',
        last_action_error: '',
        elapsed_time: 0,
        browser: {} as any,
      };

      expect(obs.chat_messages).toBeDefined();
      expect(obs.goal).toBeDefined();
      expect(obs.goal_object).toBeDefined();
      expect(obs.task_id).toBeDefined();
      expect(obs.url).toBeDefined();
      expect(obs.screenshot).toBeDefined();
      expect(obs.dom_object).toBeDefined();
      expect(obs.axtree_object).toBeDefined();
      expect(obs.elapsed_time).toBeDefined();
      expect(obs.browser).toBeDefined();
    });
  });

  describe('Agent', () => {
    it('should implement getAction method', async () => {
      const agent: Agent = {
        async getAction(obs: Observation): Promise<string> {
          return 'noop()';
        },
      };

      const obs: Observation = {
        chat_messages: [],
        goal: 'Test',
        goal_object: [{ type: 'text', text: 'Test' }],
        task_id: 'test',
        open_pages_urls: [],
        active_page_index: 0,
        url: 'https://example.com',
        screenshot: Buffer.from('test'),
        dom_object: {},
        axtree_object: {},
        extra_element_properties: {},
        focused_element_bid: '',
        last_action: '',
        last_action_error: '',
        elapsed_time: 0,
        browser: {} as any,
      };

      const action = await agent.getAction(obs);
      expect(action).toBe('noop()');
    });

    it('should support optional obsPreprocessor', () => {
      const agent: Agent = {
        obsPreprocessor(obs: Observation): Observation {
          return obs;
        },
        async getAction(_obs: Observation): Promise<string> {
          return 'noop()';
        },
      };

      expect(agent.obsPreprocessor).toBeDefined();
    });

    it('should support optional close method', async () => {
      const agent: Agent = {
        async getAction(_obs: Observation): Promise<string> {
          return 'noop()';
        },
        async close(): Promise<void> {
          // Cleanup
        },
      };

      await expect(agent.close?.()).resolves.not.toThrow();
    });
  });

  describe('Task', () => {
    it('should implement required methods', async () => {
      const task: Task = {
        async setup(_page: Page): Promise<[string, Record<string, any>]> {
          return ['Goal', {}];
        },
        async teardown(): Promise<void> {
          // Cleanup
        },
        async validate(
          _page: Page,
          _chatMessages: ChatMessage[]
        ): Promise<[number, boolean, string, Record<string, any>]> {
          return [1, true, '', {}];
        },
      };

      const mockPage = {} as Page;
      const [goal] = await task.setup(mockPage);
      expect(goal).toBe('Goal');
      await expect(task.teardown()).resolves.not.toThrow();
      const [reward, done] = await task.validate(mockPage, []);
      expect(reward).toBe(1);
      expect(done).toBe(true);
    });
  });

  describe('TaskResult', () => {
    it('should have all required fields', () => {
      const result: TaskResult = {
        cum_reward: 1,
        elapsed_time: 10.5,
        exp_dir: './results/test',
        num_steps: 5,
        success: true,
      };

      expect(result.cum_reward).toBe(1);
      expect(result.elapsed_time).toBe(10.5);
      expect(result.exp_dir).toBeDefined();
      expect(result.num_steps).toBe(5);
      expect(result.success).toBe(true);
    });

    it('should support optional error fields', () => {
      const result: TaskResult = {
        cum_reward: 0,
        elapsed_time: 5,
        exp_dir: './results/failed',
        num_steps: 3,
        success: false,
        err_msg: 'Error occurred',
        stack_trace: 'Stack trace here',
      };

      expect(result.err_msg).toBe('Error occurred');
      expect(result.stack_trace).toBe('Stack trace here');
    });
  });

  describe('HarnessConfig', () => {
    it('should accept all configuration options', () => {
      const config: HarnessConfig = {
        agent: {
          async getAction(_obs: Observation): Promise<string> {
            return 'noop()';
          },
        },
        taskName: 'v2.omnizon-1',
        taskType: 'omnizon',
        taskId: 1,
        taskVersion: 'v2',
        headless: true,
        maxSteps: 25,
        useHtml: false,
        useAxtree: true,
        useScreenshot: true,
        browserDimensions: [1280, 720],
        viewport: { width: 1280, height: 720 },
        resultsDir: './results',
        numWorkers: 1,
        useCache: true,
        cacheOnly: false,
        forceRefresh: false,
        sampleTasks: 1,
        leaderboard: false,
        runId: 'test-run-id',
        apiKey: 'test-api-key',
        runName: 'test-run',
        modelIdName: 'gpt-4o',
      };

      expect(config.agent).toBeDefined();
      expect(config.taskName).toBeDefined();
      expect(config.headless).toBe(true);
    });
  });
});

