/**
 * Tests for Observation extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  markElements,
  unmarkElements,
  extractDOMSnapshot,
  extractAXTree,
  extractScreenshot,
  extractObservation,
} from './Observation.js';
import type { Page, CDPSession } from 'playwright';
import type { GoalObject, ChatMessage } from '../../types.js';

describe('Observation', () => {
  let mockPage: any;
  let mockCDPSession: any;
  let mockContext: any;
  let mockBrowser: any;

  beforeEach(() => {
    mockBrowser = {
      close: vi.fn(),
    };

    mockContext = {
      pages: vi.fn().mockReturnValue([mockPage]),
      browser: vi.fn().mockReturnValue(mockBrowser),
    };

    mockPage = {
      url: vi.fn().mockReturnValue('https://example.com'),
      evaluate: vi.fn().mockResolvedValue(''),
      context: vi.fn().mockReturnValue(mockContext),
    };

    mockCDPSession = {
      send: vi.fn().mockResolvedValue({
        data: Buffer.from('test').toString('base64'),
        nodes: [],
        documents: [],
        strings: [],
      }),
    };
  });

  describe('markElements', () => {
    it('should call page.evaluate with mark script', async () => {
      await markElements(mockPage);
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle standard_html tags', async () => {
      await markElements(mockPage, 'standard_html');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle all tags', async () => {
      await markElements(mockPage, 'all');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('unmarkElements', () => {
    it('should call page.evaluate with unmark script', async () => {
      await unmarkElements(mockPage);
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('extractDOMSnapshot', () => {
    it('should extract DOM snapshot from CDP session', async () => {
      const snapshot = await extractDOMSnapshot(mockCDPSession);
      expect(mockCDPSession.send).toHaveBeenCalledWith('DOMSnapshot.captureSnapshot', {
        computedStyles: [],
        includeDOMRects: true,
        includePaintOrder: true,
      });
      expect(snapshot).toBeDefined();
    });

    it('should handle custom options', async () => {
      await extractDOMSnapshot(mockCDPSession, false, false);
      expect(mockCDPSession.send).toHaveBeenCalledWith('DOMSnapshot.captureSnapshot', {
        computedStyles: [],
        includeDOMRects: false,
        includePaintOrder: false,
      });
    });
  });

  describe('extractAXTree', () => {
    it('should extract AX tree from CDP session', async () => {
      const tree = await extractAXTree(mockCDPSession);
      expect(mockCDPSession.send).toHaveBeenCalledWith('Accessibility.getFullAXTree');
      expect(tree).toBeDefined();
    });
  });

  describe('extractScreenshot', () => {
    it('should extract screenshot from CDP session', async () => {
      const screenshot = await extractScreenshot(mockCDPSession);
      expect(mockCDPSession.send).toHaveBeenCalledWith('Page.captureScreenshot', {
        format: 'png',
      });
      expect(Buffer.isBuffer(screenshot)).toBe(true);
    });

    it('should decode base64 to buffer', async () => {
      mockCDPSession.send.mockResolvedValue({
        data: Buffer.from('test image').toString('base64'),
      });
      const screenshot = await extractScreenshot(mockCDPSession);
      expect(Buffer.isBuffer(screenshot)).toBe(true);
    });
  });

  describe('extractObservation', () => {
    const goal: GoalObject[] = [{ type: 'text', text: 'Test goal' }];
    const chatMessages: ChatMessage[] = [];
    const startTime = Date.now();

    it('should extract complete observation', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime,
        'click("123")',
        '',
        false,
        true,
        true
      );

      expect(obs.goal).toBe('Test goal');
      expect(obs.goal_object).toEqual(goal);
      expect(obs.task_id).toBe('test-task');
      expect(obs.chat_messages).toEqual(chatMessages);
      expect(obs.url).toBe('https://example.com');
      expect(obs.last_action).toBe('click("123")');
      expect(obs.last_action_error).toBe('');
      expect(obs.elapsed_time).toBeGreaterThanOrEqual(0);
      expect(obs.browser).toBe(mockBrowser);
    });

    it('should handle string goal', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        'Simple goal',
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.goal).toBe('Simple goal');
      expect(obs.goal_object).toEqual([{ type: 'text', text: 'Simple goal' }]);
    });

    it('should extract focused element BID', async () => {
      mockPage.evaluate.mockResolvedValue('focused-bid-123');
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.focused_element_bid).toBe('focused-bid-123');
    });

    it('should handle empty focused element', async () => {
      mockPage.evaluate.mockResolvedValue('');
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.focused_element_bid).toBe('');
    });

    it('should calculate elapsed time', async () => {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        start
      );

      expect(obs.elapsed_time).toBeGreaterThan(0);
    });

    it('should handle multiple pages', async () => {
      const page2 = { url: vi.fn().mockReturnValue('https://example2.com') };
      mockContext.pages.mockReturnValue([mockPage, page2]);
      mockContext.pages.indexOf = vi.fn().mockReturnValue(0);

      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.open_pages_urls.length).toBe(2);
      expect(obs.active_page_index).toBe(0);
    });

    it('should skip HTML extraction when useHtml is false', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime,
        '',
        '',
        false,
        true,
        true
      );

      expect(obs.dom_object).toBeDefined();
    });

    it('should skip AXTree extraction when useAxtree is false', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime,
        '',
        '',
        false,
        false,
        true
      );

      expect(obs.axtree_object).toBeDefined();
    });

    it('should skip screenshot extraction when useScreenshot is false', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime,
        '',
        '',
        false,
        true,
        false
      );

      expect(Buffer.isBuffer(obs.screenshot)).toBe(true);
    });
  });
});

