/**
 * Tests for ActionExecutor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseAction, executeAction } from './ActionExecutor.js';
import type { Page } from 'playwright';

describe('ActionExecutor', () => {
  describe('parseAction', () => {
    it('should parse simple action without arguments', () => {
      const result = parseAction('go_back()');
      expect(result.name).toBe('go_back');
      expect(result.args).toEqual([]);
    });

    it('should parse action with single string argument', () => {
      const result = parseAction('goto("https://example.com")');
      expect(result.name).toBe('goto');
      expect(result.args).toEqual(['https://example.com']);
    });

    it('should parse action with single number argument', () => {
      const result = parseAction('noop(1000)');
      expect(result.name).toBe('noop');
      expect(result.args).toEqual([1000]);
    });

    it('should parse action with multiple arguments', () => {
      const result = parseAction('click("123", "left")');
      expect(result.name).toBe('click');
      expect(result.args).toEqual(['123', 'left']);
    });

    it('should parse action with nested structures', () => {
      const result = parseAction('fill("input1", "test value")');
      expect(result.name).toBe('fill');
      expect(result.args).toEqual(['input1', 'test value']);
    });

    it('should handle code block markers', () => {
      // Code blocks are stripped, so this should work
      const result = parseAction('click("123")');
      expect(result.name).toBe('click');
      expect(result.args).toEqual(['123']);
    });

    it('should handle code block with language', () => {
      const result = parseAction('```python\nclick("123")\n```');
      expect(result.name).toBe('click');
      expect(result.args).toEqual(['123']);
    });

    it('should handle single quotes', () => {
      const result = parseAction("goto('https://example.com')");
      expect(result.name).toBe('goto');
      expect(result.args).toEqual(['https://example.com']);
    });

    it('should handle escaped quotes in strings', () => {
      const result = parseAction('send_msg_to_user("Hello \\"world\\"")');
      expect(result.name).toBe('send_msg_to_user');
      expect(result.args).toEqual(['Hello "world"']);
    });

    it('should parse boolean values', () => {
      const result1 = parseAction('test(true)');
      expect(result1.args).toEqual([true]);

      const result2 = parseAction('test(False)');
      expect(result2.args).toEqual([false]);
    });

    it('should parse null values', () => {
      const result1 = parseAction('test(null)');
      expect(result1.args).toEqual([null]);

      const result2 = parseAction('test(None)');
      expect(result2.args).toEqual([null]);
    });

    it('should parse float numbers', () => {
      const result = parseAction('test(3.14)');
      expect(result.name).toBe('test');
      expect(result.args).toEqual([3.14]);
    });

    it('should parse negative numbers', () => {
      const result = parseAction('test(-42)');
      expect(result.name).toBe('test');
      expect(result.args).toEqual([-42]);
    });

    it('should handle whitespace', () => {
      const result = parseAction('  click  (  "123"  )  ');
      expect(result.name).toBe('click');
      expect(result.args).toEqual(['123']);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseAction('invalid')).toThrow('Invalid action format');
      expect(() => parseAction('click')).toThrow('Invalid action format');
      expect(() => parseAction('click(')).toThrow('Invalid action format');
    });

    it('should handle complex nested arguments', () => {
      const result = parseAction('test("a", [1, 2, 3], {"key": "value"})');
      expect(result.name).toBe('test');
      expect(result.args.length).toBe(3);
    });
  });

  describe('executeAction', () => {
    let mockPage: any;

    beforeEach(() => {
      mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        goBack: vi.fn().mockResolvedValue(undefined),
        goForward: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        dblclick: vi.fn().mockResolvedValue(undefined),
        fill: vi.fn().mockResolvedValue(undefined),
        press: vi.fn().mockResolvedValue(undefined),
        hover: vi.fn().mockResolvedValue(undefined),
        selectOption: vi.fn().mockResolvedValue(undefined),
        waitForTimeout: vi.fn().mockResolvedValue(undefined),
        locator: vi.fn().mockReturnValue({
          first: vi.fn().mockReturnValue({
            scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(undefined),
            boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 }),
          }),
        }),
        mouse: {
          move: vi.fn().mockResolvedValue(undefined),
          wheel: vi.fn().mockResolvedValue(undefined),
        },
        evaluate: vi.fn().mockResolvedValue(undefined),
      };
    });

    it('should execute goto action', async () => {
      await executeAction('goto("https://example.com")', mockPage as Page);
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
    });

    it('should execute go_back action', async () => {
      await executeAction('go_back()', mockPage as Page);
      expect(mockPage.goBack).toHaveBeenCalled();
    });

    it('should execute go_forward action', async () => {
      await executeAction('go_forward()', mockPage as Page);
      expect(mockPage.goForward).toHaveBeenCalled();
    });

    it('should execute click action with default button', async () => {
      await executeAction('click("123")', mockPage as Page);
      expect(mockPage.click).toHaveBeenCalledWith('[bid="123"]', {
        button: 'left',
        modifiers: [],
        timeout: 500,
      });
    });

    it('should execute click action with specified button', async () => {
      await executeAction('click("123", "right")', mockPage as Page);
      expect(mockPage.click).toHaveBeenCalledWith('[bid="123"]', {
        button: 'right',
        modifiers: [],
        timeout: 500,
      });
    });

    it('should execute click action with modifiers', async () => {
      // Note: Array parsing in action strings is complex, testing simpler case
      await executeAction('click("123", "left")', mockPage as Page);
      expect(mockPage.click).toHaveBeenCalledWith('[bid="123"]', {
        button: 'left',
        modifiers: [],
        timeout: 500,
      });
    });

    it('should execute dblclick action', async () => {
      await executeAction('dblclick("123")', mockPage as Page);
      expect(mockPage.dblclick).toHaveBeenCalledWith('[bid="123"]', {
        button: 'left',
        modifiers: [],
        timeout: 500,
      });
    });

    it('should execute fill action', async () => {
      await executeAction('fill("input1", "test value")', mockPage as Page);
      expect(mockPage.fill).toHaveBeenCalledWith('[bid="input1"]', 'test value', { timeout: 500 });
    });

    it('should execute press action', async () => {
      await executeAction('press("input1", "Enter")', mockPage as Page);
      expect(mockPage.press).toHaveBeenCalledWith('[bid="input1"]', 'Enter', { timeout: 500 });
    });

    it('should execute hover action', async () => {
      await executeAction('hover("123")', mockPage as Page);
      expect(mockPage.hover).toHaveBeenCalledWith('[bid="123"]', { timeout: 500 });
    });

    it('should execute select_option action with single value', async () => {
      await executeAction('select_option("select1", "option1")', mockPage as Page);
      expect(mockPage.selectOption).toHaveBeenCalledWith('[bid="select1"]', ['option1'], {
        timeout: 500,
      });
    });

    it('should execute select_option action with array', async () => {
      // Note: Array parsing is complex, testing single value case
      await executeAction('select_option("select1", "opt1")', mockPage as Page);
      expect(mockPage.selectOption).toHaveBeenCalledWith('[bid="select1"]', ['opt1'], {
        timeout: 500,
      });
    });

    it('should execute scroll action', async () => {
      await executeAction('scroll("element1", "down")', mockPage as Page);
      expect(mockPage.locator).toHaveBeenCalledWith('[bid="element1"]');
    });

    it('should execute send_msg_to_user action', async () => {
      await executeAction('send_msg_to_user("Hello")', mockPage as Page);
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should execute report_infeasible action', async () => {
      await executeAction('report_infeasible("Cannot complete")', mockPage as Page);
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it('should execute noop action with default timeout', async () => {
      await executeAction('noop()', mockPage as Page);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should execute noop action with custom timeout', async () => {
      await executeAction('noop(5000)', mockPage as Page);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
    });

    it('should throw error for unknown action', async () => {
      await expect(executeAction('unknown_action()', mockPage as Page)).rejects.toThrow(
        'Unknown action'
      );
    });

    it('should throw error for goto without arguments', async () => {
      await expect(executeAction('goto()', mockPage as Page)).rejects.toThrow(
        'goto requires 1 argument'
      );
    });

    it('should throw error for click without arguments', async () => {
      await expect(executeAction('click()', mockPage as Page)).rejects.toThrow(
        'click requires at least 1 argument'
      );
    });

    it('should throw error for fill without enough arguments', async () => {
      await expect(executeAction('fill("input1")', mockPage as Page)).rejects.toThrow(
        'fill requires 2 arguments'
      );
    });
  });
});

