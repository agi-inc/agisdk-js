import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { type TaskConfig } from './env.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default path assumes we are in agisdk-js/src/REAL and tasks are in agisdk/src/...
// This is fragile but works for the workspace.
// Ideally, tasks should be distributed with the package.
const DEFAULT_TASK_DIR = path.resolve(__dirname, '../../../agisdk/src/agisdk/REAL/browsergym/webclones/v2/tasks');

export async function loadTasks(taskDir: string = DEFAULT_TASK_DIR, pattern: string = "**/*.json"): Promise<TaskConfig[]> {
    if (!fs.existsSync(taskDir)) {
        console.warn(`Task directory not found: ${taskDir}`);
        return [];
    }

    const files = await glob(pattern, { cwd: taskDir, absolute: true });
    const tasks: TaskConfig[] = [];

    for (const file of files) {
        try {
            const content = await fs.readJSON(file);
            if (content.id && content.website) {
                tasks.push(content);
            }
        } catch (e) {
            console.warn(`Failed to load task from ${file}: ${e}`);
        }
    }
    return tasks;
}

export async function getTask(taskId: string, taskDir?: string): Promise<TaskConfig | null> {
    const searchDir = taskDir || DEFAULT_TASK_DIR;
    // Try to find specific task file
    // taskId e.g. "omnizon-1" -> omnizon-1.json
    const tasks = await loadTasks(searchDir, `**/${taskId}.json`);
    if (tasks.length > 0) return tasks[0] || null;
    
    // Try searching all
    const allTasks = await loadTasks(searchDir);
    const found = allTasks.find(t => t.id === taskId);
    return found ?? null;
}
