import { BrowserEnv } from './env.js';
import { type Agent } from './agent.js';
import { getTask } from './tasks.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import * as path from 'path';

export class Harness {
    public agent: Agent;
    public headless: boolean;
    public taskDir: string | undefined;
    public resultsDir: string;

    constructor(
        agent: Agent,
        headless: boolean = true,
        taskDir?: string,
        resultsDir: string = "./results"
    ) {
        this.agent = agent;
        this.headless = headless;
        this.taskDir = taskDir;
        this.resultsDir = resultsDir;
    }

    async run(taskInput: string | string[]) {
        if (Array.isArray(taskInput)) {
            const results: { [key: string]: any } = {};
            for (const t of taskInput) {
                results[t] = await this.runSingleTask(t);
            }
            return results;
        } else {
            return { [taskInput]: await this.runSingleTask(taskInput) };
        }
    }

    private async runSingleTask(taskId: string) {
        console.log(`Running task: ${taskId}`);
        const task = await getTask(taskId, this.taskDir);
        if (!task) {
            console.error(`Task not found: ${taskId}`);
            return { error: "Task not found" };
        }

        const env = new BrowserEnv(this.headless);
        const runId = uuidv4();
        const taskResultsDir = path.join(this.resultsDir, `${taskId}_${runId}`);
        await fs.ensureDir(taskResultsDir);

        const episodeInfo: any[] = [];

        try {
            await env.reset(task);
            let obs = await env.getObs();
            let done = false;
            let step = 0;
            const maxSteps = 25; // Default

            while (!done && step < maxSteps) {
                console.log(`Step ${step}`);
                
                // Save step info
                await this.saveStep(taskResultsDir, step, obs);
                episodeInfo.push({ step, obs, action: null });

                const action = await this.agent.getAction(obs);
                console.log(`Action: ${action}`);
                
                episodeInfo[step].action = action;

                // Execute action
                obs = await env.step(action);
                step++;
                
                // Check termination conditions
                // In Python, task.validate() checks success. 
                // We don't have task.validate() as it's Python code.
                // For now, we can't determine success programmatically without porting validation logic.
                // We'll rely on the agent or user to stop, or max steps.
                
                // If agent sends "report_infeasible", we might stop.
                if (obs.last_action.includes("report_infeasible")) {
                    done = true;
                }
            }
            
            // Save last observation
            await this.saveStep(taskResultsDir, step, obs);

        } catch (e) {
            console.error(`Error in task ${taskId}:`, e);
        } finally {
            await env.close();
        }

        return {
            taskId,
            runId,
            steps: episodeInfo.length,
            success: false // Placeholder
        };
    }

    private async saveStep(dir: string, step: number, obs: any) {
        // Save screenshot
        if (obs.screenshot) {
            await fs.writeFile(path.join(dir, `screenshot_step_${step}.png`), obs.screenshot);
        }
        
        // Save info (omit binary buffers for JSON)
        const info = { ...obs, screenshot: undefined, browser: undefined };
        await fs.writeJSON(path.join(dir, `step_${step}.json`), info, { spaces: 2 });
    }
}
