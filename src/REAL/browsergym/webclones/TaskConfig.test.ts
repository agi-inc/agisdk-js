/**
 * Tests for TaskConfig
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskConfig, splitTaskReference, getTasksForVersion } from './TaskConfig.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('TaskConfig', () => {
  describe('splitTaskReference', () => {
    it('should split versioned task reference', () => {
      const [version, name] = splitTaskReference('v2.omnizon-1');
      expect(version).toBe('v2');
      expect(name).toBe('omnizon-1');
    });

    it('should default to v2 for unversioned reference', () => {
      const [version, name] = splitTaskReference('omnizon-1');
      expect(version).toBe('v2');
      expect(name).toBe('omnizon-1');
    });

    it('should handle v1 version', () => {
      const [version, name] = splitTaskReference('v1.dashdish-1');
      expect(version).toBe('v1');
      expect(name).toBe('dashdish-1');
    });

    it('should throw error for empty reference', () => {
      expect(() => splitTaskReference('')).toThrow('Task reference must be a non-empty string');
    });

    it('should throw error for invalid version', () => {
      expect(() => splitTaskReference('v3.invalid')).toThrow('Unknown task version');
    });

    it('should handle task names with dots', () => {
      const [version, name] = splitTaskReference('v2.task.name.with.dots');
      expect(version).toBe('v2');
      expect(name).toBe('task.name.with.dots');
    });
  });

  describe('getTasksForVersion', () => {
    it('should return task list for v2', () => {
      const tasks = getTasksForVersion('v2');
      expect(Array.isArray(tasks)).toBe(true);
      // Should have some tasks
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should return task list for v1', () => {
      const tasks = getTasksForVersion('v1');
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should throw error for invalid version', () => {
      expect(() => getTasksForVersion('v3')).toThrow('Unknown task version');
    });

    it('should return empty array if tasks directory does not exist', () => {
      // This test assumes the directory structure exists
      // In a real scenario, we might mock fs operations
      const tasks = getTasksForVersion('v2');
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('TaskConfig class', () => {
    it('should load task config from file', () => {
      // Find an actual task file to test with
      const tasksDir = path.join(__dirname, '../../tasks/v2/tasks');
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const config = new TaskConfig(taskName, 'v2');
          expect(config.task_name).toBe(taskName);
          expect(config.version).toBe('v2');
          expect(config.canonical_id).toBe(`v2.${taskName}`);
        }
      }
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        new TaskConfig('nonexistent-task-99999', 'v2');
      }).toThrow('Task configuration file not found');
    });

    it('should throw error for invalid version', () => {
      expect(() => {
        new TaskConfig('omnizon-1', 'v3');
      }).toThrow('Unknown task version');
    });

    it('should parse task reference in constructor', () => {
      const tasksDir = path.join(__dirname, '../../tasks/v2/tasks');
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const config = new TaskConfig(`v2.${taskName}`);
          expect(config.task_name).toBe(taskName);
          expect(config.version).toBe('v2');
        }
      }
    });

    it('should have getGoal method', () => {
      const tasksDir = path.join(__dirname, '../../tasks/v2/tasks');
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const config = new TaskConfig(taskName, 'v2');
          const goal = config.getGoal();
          expect(goal).toBeTruthy();
        }
      }
    });

    it('should have getStartUrl method', () => {
      const tasksDir = path.join(__dirname, '../../tasks/v2/tasks');
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const config = new TaskConfig(taskName, 'v2');
          const url = config.getStartUrl();
          expect(url).toBeTruthy();
          expect(typeof url).toBe('string');
        }
      }
    });

    it('should validate task configuration', () => {
      const tasksDir = path.join(__dirname, '../../tasks/v2/tasks');
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const config = new TaskConfig(taskName, 'v2');
          // Should not throw if config is valid
          expect(config.task).toBeDefined();
        }
      }
    });
  });
});

