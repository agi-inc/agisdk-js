#!/usr/bin/env node

/**
 * Script to copy task JSON files from Python SDK to JavaScript SDK
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pythonSDKPath = path.join(rootDir, '../agisdk/src/agisdk/REAL/browsergym/webclones');
const tasksDest = path.join(rootDir, 'src/REAL/tasks');

console.log('📦 Copying tasks from Python SDK...');
console.log(`   Source: ${pythonSDKPath}`);
console.log(`   Destination: ${tasksDest}`);

// Ensure destination directory exists
await fs.ensureDir(tasksDest);

// Copy v1 and v2 task directories
for (const version of ['v1', 'v2']) {
    const src = path.join(pythonSDKPath, version, 'tasks');
    const dest = path.join(tasksDest, version, 'tasks');
    
    if (await fs.pathExists(src)) {
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(src, dest);
        const files = (await fs.readdir(dest)).filter(f => f.endsWith('.json'));
        console.log(`✅ Copied ${version} tasks (${files.length} files)`);
    } else {
        console.warn(`⚠️  ${version} tasks directory not found at ${src}`);
    }
}

console.log('✅ Task copying complete!');
