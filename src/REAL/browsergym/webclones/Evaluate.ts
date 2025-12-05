/**
 * WebCloneEvaluator - Evaluates task completion
 */

import jmespath from 'jmespath';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { TaskConfig } from './TaskConfig.js';
import { logger } from '../../logging.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../../../../');

/**
 * Evaluation result
 */
export interface EvalResult {
    isCorrect: boolean;
    info: Record<string, any>;
}

/**
 * WebCloneEvaluator - Evaluates task completion based on task configuration
 */
export class WebCloneEvaluator {
    private taskConfig: TaskConfig;
    private llm: string;
    private evalScriptsDirs: string[];

    constructor(taskConfig: TaskConfig, llm: string = 'gpt-4.1') {
        this.taskConfig = taskConfig;
        this.llm = llm;

        // Set up eval scripts directories
        const defaultDir = path.join(PACKAGE_ROOT, 'src', 'REAL', 'tasks', taskConfig.version, 'eval_scripts');
        const configuredDir = (this.taskConfig as any).eval_scripts_dir;

        const searchDirs: string[] = [];
        if (configuredDir) {
            searchDirs.push(path.resolve(configuredDir));
        }
        searchDirs.push(defaultDir);

        // De-duplicate while preserving order
        const seen = new Set<string>();
        this.evalScriptsDirs = [];
        for (const directory of searchDirs) {
            if (!seen.has(directory)) {
                this.evalScriptsDirs.push(directory);
                seen.add(directory);
            }
        }

        if (!this.evalScriptsDirs.some(dir => fs.existsSync(dir))) {
            logger.warning(
                `⚠️ No evaluation scripts directory found. Checked: ${this.evalScriptsDirs.join(', ')}`
            );
        }
    }

    /**
     * Run jmespath query on data
     */
    jmespathVerify(envState: Record<string, any>, query: string): [boolean, string | null] {
        try {
            const isValid = jmespath.search(envState, query);
            return [Boolean(isValid), null];
        } catch (e) {
            return [false, `Error: ${e instanceof Error ? e.message : String(e)}`];
        }
    }

    /**
     * Get value from nested JSON using dot-separated path
     */
    getValueFromPath(envState: Record<string, any>, pathStr: string): [any, string | null] {
        const keys = pathStr.split('.');
        let value: any = envState;

        for (const key of keys) {
            if (typeof value !== 'object' || value === null) {
                return [`<env state '${pathStr}' not found>`, `Error: ${pathStr} was not found in the environment state.`];
            }
            value = value[key];
            if (value === undefined) {
                break;
            }
        }

        return [value, null];
    }

    /**
     * Performs fuzzy matching using an LLM
     */
    async evaluateWithLlm(modelResponse: string, rubric: string, threshold: number = 0.8): Promise<EvalResult> {
        const fuzzyMatchPrompt = `
            Given a student's answer and a rubric, help a teacher grade the answer. Keep in mind
            that the student may use different words or phrases to express the same idea.

            Student's answer: ${modelResponse}
            Rubric: ${rubric}

            Grade the student's answer on a scale of 0 to 1, where 1 means the student's answer matches the rubric. Don't be too strict.
            Please answer only with a floating point number and nothing else.
        `;

        try {
            // Use OpenAI for LLM evaluation
            const OpenAI = (await import('openai')).default;
            const client = new OpenAI();
            const response = await client.chat.completions.create({
                model: this.llm,
                messages: [{ role: 'user', content: fuzzyMatchPrompt }],
            });

            const llmGrade = response.choices[0]?.message.content || '0';
            const similarity = parseFloat(llmGrade);

            if (isNaN(similarity)) {
                throw new Error(`LLM response is not a valid floating point number: ${llmGrade}`);
            }

            const isCorrect = similarity > threshold;
            return {
                isCorrect,
                info: {
                    similarity,
                    model_response: modelResponse,
                    rubric,
                },
            };
        } catch (e) {
            logger.error(`Error in LLM evaluation: ${e instanceof Error ? e.message : String(e)}`);
            return {
                isCorrect: false,
                info: {
                    error: e instanceof Error ? e.message : String(e),
                    model_response: modelResponse,
                    rubric,
                },
            };
        }
    }

    /**
     * Check if actual value matches expected value
     */
    exactMatch(actualValue: any, expectedValue: any): EvalResult {
        const isCorrect = actualValue === expectedValue;
        return {
            isCorrect,
            info: {
                actual_value: actualValue,
                expected_value: expectedValue,
            },
        };
    }

    /**
     * Execute a Python evaluation script as a subprocess
     */
    async executeEvalScriptSubprocess(
        scriptName: string,
        envState: Record<string, any>,
        _modelResponse: string
    ): Promise<EvalResult> {
        // Find the script
        let scriptPath: string | null = null;
        for (const directory of this.evalScriptsDirs) {
            const candidate = path.join(directory, scriptName);
            if (fs.existsSync(candidate)) {
                scriptPath = candidate;
                break;
            }
        }

        if (scriptPath === null) {
            const searchPaths = this.evalScriptsDirs.map(d => path.join(d, scriptName)).join(', ');
            const errorMsg = `Evaluation script '${scriptName}' not found in: ${searchPaths}`;
            logger.error(`❌ ${errorMsg}`);
            return { isCorrect: false, info: { error: errorMsg } };
        }

        // Create temporary JSON file with the data
        const tempPath = path.join(os.tmpdir(), `eval_${scriptName.replace('.py', '')}_${Date.now()}.json`);

        try {
            // Write the full env_state
            await fs.writeJSON(tempPath, envState, { spaces: 2 });

            logger.info(`📝 Executing ${scriptName} with data file: ${path.basename(tempPath)}`);

            // Execute the Python script
            return new Promise((resolve) => {
                const pythonPath = process.env.PYTHON_PATH || 'python3';
                const child = spawn(pythonPath, [scriptPath, tempPath], {
                    timeout: 30000,
                });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                child.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                child.on('close', (code) => {
                    stdout = stdout.trim();
                    stderr = stderr.trim();

                    logger.info(`🔧 Script output: ${stdout}`);
                    if (stderr) {
                        logger.warning(`⚠️ Script stderr: ${stderr}`);
                    }

                    // Check if the output indicates success
                    const isCorrect = stdout.toUpperCase().includes('SUCCESS');

                    // Cleanup temp file
                    fs.unlink(tempPath).catch(() => {});

                    resolve({
                        isCorrect,
                        info: {
                            script: scriptName,
                            output: stdout,
                            stderr: stderr || null,
                            return_code: code,
                        },
                    });
                });

                child.on('error', (error) => {
                    logger.error(`❌ Error executing script ${scriptName}: ${error.message}`);

                    // Cleanup temp file
                    fs.unlink(tempPath).catch(() => {});

                    resolve({
                        isCorrect: false,
                        info: {
                            error: error.message,
                            script: scriptName,
                        },
                    });
                });
            });
        } catch (e) {
            // Cleanup temp file on error
            try {
                await fs.unlink(tempPath);
            } catch {
                // Ignore cleanup errors
            }

            const errorMsg = `Error executing script ${scriptName}: ${e instanceof Error ? e.message : String(e)}`;
            logger.error(`❌ ${errorMsg}`);
            return {
                isCorrect: false,
                info: {
                    error: errorMsg,
                    script: scriptName,
                },
            };
        }
    }

    /**
     * Evaluate task completion
     */
    async evaluate(
        envState: Record<string, any>,
        modelResponse: string
    ): Promise<[number, boolean, string, Record<string, any>]> {
        const results: EvalResult[] = [];

        // Display environment state
        logger.info('🌍 Environment State:');
        logger.info(JSON.stringify(envState, null, 4));

        const evals = this.taskConfig.getEvals();
        for (let i = 0; i < evals.length; i++) {
            const evalConfig = evals[i]!;
            let result: EvalResult;
            let evalOutcome: string;

            if (evalConfig.type === 'script') {
                result = await this.executeEvalScriptSubprocess(
                    evalConfig.script!,
                    envState,
                    modelResponse
                );
                evalOutcome = `script: ${evalConfig.script}, result: ${result.info.output || 'N/A'}`;
            } else if (evalConfig.type === 'llm_boolean') {
                result = await this.evaluateWithLlm(modelResponse, evalConfig.rubric!);
                evalOutcome = `llm eval, is_correct: ${result.isCorrect}`;
            } else if (evalConfig.type === 'jmespath') {
                const [actualValue, errorMessage] = this.jmespathVerify(envState, evalConfig.query!);
                if (errorMessage) {
                    result = { isCorrect: false, info: { error: errorMessage } };
                } else {
                    result = this.exactMatch(actualValue, evalConfig.expected_value);
                }
                evalOutcome = `jmespath query, is_correct: ${result.isCorrect}`;
            } else {
                const errorMsg = `Unknown evaluation type: ${evalConfig.type}`;
                logger.error(`❌ ${errorMsg}`);
                throw new Error(errorMsg);
            }

            results.push(result);

            // Display criterion evaluation
            const description = evalConfig.description || `Criterion ${i + 1}`;
            if (result.isCorrect) {
                logger.success(`✅ ${description}: ${evalOutcome}`);
            } else {
                logger.error(`❌ ${description}: ${evalOutcome}`);
            }
        }

        // Aggregate results
        const isCorrect = results.every(r => r.isCorrect);
        const reward = isCorrect ? this.taskConfig.task.points : 0.0;
        const done = true;
        const message = isCorrect ? 'Task completed successfully!' : 'Task not completed successfully.';
        const info = { results };

        return [reward, done, message, info];
    }

    /**
     * Check if any evaluation uses a Python script
     */
    hasScriptEval(): boolean {
        const evals = this.taskConfig.getEvals();
        return evals.some(evalConfig =>
            evalConfig.type === 'script' || Boolean(evalConfig.script)
        );
    }

    /**
     * Build task config payload for remote evaluation
     */
    buildTaskConfigPayload(): Record<string, any> {
        const task = this.taskConfig.task;
        if (!task) {
            logger.warning('Task config missing task details; returning empty payload');
            return { evals: [], points: 0.0 };
        }

        const evalsPayload = task.evals.map(evalConfig => ({ ...evalConfig }));

        const payload: Record<string, any> = {
            evals: evalsPayload,
            points: task.points || 0.0,
        };

        const scriptNames = task.evals
            .filter(evalConfig => evalConfig.script)
            .map(evalConfig => evalConfig.script);

        if (scriptNames.length > 0) {
            payload.eval_scripts = scriptNames;
        }

        return payload;
    }
}
