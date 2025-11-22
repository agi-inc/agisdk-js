/**
 * Tests for Task interface
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbstractBrowserTask } from './Task.js';
import type { Page } from 'playwright';
import type { ChatMessage } from '../../types.js';

describe('AbstractBrowserTask', () => {
  class TestTask extends AbstractBrowserTask {
    async setup(_page: Page): Promise<[string, Record<string, any>]> {
      return ['Test goal', {}];
    }

    async teardown(): Promise<void> {
      // No-op
    }

    async validate(
      _page: Page,
      _chatMessages: ChatMessage[]
    ): Promise<[number, boolean, string, Record<string, any>]> {
      return [1, true, '', {}];
    }
  }

  let mockPage: any;
  let task: TestTask;

  beforeEach(() => {
    mockPage = {
      url: vi.fn().mockReturnValue('https://example.com'),
      goto: vi.fn().mockResolvedValue(undefined),
    };
    task = new TestTask();
  });

  it('should implement setup method', async () => {
    const [goal, info] = await task.setup(mockPage);
    expect(goal).toBe('Test goal');
    expect(info).toEqual({});
  });

  it('should implement teardown method', async () => {
    await expect(task.teardown()).resolves.not.toThrow();
  });

  it('should implement validate method', async () => {
    const [reward, done, message, info] = await task.validate(mockPage, []);
    expect(reward).toBe(1);
    expect(done).toBe(true);
    expect(message).toBe('');
    expect(info).toEqual({});
  });

  it('should throw error when cheat is called without implementation', async () => {
    await expect(task.cheat(mockPage, [])).rejects.toThrow('Cheat method not implemented');
  });

  it('should allow cheat to be overridden', async () => {
    class CheatableTask extends TestTask {
      async cheat(_page: Page, _chatMessages: ChatMessage[]): Promise<void> {
        // Custom cheat implementation
      }
    }

    const cheatableTask = new CheatableTask();
    await expect(cheatableTask.cheat(mockPage, [])).resolves.not.toThrow();
  });
});

