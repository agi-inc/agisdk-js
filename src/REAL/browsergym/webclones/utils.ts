/**
 * Task utility functions
 */

import { getTasksForVersion, splitTaskReference } from './TaskConfig.js';

const DEFAULT_VERSION = 'v2';

/**
 * Get all tasks for a version
 */
export function getAllTasks(version?: string): string[] {
    const resolvedVersion = version || DEFAULT_VERSION;
    return getTasksForVersion(resolvedVersion);
}

/**
 * Get tasks filtered by type
 */
export function getTasksByType(taskType: string, version?: string): string[] {
    const resolvedVersion = version || DEFAULT_VERSION;
    const allTasks = getTasksForVersion(resolvedVersion);
    return allTasks.filter(name => name.startsWith(`${taskType}-`));
}

/**
 * Get canonical task ID (version.task-name)
 */
export function getCanonicalTaskId(taskName: string, version?: string): string {
    const resolvedVersion = version || DEFAULT_VERSION;
    return `${resolvedVersion}.${taskName}`;
}

/**
 * Parse canonical task ID into version and name
 */
export function parseCanonicalTaskId(canonicalId: string): [string, string] {
    return splitTaskReference(canonicalId);
}
