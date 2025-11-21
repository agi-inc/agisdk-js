/**
 * Observation processing utilities
 */

import type { AXTree, DOMSnapshot } from '../../types.js';

/**
 * Flatten AXTree to text string
 */
export function flattenAXTreeToStr(axtree: AXTree): string {
    if (!axtree.nodes || !Array.isArray(axtree.nodes)) {
        return '';
    }

    const lines: string[] = [];
    
    function processNode(node: any, indent: number = 0): void {
        const indentStr = '  '.repeat(indent);
        const role = node.role?.value || node.role || 'unknown';
        const name = node.name?.value || node.name || '';
        const value = node.value?.value || node.value || '';
        
        let line = `${indentStr}${role}`;
        if (name) {
            line += ` "${name}"`;
        }
        if (value && value !== name) {
            line += ` = ${value}`;
        }
        
        // Add browsergym_id if present
        if (node.browsergym_id) {
            line += ` [bid=${node.browsergym_id}]`;
        }
        
        lines.push(line);
        
        // Process children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                processNode(child, indent + 1);
            }
        }
    }
    
    for (const node of axtree.nodes) {
        processNode(node);
    }
    
    return lines.join('\n');
}

/**
 * Flatten DOM snapshot to text string
 */
export function flattenDOMToStr(domSnapshot: DOMSnapshot): string {
    // Simplified DOM flattening - full implementation would process DOMSnapshot structure
    // For now, return a placeholder
    return JSON.stringify(domSnapshot, null, 2);
}

/**
 * Prune HTML to relevant elements
 */
export function pruneHTML(htmlString: string): string {
    // Simplified pruning - full implementation would parse HTML and filter
    // For now, return as-is
    return htmlString;
}
