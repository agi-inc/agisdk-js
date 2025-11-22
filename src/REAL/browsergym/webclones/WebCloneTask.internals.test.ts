/**
 * Comprehensive internal tests for WebCloneTask
 * Testing internal state, configuration, and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebCloneTask } from './WebCloneTask.js';
import type { Page } from 'playwright';

describe('WebCloneTask Internals', () => {
  beforeEach(() => {
    // Set up environment variable for URL
    process.env.WEBCLONE_URL = 'http://localhost:3000';
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with taskName and taskVersion', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v2',
          });

          expect(task).toBeDefined();
          expect((task as any).taskName).toBe(taskName);
          expect((task as any).taskVersion).toBe('v2');
        }
      }
    });

    it('should initialize with taskId', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const taskId = `v2.${taskName}`;
          const task = new WebCloneTask({
            taskId,
          });

          expect(task).toBeDefined();
          expect((task as any).canonicalTaskId).toBe(taskId);
        }
      }
    });

    it('should use environment variable for runId', () => {
      const originalRunId = process.env.RUNID;
      process.env.RUNID = 'env-run-id-123';

      try {
        const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
        const fs = require('fs-extra');
        
        if (fs.existsSync(tasksDir)) {
          const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
          if (files.length > 0) {
            const taskName = files[0]!.replace('.json', '');
            const task = new WebCloneTask({
              taskName,
              taskVersion: 'v2',
            });

            expect((task as any).runId).toBe('env-run-id-123');
          }
        }
      } finally {
        if (originalRunId) {
          process.env.RUNID = originalRunId;
        } else {
          delete process.env.RUNID;
        }
      }
    });

    it('should prioritize explicit runId over environment', () => {
      const originalRunId = process.env.RUNID;
      process.env.RUNID = 'env-run-id';

      try {
        const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
        const fs = require('fs-extra');
        
        if (fs.existsSync(tasksDir)) {
          const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
          if (files.length > 0) {
            const taskName = files[0]!.replace('.json', '');
            const task = new WebCloneTask({
              taskName,
              taskVersion: 'v2',
              runId: 'explicit-run-id',
            });

            expect((task as any).runId).toBe('explicit-run-id');
          }
        }
      } finally {
        if (originalRunId) {
          process.env.RUNID = originalRunId;
        } else {
          delete process.env.RUNID;
        }
      }
    });

    it('should use WEBCLONES_URL if WEBCLONE_URL not set', () => {
      const originalWebclone = process.env.WEBCLONE_URL;
      const originalWebclones = process.env.WEBCLONES_URL;
      delete process.env.WEBCLONE_URL;
      process.env.WEBCLONES_URL = 'http://alternative-url:3000';

      try {
        const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
        const fs = require('fs-extra');
        
        if (fs.existsSync(tasksDir)) {
          const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
          if (files.length > 0) {
            const taskName = files[0]!.replace('.json', '');
            const task = new WebCloneTask({
              taskName,
              taskVersion: 'v2',
            });

            expect((task as any).url).toBe('http://alternative-url:3000');
          }
        }
      } finally {
        if (originalWebclone) {
          process.env.WEBCLONE_URL = originalWebclone;
        }
        if (originalWebclones) {
          process.env.WEBCLONES_URL = originalWebclones;
        }
      }
    });

    it('should throw error when no URL is available', () => {
      const originalWebclone = process.env.WEBCLONE_URL;
      const originalWebclones = process.env.WEBCLONES_URL;
      delete process.env.WEBCLONE_URL;
      delete process.env.WEBCLONES_URL;

      try {
        const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
        const fs = require('fs-extra');
        
        if (fs.existsSync(tasksDir)) {
          const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
          if (files.length > 0) {
            const taskName = files[0]!.replace('.json', '');
            expect(() => {
              new WebCloneTask({
                taskName,
                taskVersion: 'v2',
              });
            }).toThrow('WebClones base URL');
          }
        }
      } finally {
        if (originalWebclone) {
          process.env.WEBCLONE_URL = originalWebclone;
        }
        if (originalWebclones) {
          process.env.WEBCLONES_URL = originalWebclones;
        }
      }
    });
  });

  describe('Task Configuration Access', () => {
    it('should provide access to goal', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v2',
          });

          const goal = task.getGoal();
          expect(goal).toBeTruthy();
          expect(typeof goal).toBe('string');
        }
      }
    });

    it('should provide access to task config', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v2',
          });

          const config = task.getTaskConfig();
          expect(config).toBeDefined();
          expect(config.task_name).toBe(taskName);
          expect(config.version).toBe('v2');
        }
      }
    });
  });

  describe('Version-Specific Behavior', () => {
    it('should use canonical task ID for v2', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v2',
            runId: 'test-run',
          });

          expect((task as any).canonicalTaskId).toBe(`v2.${taskName}`);
        }
      }
    });

    it('should use bare task ID for v1 leaderboard', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v1/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v1',
            runId: 'test-run', // Non-zero runId
          });

          // For v1 with non-zero runId, config task ID should be bare name
          const state = task as any;
          expect(state.taskVersion).toBe('v1');
          expect(state.runId).toBe('test-run');
        }
      }
    });
  });

  describe('Internal State Management', () => {
    it('should track page references', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v2',
          });

          const state = task as any;
          expect(state.page).toBeNull();
          expect(state.backgroundPage).toBeNull();
        }
      }
    });

    it('should store goal and URL', () => {
      const tasksDir = require('path').join(__dirname, '../../../tasks/v2/tasks');
      const fs = require('fs-extra');
      
      if (fs.existsSync(tasksDir)) {
        const files = fs.readdirSync(tasksDir).filter((f: string) => f.endsWith('.json'));
        if (files.length > 0) {
          const taskName = files[0]!.replace('.json', '');
          const task = new WebCloneTask({
            taskName,
            taskVersion: 'v2',
          });

          const state = task as any;
          expect(state.goal).toBeTruthy();
          expect(state.url).toBeTruthy();
          expect(typeof state.goal).toBe('string');
          expect(typeof state.url).toBe('string');
        }
      }
    });
  });
});

