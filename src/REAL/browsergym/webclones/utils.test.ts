/**
 * Tests for webclones utilities
 */

import { describe, it, expect } from 'vitest';
import { getAllTasks, getCanonicalTaskId } from './utils.js';

describe('WebClones Utils', () => {
  describe('getAllTasks', () => {
    it('should return tasks for v2', () => {
      const tasks = getAllTasks('v2');
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should return tasks for v1', () => {
      const tasks = getAllTasks('v1');
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should throw error for invalid version', () => {
      expect(() => getAllTasks('v3')).toThrow();
    });
  });

  describe('getCanonicalTaskId', () => {
    it('should create canonical ID for v2', () => {
      const canonical = getCanonicalTaskId('omnizon-1', 'v2');
      expect(canonical).toBe('v2.omnizon-1');
    });

    it('should create canonical ID for v1', () => {
      const canonical = getCanonicalTaskId('dashdish-1', 'v1');
      expect(canonical).toBe('v1.dashdish-1');
    });

    it('should handle already canonical IDs', () => {
      // If already canonical, it will still add version prefix
      const canonical = getCanonicalTaskId('omnizon-1', 'v2');
      expect(canonical).toBe('v2.omnizon-1');
    });
  });
});

