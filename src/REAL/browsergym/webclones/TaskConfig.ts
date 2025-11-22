/**
 * TaskConfig - Load and parse task configuration files
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From dist/REAL/browsergym/webclones, go up 4 levels to package root
const PACKAGE_ROOT = path.resolve(__dirname, '../../../../');
const DEFAULT_VERSION = 'v2';

const VERSION_DIRS: Record<string, string> = {
    v1: path.join(PACKAGE_ROOT, 'src', 'REAL', 'tasks', 'v1'),
    v2: path.join(PACKAGE_ROOT, 'src', 'REAL', 'tasks', 'v2'),
};

/**
 * Split a task reference into (version, task_name)
 * 
 * Accepts either '<version>.<task_name>' or '<task_name>' (defaults to DEFAULT_VERSION)
 */
export function splitTaskReference(taskReference: string): [string, string] {
    const reference = (taskReference || '').trim();
    if (!reference) {
        throw new Error('Task reference must be a non-empty string');
    }

    if (reference.includes('.')) {
        const parts = reference.split('.');
        if (parts.length < 2) {
            throw new Error(`Invalid task reference format: '${reference}'`);
        }
        const versionCandidate = parts[0]!;
        const name = parts.slice(1).join('.');
        if (versionCandidate in VERSION_DIRS) {
            return [versionCandidate, name];
        }
        throw new Error(`Unknown task version '${versionCandidate}' in '${reference}'`);
    }

    return [DEFAULT_VERSION, reference];
}

/**
 * Get list of task names for a given version
 */
export function getTasksForVersion(version: string): string[] {
    if (!(version in VERSION_DIRS)) {
        throw new Error(`Unknown task version '${version}'`);
    }
    const versionDir = VERSION_DIRS[version];
    if (!versionDir) {
        throw new Error(`Version directory not found for '${version}'`);
    }
    const tasksDir = path.join(versionDir, 'tasks');
    if (!fs.existsSync(tasksDir)) {
        return [];
    }
    const files = fs.readdirSync(tasksDir);
    return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort();
}

/**
 * Evaluation configuration
 */
export interface EvalConfig {
    type: string;
    expected_value?: string;
    state_variable_path?: string;
    rubric?: string;
    query?: string;
    description?: string;
    possible?: boolean;
    script?: string;
}

/**
 * Task data structure
 */
export interface TaskData {
    id: string;
    version: string;
    evals: EvalConfig[];
    start_url: string;
    goal: string;
    difficulty: string;
    challengeType: string;
    points: number;
    config?: Record<string, any>;
    possible?: boolean;
    description?: string;
}

/**
 * TaskConfig - Loads and manages task configuration
 */
export class TaskConfig {
    public version: string;
    public task_name: string;
    public canonical_id: string;
    public task: TaskData;
    private config_json: Record<string, any>;
    private tasks_dir: string;

    constructor(task_name: string, version?: string) {
        // Resolve version and task name
        let resolved_version: string;
        let resolved_name: string;

        if (version) {
            resolved_version = version;
            resolved_name = task_name;
        } else {
            [resolved_version, resolved_name] = splitTaskReference(task_name);
        }

        // Set version paths
        if (!(resolved_version in VERSION_DIRS)) {
            throw new Error(`Unknown task version '${resolved_version}'`);
        }

        this.version = resolved_version;
        this.task_name = resolved_name;
        this.tasks_dir = path.join(VERSION_DIRS[resolved_version]!, 'tasks');

        // Load task JSON
        const configPath = path.join(this.tasks_dir, `${this.task_name}.json`);
        if (!fs.existsSync(configPath)) {
            throw new Error(`Task configuration file not found: ${configPath}`);
        }

        this.config_json = fs.readJSONSync(configPath);

        // Set defaults
        this.config_json.version = this.version;
        if (this.config_json.id !== this.task_name) {
            this.config_json.id = this.task_name;
        }

        this.canonical_id = `${this.version}.${this.task_name}`;

        // Validate configuration
        if (!this.isValidConfig()) {
            throw new Error(`Invalid task configuration for task ID: ${this.canonical_id}`);
        }

        // Process evals
        const eval_configs = this.config_json.evals || [];
        const eval_instances: EvalConfig[] = [];
        for (const eval_config of eval_configs) {
            // Check if this is a script-based eval
            if (eval_config.script && !eval_config.type) {
                eval_config.type = 'script';
            }
            eval_instances.push(eval_config as EvalConfig);
        }

        // Extract start URL from website
        const start_url = this.config_json.website?.url || '';

        // Create task data structure
        const trimmed_config = { ...this.config_json };
        delete trimmed_config.evals;
        delete trimmed_config.website;

        this.task = {
            id: this.config_json.id,
            version: this.version,
            evals: eval_instances,
            start_url,
            goal: this.config_json.goal || '',
            difficulty: this.config_json.difficulty || 'medium',
            challengeType: this.config_json.challengeType || 'navigation',
            points: this.config_json.points || 1.0,
            config: trimmed_config.config || {},
            possible: this.config_json.possible !== false,
            description: this.config_json.description || '',
        };
    }

    /**
     * Validate task configuration has required fields
     */
    private isValidConfig(): boolean {
        const required_keys = ['id', 'website', 'goal', 'evals'];
        for (const key of required_keys) {
            if (!(key in this.config_json)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get task ID
     */
    getTaskId(): string {
        return this.task.id;
    }

    /**
     * Get start URL
     */
    getStartUrl(): string {
        return this.task.start_url;
    }

    /**
     * Get goal description
     */
    getGoal(): string {
        return this.task.goal;
    }

    /**
     * Get evaluation configurations
     */
    getEvals(): EvalConfig[] {
        return this.task.evals;
    }

    /**
     * Get evaluation type
     */
    getEvaluationType(): string {
        return this.task.challengeType;
    }

    /**
     * Get expected value from first eval
     */
    getExpectedValue(): string {
        if (!this.task.evals || this.task.evals.length === 0) {
            return '';
        }
        return this.task.evals[0]?.expected_value || '';
    }

    /**
     * Get task data as JSON
     */
    toJSON(): Record<string, any> {
        return {
            ...this.task,
            evals: this.task.evals,
        };
    }
}
