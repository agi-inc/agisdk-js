/**
 * Task utility functions
 */

import { getTasksForVersion, splitTaskReference } from './TaskConfig.js';
import { logger } from '../../logging.js';

const DEFAULT_VERSION = 'v2';
const RAILWAY_API_BASE = 'https://evaluate-production.up.railway.app/';

/**
 * Get a run ID from the REAL evaluations API using an API key, model name, and run name.
 */
export async function getRunIdFromApi(
    apiKey: string,
    modelIdName: string,
    runName: string
): Promise<string | null> {
    try {
        // URL encode parameters
        const encodedModelIdName = encodeURIComponent(modelIdName);
        const encodedRunName = encodeURIComponent(runName);

        // Construct the API URL
        // Prefer the REAL_API_BASE env override to support domain migrations
        const baseUrl = process.env.REAL_API_BASE || 'https://www.realevals.ai';
        const url = `${baseUrl.replace(/\/$/, '')}/api/runKey?api_key=${apiKey}&model_name=${encodedModelIdName}&run_name=${encodedRunName}`;

        // Make the request
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
        });

        // Check if request was successful
        if (response.ok) {
            const data = await response.json();
            if (data.newRunId) {
                return data.newRunId;
            } else {
                logger.error(`API response did not contain newRunId: ${JSON.stringify(data)}`);
            }
        } else {
            const text = await response.text();
            logger.error(`API request failed with status code ${response.status}: ${text}`);
        }
    } catch (e) {
        logger.error(`Error getting run ID from API: ${e instanceof Error ? e.message : String(e)}`);
    }

    return null;
}

/**
 * Submit results to Railway for script-based evaluation
 */
export async function submitToRailway(
    envState: Record<string, any>,
    modelResponse: string,
    taskConfig: Record<string, any>,
    runId: string,
    taskId: string
): Promise<{ reward: number; leaderboardSubmitted: boolean } | null> {
    const railwayUrl = `${RAILWAY_API_BASE.replace(/\/$/, '')}/evaluate`;
    const payload = {
        env_state: envState,
        model_response: modelResponse,
        task_config: taskConfig,
        run_id: runId,
        task_id: taskId,
    };

    logger.info('🚂 Script task: sending to Railway for evaluation and leaderboard submission...');

    try {
        const response = await fetch(railwayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
            const result = await response.json();
            const railwayReward = result.reward ?? 0.0;
            logger.info(`✅ Railway evaluation complete: reward=${railwayReward}`);
            return {
                reward: railwayReward,
                leaderboardSubmitted: result.leaderboard_submitted ?? false,
            };
        } else {
            const text = await response.text();
            logger.error(`❌ Railway returned status ${response.status}: ${text}`);
        }
    } catch (e) {
        if (e instanceof Error && e.name === 'TimeoutError') {
            logger.error('❌ Railway request timed out');
        } else {
            logger.error(`❌ Failed to send to Railway: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    return null;
}

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
