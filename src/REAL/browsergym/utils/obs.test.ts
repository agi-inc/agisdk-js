/**
 * Tests for observation utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flattenAXTreeToStr, flattenDOMToStr, pruneHTML } from './obs.js';
import type { AXTree, DOMSnapshot } from '../../types.js';

describe('Observation Utilities', () => {
  describe('flattenAXTreeToStr', () => {
    it('should return empty string for empty tree', () => {
      const tree: AXTree = {};
      expect(flattenAXTreeToStr(tree)).toBe('');
    });

    it('should return empty string for tree without nodes', () => {
      const tree: AXTree = { nodes: [] };
      expect(flattenAXTreeToStr(tree)).toBe('');
    });

    it('should flatten simple tree', () => {
      const tree: AXTree = {
        nodes: [
          {
            role: { value: 'button' },
            name: { value: 'Click me' },
            browsergym_id: '123',
          },
        ],
      };
      const result = flattenAXTreeToStr(tree);
      expect(result).toContain('button');
      expect(result).toContain('Click me');
      expect(result).toContain('[bid=123]');
    });

    it('should handle nodes without value objects', () => {
      const tree: AXTree = {
        nodes: [
          {
            role: 'button',
            name: 'Click me',
            browsergym_id: '123',
          },
        ],
      };
      const result = flattenAXTreeToStr(tree);
      expect(result).toContain('button');
      expect(result).toContain('Click me');
    });

    it('should flatten nested tree structure', () => {
      const tree: AXTree = {
        nodes: [
          {
            role: { value: 'document' },
            name: { value: '' },
            children: [
              {
                role: { value: 'button' },
                name: { value: 'Submit' },
                browsergym_id: '456',
              },
            ],
          },
        ],
      };
      const result = flattenAXTreeToStr(tree);
      expect(result).toContain('document');
      expect(result).toContain('button');
      expect(result).toContain('Submit');
      expect(result).toContain('[bid=456]');
    });

    it('should handle nodes with value different from name', () => {
      const tree: AXTree = {
        nodes: [
          {
            role: { value: 'textbox' },
            name: { value: 'Email' },
            value: { value: 'user@example.com' },
          },
        ],
      };
      const result = flattenAXTreeToStr(tree);
      expect(result).toContain('textbox');
      expect(result).toContain('Email');
      expect(result).toContain('user@example.com');
    });

    it('should handle multiple root nodes', () => {
      const tree: AXTree = {
        nodes: [
          { role: { value: 'button' }, name: { value: 'Button 1' } },
          { role: { value: 'link' }, name: { value: 'Link 1' } },
        ],
      };
      const result = flattenAXTreeToStr(tree);
      expect(result).toContain('Button 1');
      expect(result).toContain('Link 1');
    });

    it('should handle deep nesting', () => {
      const tree: AXTree = {
        nodes: [
          {
            role: { value: 'document' },
            children: [
              {
                role: { value: 'main' },
                children: [
                  {
                    role: { value: 'article' },
                    children: [
                      {
                        role: { value: 'heading' },
                        name: { value: 'Title' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = flattenAXTreeToStr(tree);
      expect(result).toContain('document');
      expect(result).toContain('main');
      expect(result).toContain('article');
      expect(result).toContain('heading');
      expect(result).toContain('Title');
    });
  });

  describe('flattenDOMToStr', () => {
    it('should convert DOM snapshot to JSON string', () => {
      const dom: DOMSnapshot = {
        documents: [{ documentURL: 'https://example.com' }],
        strings: ['html', 'body'],
      };
      const result = flattenDOMToStr(dom);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('example.com');
    });

    it('should handle empty DOM snapshot', () => {
      const dom: DOMSnapshot = {};
      const result = flattenDOMToStr(dom);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should preserve structure in JSON', () => {
      const dom: DOMSnapshot = {
        documents: [{ documentURL: 'https://test.com' }],
        strings: ['div', 'span'],
      };
      const result = flattenDOMToStr(dom);
      const parsed = JSON.parse(result);
      expect(parsed.documents).toBeDefined();
      expect(parsed.strings).toBeDefined();
    });
  });

  describe('pruneHTML', () => {
    it('should return HTML string as-is', () => {
      const html = '<div>Test</div>';
      expect(pruneHTML(html)).toBe(html);
    });

    it('should handle empty string', () => {
      expect(pruneHTML('')).toBe('');
    });

    it('should handle complex HTML', () => {
      const html = '<html><body><div>Content</div></body></html>';
      expect(pruneHTML(html)).toBe(html);
    });

    it('should handle multiline HTML', () => {
      const html = '<div>\n  <p>Test</p>\n</div>';
      expect(pruneHTML(html)).toBe(html);
    });
  });
});

