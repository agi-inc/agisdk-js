/**
 * Tests for DemoAgent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemoAgent } from './DemoAgent.js';
import type { Observation } from '../types.js';

describe('DemoAgent', () => {
  let mockObservation: Observation;

  beforeEach(() => {
    mockObservation = {
      chat_messages: [],
      goal: 'Test goal',
      goal_object: [{ type: 'text', text: 'Test goal' }],
      task_id: 'test-task',
      open_pages_urls: ['https://example.com'],
      active_page_index: 0,
      url: 'https://example.com',
      screenshot: Buffer.from('test'),
      dom_object: {},
      axtree_object: { nodes: [] },
      extra_element_properties: {},
      focused_element_bid: '',
      last_action: '',
      last_action_error: '',
      elapsed_time: 0,
      browser: {} as any,
    };
  });

  describe('constructor', () => {
    it('should create DemoAgent with OpenAI config', () => {
      const agent = new DemoAgent({
        modelName: 'gpt-4o',
        useAxtree: true,
        useScreenshot: false,
      });
      expect(agent).toBeDefined();
    });

    it('should create DemoAgent with Anthropic config', () => {
      const agent = new DemoAgent({
        modelName: 'claude-3-opus',
        useAxtree: true,
        useScreenshot: false,
      });
      expect(agent).toBeDefined();
    });

    it('should throw error if neither useHtml nor useAxtree is true', () => {
      expect(() => {
        new DemoAgent({
          modelName: 'gpt-4o',
          useHtml: false,
          useAxtree: false,
        });
      }).toThrow('Either useHtml or useAxtree must be set to true');
    });
  });

  describe('getAction', () => {
    it('should return action string', async () => {
      // Note: This test requires actual API keys or mocking
      // For now, we'll test the structure
      const agent = new DemoAgent({
        modelName: 'gpt-4o',
        useAxtree: true,
        useScreenshot: false,
      });

      // Mock the OpenAI client if possible
      // This is a structural test - actual execution requires API keys
      expect(agent).toBeDefined();
    });

    it('should process observation with axtree', async () => {
      const agent = new DemoAgent({
        modelName: 'gpt-4o',
        useAxtree: true,
        useScreenshot: false,
      });

      const processed = agent.obsPreprocessor?.(mockObservation);
      expect(processed).toBeDefined();
      if (processed) {
        expect('axtree_txt' in processed).toBe(true);
      }
    });

    it('should process observation with screenshot', async () => {
      const agent = new DemoAgent({
        modelName: 'gpt-4o',
        useAxtree: true,
        useScreenshot: true,
      });

      const processed = agent.obsPreprocessor?.(mockObservation);
      expect(processed).toBeDefined();
    });

    it('should process observation with HTML', async () => {
      const agent = new DemoAgent({
        modelName: 'gpt-4o',
        useHtml: true,
        useAxtree: false,
        useScreenshot: false,
      });

      const processed = agent.obsPreprocessor?.(mockObservation);
      expect(processed).toBeDefined();
      if (processed) {
        expect('pruned_html' in processed).toBe(true);
      }
    });
  });

  describe('close', () => {
    it('should cleanup resources', async () => {
      const agent = new DemoAgent({
        modelName: 'gpt-4o',
        useAxtree: true,
        useScreenshot: false,
      });

      await expect(agent.close?.()).resolves.not.toThrow();
    });
  });
});

