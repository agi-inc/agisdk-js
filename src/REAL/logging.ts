/**
 * Logging utilities for AGI SDK
 */

export class Logger {
    private enabled: boolean = true;

    constructor(enabled: boolean = true) {
        this.enabled = enabled;
    }

    info(message: string): void {
        if (this.enabled) {
            console.log(`ℹ️  ${message}`);
        }
    }

    success(message: string): void {
        if (this.enabled) {
            console.log(`✅ ${message}`);
        }
    }

    error(message: string): void {
        if (this.enabled) {
            console.error(`❌ ${message}`);
        }
    }

    warning(message: string): void {
        if (this.enabled) {
            console.warn(`⚠️  ${message}`);
        }
    }

    taskStart(taskName: string, model?: string): void {
        if (this.enabled) {
            console.log('\n' + '─'.repeat(80));
            console.log(`🚀 Starting Task: ${taskName}${model ? ` (Model: ${model})` : ''}`);
            console.log('─'.repeat(80));
        }
    }

    taskStep(step: number, action: string): void {
        if (this.enabled) {
            console.log(`  Step ${step}: ${action}`);
        }
    }

    taskComplete(success: boolean, _reward: number, elapsedTime?: number, taskId?: string): void {
        if (this.enabled) {
            const status = success ? '✅ SUCCESS' : '❌ FAILED';
            const timeStr = elapsedTime !== undefined ? ` (${elapsedTime.toFixed(2)}s)` : '';
            const taskStr = taskId ? ` [${taskId}]` : '';
            console.log(`${status}${taskStr}${timeStr}`);
        }
    }
}

// Default logger instance
export const logger = new Logger(true);
