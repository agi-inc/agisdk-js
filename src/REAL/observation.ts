import { type Page, type Frame } from 'playwright';
import fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BROWSERGYM_ID_ATTRIBUTE as BID_ATTR } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MarkingError extends Error {}

function getScriptContent(filename: string): string {
    return fs.readFileSync(path.join(__dirname, 'javascript', filename), 'utf-8');
}

export async function preExtract(page: Page, tagsToMark: "all" | "standard_html" = "standard_html") {
    const jsFrameMarkElements = getScriptContent('frame_mark_elements.js');

    async function markFramesRecursive(frame: Frame, frameBid: string) {
        if (frameBid !== "" && !/^[a-z][a-zA-Z]*$/.test(frameBid)) {
            throw new Error(`Invalid frameBid: ${frameBid}`);
        }

        try {
             // We evaluate the script in the frame. The script expects an array of arguments.
             // Note: In the python version, it passes [frame_bid, BID_ATTR, tags_to_mark]
             // The JS script we saved is an async function taking an array.
             const warningMsgs = await frame.evaluate(jsFrameMarkElements, [frameBid, BID_ATTR, tagsToMark]);
             
             if (Array.isArray(warningMsgs)) {
                 warningMsgs.forEach(msg => console.warn(msg));
             }
        } catch (e) {
            console.warn(`Error marking frame ${frame.name()}: ${e}`);
        }

        for (const childFrame of frame.childFrames()) {
            if (childFrame.isDetached()) continue;
            
            try {
                const childFrameElem = await childFrame.frameElement();
                const contentFrame = await childFrameElem.contentFrame();
                if (contentFrame !== childFrame) {
                     console.warn(`Skipping frame '${childFrame.name()}' for marking, seems problematic.`);
                     continue;
                }
                
                const sandboxAttr = await childFrameElem.getAttribute("sandbox");
                if (sandboxAttr !== null && !sandboxAttr.split(/\s+/).includes("allow-scripts")) {
                    continue;
                }

                const childFrameBid = await childFrameElem.getAttribute(BID_ATTR);
                if (childFrameBid === null) {
                    // This might happen if the frame wasn't marked in the parent. 
                    // The python code raises MarkingError.
                    // For robustness, we can log or throw.
                    throw new MarkingError("Cannot mark a child frame without a bid.");
                }
                
                await markFramesRecursive(childFrame, childFrameBid);

            } catch (e) {
                console.warn(`Error processing child frame: ${e}`);
            }
        }
    }

    await markFramesRecursive(page.mainFrame(), "");
}

export async function postExtract(page: Page) {
    const jsFrameUnmarkElements = getScriptContent('frame_unmark_elements.js');

    for (const frame of page.frames()) {
        try {
            if (frame !== page.mainFrame()) {
                 // checks similar to preExtract
                 const frameElem = await frame.frameElement();
                 if (await frameElem.contentFrame() !== frame) continue;
                 const sandboxAttr = await frameElem.getAttribute("sandbox");
                 if (sandboxAttr !== null && !sandboxAttr.split(/\s+/).includes("allow-scripts")) continue;
            }
            await frame.evaluate(jsFrameUnmarkElements);
        } catch (e: any) {
            const msg = e.message || String(e);
            if (msg.includes("Frame was detached") || msg.includes("Frame has been detached")) {
                // ignore
            } else {
                throw e;
            }
        }
    }
}

export async function extractScreenshot(page: Page): Promise<Buffer> {
    const cdp = await page.context().newCDPSession(page);
    const result = await cdp.send("Page.captureScreenshot", { format: "png" });
    await cdp.detach();
    return Buffer.from(result.data, 'base64');
}

// Helper to manage CDPSession for DOMSnapshot
export async function extractDOMSnapshot(
    page: Page,
    computedStyles: string[] = [],
    includeDOMRects: boolean = true,
    includePaintOrder: boolean = true,
    tempDataCleanup: boolean = true
): Promise<any> {
    const cdp = await page.context().newCDPSession(page);
    const domSnapshot = await cdp.send("DOMSnapshot.captureSnapshot", {
        computedStyles,
        includeDOMRects,
        includePaintOrder
    });
    await cdp.detach();

    if (tempDataCleanup) {
        popBidsFromAttribute(domSnapshot, "aria-roledescription");
        popBidsFromAttribute(domSnapshot, "aria-description");
    }

    return domSnapshot;
}

const BID_EXPR = "([a-zA-Z0-9]+)";
const DATA_REGEXP = new RegExp(`^browsergym_id_${BID_EXPR}\\s?(.*)`);

function extractDataItemsFromAria(str: string): [string[], string] {
    const match = str.match(DATA_REGEXP);
    if (!match) {
        // console.warn(`Failed to extract BrowserGym data from ARIA string: ${str}`);
        return [[], str];
    }
    // match[1] is the bid, match[2] is the rest
    const bid = match[1] || "";
    const rest = match[2] || "";
    return [[bid], rest];
}

function popBidsFromAttribute(domSnapshot: any, attr: string) {
    const strings = domSnapshot.strings as string[];
    const targetAttrNameId = strings.indexOf(attr);
    
    if (targetAttrNameId > -1) {
        const processedStringIds = new Set<number>();
        for (const document of domSnapshot.documents) {
            if (document.nodes.attributes) {
                for (const nodeAttributes of document.nodes.attributes) {
                     for (let i = 0; i < nodeAttributes.length; i += 2) {
                         const attrNameId = nodeAttributes[i];
                         const attrValueId = nodeAttributes[i+1];
                         if (attrNameId === targetAttrNameId) {
                             let attrValue = strings[attrValueId];
                             if (attrValue === undefined) attrValue = "";
                             if (!processedStringIds.has(attrValueId)) {
                                 const [_, newAttrValue] = extractDataItemsFromAria(attrValue);
                                 strings[attrValueId] = newAttrValue;
                                 processedStringIds.add(attrValueId);
                                 attrValue = newAttrValue;
                             }
                             if (attrValue === "") {
                                 nodeAttributes.splice(i, 2);
                                 // We break because we found the attribute for this node and processed it.
                                 break;
                             }
                             break; // Found the attribute, done for this node.
                         }
                     }
                }
            }
        }
    }
}


export async function extractMergedAXTree(page: Page): Promise<any> {
    const frameAXTrees = await extractAllFrameAXTrees(page);
    const cdp = await page.context().newCDPSession(page);

    const mergedAXTree: any = { nodes: [] };
    
    for (const axTree of Object.values(frameAXTrees)) {
        mergedAXTree.nodes.push(...(axTree as any).nodes);
        
        for (const node of (axTree as any).nodes) {
            if (node.role && node.role.value === "Iframe") {
                try {
                    const nodeDesc = await cdp.send("DOM.describeNode", { backendNodeId: node.backendDOMNodeId });
                    const frameId = nodeDesc.node?.frameId;
                    
                    if (frameId && frameAXTrees[frameId]) {
                         const frameRootNode = (frameAXTrees[frameId] as any).nodes[0];
                         // frameRootNode.frameId should be frameId.
                         if (!node.childIds) node.childIds = [];
                         node.childIds.push(frameRootNode.nodeId);
                    }
                } catch (e) {
                    console.warn(`AXTree merging error: ${e}`);
                }
            }
        }
    }
    
    await cdp.detach();
    return mergedAXTree;
}

async function extractAllFrameAXTrees(page: Page): Promise<{[frameId: string]: any}> {
    const cdp = await page.context().newCDPSession(page);
    const { frameTree } = await cdp.send("Page.getFrameTree");
    
    const frameIds: string[] = [];
    const stack = [frameTree];
    while (stack.length > 0) {
        const frame = stack.pop()!;
        frameIds.push(frame.frame.id);
        if (frame.childFrames) {
            stack.push(...frame.childFrames);
        }
    }

    const frameAXTrees: {[frameId: string]: any} = {};
    for (const frameId of frameIds) {
        try {
            frameAXTrees[frameId] = await cdp.send("Accessibility.getFullAXTree", { frameId });
        } catch(e) {
            console.warn(`Failed to get AXTree for frame ${frameId}: ${e}`);
        }
    }
    await cdp.detach();

    // Process browsergym data from ARIA attributes in AXTree
    for (const axTree of Object.values(frameAXTrees)) {
        for (const node of (axTree as any).nodes) {
            let dataItems: string[] = [];
            
            // check roledescription
            if (node.properties) {
                for (let i = 0; i < node.properties.length; i++) {
                    const prop = node.properties[i];
                    if (prop.name === "roledescription") {
                        const [items, newValue] = extractDataItemsFromAria(prop.value.value);
                        dataItems = items;
                        prop.value.value = newValue;
                        if (newValue === "") {
                            node.properties.splice(i, 1);
                            i--;
                        }
                        break;
                    }
                }
            }

            // check description (fallback)
            if (node.description) {
                const [itemsBis, newValue] = extractDataItemsFromAria(node.description.value);
                node.description.value = newValue;
                if (newValue === "") {
                    delete node.description;
                }
                if (dataItems.length === 0) {
                    dataItems = itemsBis;
                }
            }

            if (dataItems.length > 0) {
                node.browsergym_id = dataItems[0];
            }
        }
    }

    return frameAXTrees;
}

export async function extractFocusedElementBid(page: Page): Promise<string> {
    const script = `() => {
        function getActiveElement(root) {
            const active_element = root.activeElement;
            if (!active_element) return null;
            if (active_element.shadowRoot) return getActiveElement(active_element.shadowRoot);
            return active_element;
        }
        return getActiveElement(document);
    }`;

    let frame: Frame | null = page.mainFrame();
    let focusedBid = "";
    
    while (frame) {
        try {
            const handle = await frame.evaluateHandle(script) as any;
            const element = handle.asElement() as any;
            if (element) {
                 // Check if it's an iframe to descend
                 const tagName = await element.evaluate((el: Element) => el.tagName.toLowerCase());
                 if (tagName === 'iframe' || tagName === 'frame') {
                     const nextFrame: Frame | null = await element.contentFrame();
                     const bid = await element.getAttribute(BID_ATTR);
                     if (bid) focusedBid = bid;
                     frame = nextFrame;
                 } else {
                     const bid = await element.getAttribute(BID_ATTR);
                     if (bid) focusedBid = bid;
                     frame = null; // Stop
                 }
            } else {
                frame = null;
            }
        } catch (e) {
            frame = null;
        }
    }
    return focusedBid;
}
