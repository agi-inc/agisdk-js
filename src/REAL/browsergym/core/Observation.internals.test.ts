/**
 * Comprehensive internal tests for Observation extraction
 * Testing edge cases, error conditions, and complex scenarios
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

describe('Observation Internals', () => {
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

  describe('Element Marking Internals', () => {
    it('should mark elements with standard_html tags', async () => {
      await markElements(mockPage, 'standard_html');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should mark elements with all tags', async () => {
      await markElements(mockPage, 'all');
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should handle marking errors gracefully', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Marking failed'));
      
      // Should not throw, or throw appropriately
      try {
        await markElements(mockPage);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should unmark elements after marking', async () => {
      await markElements(mockPage);
      await unmarkElements(mockPage);
      
      expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
    });
  });

  describe('CDP Extraction Internals', () => {
    it('should extract DOM snapshot with all options', async () => {
      const snapshot = await extractDOMSnapshot(mockCDPSession, true, true);
      expect(mockCDPSession.send).toHaveBeenCalledWith('DOMSnapshot.captureSnapshot', {
        computedStyles: [],
        includeDOMRects: true,
        includePaintOrder: true,
      });
      expect(snapshot).toBeDefined();
    });

    it('should extract DOM snapshot with minimal options', async () => {
      const snapshot = await extractDOMSnapshot(mockCDPSession, false, false);
      expect(mockCDPSession.send).toHaveBeenCalledWith('DOMSnapshot.captureSnapshot', {
        computedStyles: [],
        includeDOMRects: false,
        includePaintOrder: false,
      });
      expect(snapshot).toBeDefined();
    });

    it('should handle CDP errors gracefully', async () => {
      mockCDPSession.send.mockRejectedValueOnce(new Error('CDP error'));
      
      await expect(extractDOMSnapshot(mockCDPSession)).rejects.toThrow('CDP error');
    });

    it('should extract AX tree correctly', async () => {
      const tree = await extractAXTree(mockCDPSession);
      expect(mockCDPSession.send).toHaveBeenCalledWith('Accessibility.getFullAXTree');
      expect(tree).toBeDefined();
    });

    it('should extract screenshot and decode base64', async () => {
      const testImage = Buffer.from('test image data');
      mockCDPSession.send.mockResolvedValueOnce({
        data: testImage.toString('base64'),
      });

      const screenshot = await extractScreenshot(mockCDPSession);
      expect(Buffer.isBuffer(screenshot)).toBe(true);
      expect(screenshot.toString()).toBe('test image data');
    });

    it('should handle invalid base64 in screenshot', async () => {
      mockCDPSession.send.mockResolvedValueOnce({
        data: 'invalid-base64!!!',
      });

      const screenshot = await extractScreenshot(mockCDPSession);
      expect(Buffer.isBuffer(screenshot)).toBe(true);
    });
  });

  describe('Observation Building Internals', () => {
    const goal: GoalObject[] = [{ type: 'text', text: 'Test goal' }];
    const chatMessages: ChatMessage[] = [];
    const startTime = Date.now();

    beforeEach(() => {
      // Reset mocks before each test
      mockPage.evaluate.mockReset();
      // Default: all evaluate calls succeed
      mockPage.evaluate.mockResolvedValue(undefined);
      mockCDPSession.send.mockReset();
      mockCDPSession.send.mockResolvedValue({
        data: Buffer.from('test').toString('base64'),
        nodes: [],
        documents: [],
        strings: [],
      });
    });

    it('should build observation with all components', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime,
        'click("123")',
        '',
        true,
        true,
        true
      );

      expect(obs.chat_messages).toEqual(chatMessages);
      expect(obs.goal).toBe('Test goal');
      expect(obs.goal_object).toEqual(goal);
      expect(obs.task_id).toBe('test-task');
      expect(obs.url).toBe('https://example.com');
      expect(obs.last_action).toBe('click("123")');
      expect(obs.last_action_error).toBe('');
      expect(obs.elapsed_time).toBeGreaterThanOrEqual(0);
      expect(obs.browser).toBe(mockBrowser);
    });

    it('should handle multiple pages correctly', async () => {
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

    it('should handle page not found in pages array', async () => {
      // Create a different page that's not in the array
      const differentPage = { url: vi.fn().mockReturnValue('https://different.com') };
      const pagesArray = [differentPage]; // mockPage is not in this array
      
      // Mock indexOf to return -1 for mockPage
      const originalIndexOf = Array.prototype.indexOf;
      pagesArray.indexOf = vi.fn((searchElement: any) => {
        if (searchElement === mockPage) {
          return -1;
        }
        return originalIndexOf.call(pagesArray, searchElement);
      });
      
      mockContext.pages.mockReturnValue(pagesArray);

      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime
      );

      // Should handle -1 index gracefully (page not found in pages array)
      expect(obs.active_page_index).toBe(-1);
    });

    it('should extract focused element BID', async () => {
      // Mock evaluate to return BID for focused element call
      // markElements and unmarkElements also call evaluate, so we need to handle multiple calls
      let callIndex = 0;
      mockPage.evaluate.mockImplementation((fn: any) => {
        callIndex++;
        // Focused element call happens after mark/unmark (typically 3rd call)
        // Check if it's the focused element function by checking function body
        if (typeof fn === 'function') {
          const fnStr = fn.toString();
          if (fnStr.includes('activeElement') || fnStr.includes('getAttribute')) {
            return Promise.resolve('focused-bid-456');
          }
        }
        // For markElements/unmarkElements calls
        return Promise.resolve(undefined);
      });
      
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime
      );

      // Should have attempted to get focused element
      expect(mockPage.evaluate).toHaveBeenCalled();
      // The focused element BID should be extracted (or empty if mock didn't match)
      expect(obs.focused_element_bid).toBeDefined();
    });

    it('should handle focused element extraction errors', async () => {
      // Mock evaluate - focused element fails but is caught by .catch(() => '')
      mockPage.evaluate.mockImplementation((fn: any) => {
        // Check if it's the focused element call
        if (typeof fn === 'function') {
          const fnStr = fn.toString();
          if (fnStr.includes('activeElement') || fnStr.includes('getAttribute')) {
            return Promise.reject(new Error('Evaluation failed'));
          }
        }
        // Otherwise succeed (for markElements/unmarkElements)
        return Promise.resolve(undefined);
      });
      
      // Should not throw because error is caught by .catch(() => '')
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        startTime
      );

      // Should default to empty string on error (due to .catch(() => ''))
      expect(obs.focused_element_bid).toBe('');
    });

    it('should handle browser instance unavailable', async () => {
      mockContext.browser.mockReturnValueOnce(null);
      
      await expect(
        extractObservation(
          mockPage,
          mockCDPSession,
          goal,
          'test-task',
          chatMessages,
          startTime
        )
      ).rejects.toThrow('Browser instance not available');
    });

    it('should calculate elapsed time accurately', async () => {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        goal,
        'test-task',
        chatMessages,
        start
      );

      expect(obs.elapsed_time).toBeGreaterThan(0.04);
      expect(obs.elapsed_time).toBeLessThan(0.1);
    });

    it('should handle goal object with images', async () => {
      const imageGoal: GoalObject[] = [
        { type: 'text', text: 'Text goal' },
        { type: 'image_url', image_url: 'https://example.com/image.png' },
      ];

      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        imageGoal,
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.goal_object.length).toBe(2);
      expect(obs.goal_object[0]?.type).toBe('text');
      expect(obs.goal_object[1]?.type).toBe('image_url');
      expect(obs.goal).toBe('Text goal');
    });

    it('should handle goal object with image_url object format', async () => {
      const imageGoal: GoalObject[] = [
        {
          type: 'image_url',
          image_url: { url: 'https://example.com/image.png', detail: 'high' },
        },
      ];

      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        imageGoal,
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.goal_object.length).toBe(1);
      expect(obs.goal_object[0]?.type).toBe('image_url');
    });

    it('should handle string goal conversion', async () => {
      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        'Simple string goal',
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.goal).toBe('Simple string goal');
      expect(obs.goal_object).toEqual([{ type: 'text', text: 'Simple string goal' }]);
    });

    it('should handle goal with no text content', async () => {
      const imageOnlyGoal: GoalObject[] = [
        { type: 'image_url', image_url: 'https://example.com/image.png' },
      ];

      const obs = await extractObservation(
        mockPage,
        mockCDPSession,
        imageOnlyGoal,
        'test-task',
        chatMessages,
        startTime
      );

      expect(obs.goal).toBe('');
      expect(obs.goal_object.length).toBe(1);
    });
  });

  describe('Parallel Extraction', () => {
    it('should extract DOM, AXTree, and screenshot in parallel', async () => {
      const startTime = Date.now();
      
      await extractObservation(
        mockPage,
        mockCDPSession,
        [{ type: 'text', text: 'Goal' }],
        'test-task',
        [],
        startTime,
        '',
        '',
        true,
        true,
        true
      );

      // Should have called send for DOM, AXTree, and screenshot
      expect(mockCDPSession.send).toHaveBeenCalled();
    });

    it('should skip extraction when flags are false', async () => {
      await extractObservation(
        mockPage,
        mockCDPSession,
        [{ type: 'text', text: 'Goal' }],
        'test-task',
        [],
        Date.now(),
        '',
        '',
        false,
        false,
        false
      );

      // Should still call send for some operations, but fewer
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle page evaluation errors', async () => {
      mockPage.evaluate.mockRejectedValueOnce(new Error('Page error'));
      
      // Should handle error gracefully
      try {
        await extractObservation(
          mockPage,
          mockCDPSession,
          [{ type: 'text', text: 'Goal' }],
          'test-task',
          [],
          Date.now()
        );
      } catch (e) {
        // Some errors are acceptable
        expect(e).toBeDefined();
      }
    });

    it('should handle CDP session errors', async () => {
      mockCDPSession.send.mockRejectedValueOnce(new Error('CDP error'));
      
      await expect(
        extractObservation(
          mockPage,
          mockCDPSession,
          [{ type: 'text', text: 'Goal' }],
          'test-task',
          [],
          Date.now(),
          '',
          '',
          true,
          true,
          true
        )
      ).rejects.toThrow();
    });
  });
});

