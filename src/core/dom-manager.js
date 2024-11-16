import {LocaleStorage} from "../utils/locale-storage";

export class DOMManager {
    constructor() {
        this.excludeTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'IFRAME'];
        this.localizableAttributes = ['placeholder', 'title', 'alt', 'aria-label'];
        this.processedNodes = new WeakSet();
        this.mutationObserver = null;
        this.processingQueue = new Set();
    }

    async load(textProcessor, translationManager) {
        await this.processElement(document.body, textProcessor, translationManager);
        this.observeMutations((nodes) => {
            this.processNodes(nodes, textProcessor, translationManager);
        });
    }

    async processNodes(nodes, textProcessor, translationManager) {
        for (const node of nodes) {
            if (!this.processingQueue.has(node)) {
                this.processingQueue.add(node);
                await this.processElement(node, textProcessor, translationManager);
                this.processingQueue.delete(node);
            }
        }
    }

    async processElement(element, textProcessor, translationManager) {
        if (!element || this.processedNodes.has(element)) return;

        const nodesToProcess = this.collectNodes(element);
        const currentLocale = await LocaleStorage.getCurrentLocale();

        if (currentLocale === 'en') {
            this.processedNodes.add(element);
            return;
        }

        for (const node of nodesToProcess) {
            if (node.nodeType === Node.TEXT_NODE) {
                const originalText = node.textContent.trim();
                if (originalText) {
                    const processed = textProcessor.processText(originalText);
                    const translatedPattern = await translationManager.translate(processed.pattern);
                    const translatedText = textProcessor.restoreText(translatedPattern, processed.tokens);
                    this.applyTranslation(node, originalText, translatedText);
                }
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                await this.processAttributes(node, textProcessor, translationManager);
            }

            this.processedNodes.add(node);
        }
    }

    async processAttributes(node, textProcessor, translationManager) {
        for (const attr of this.localizableAttributes) {
            if (node.hasAttribute(attr)) {
                const originalValue = node.getAttribute(attr);
                const processed = textProcessor.processText(originalValue);
                const translatedPattern = await translationManager.translate(processed.pattern);
                const translatedValue = textProcessor.restoreText(translatedPattern, processed.tokens);
                node.setAttribute(attr, translatedValue);
            }
        }
    }

    collectNodes(element) {
        const nodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (this.processedNodes.has(node)) return NodeFilter.FILTER_REJECT;
                    if (this.shouldExcludeNode(node)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            nodes.push(node);
        }

        return nodes;
    }

    shouldExcludeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return !node.textContent.trim() || !(/\S/.test(node.textContent));
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            return this.excludeTags.includes(node.tagName.toUpperCase());
        }

        return true;
    }

    applyTranslation(node, originalText, translatedText) {
        if (originalText === translatedText) return;

        const parent = node.parentNode;
        if (parent.childNodes.length === 1) {
            parent.classList.add('localized');
            parent.dataset.originalText = originalText;
            node.textContent = translatedText;
            return;
        }

        const span = document.createElement('span');
        span.classList.add('localized');
        span.dataset.originalText = originalText;
        span.textContent = translatedText;
        node.parentNode.replaceChild(span, node);
    }

    observeMutations(callback) {
        this.mutationObserver = new MutationObserver((mutations) => {
            const nodesToProcess = new Set();

            mutations.forEach(mutation => {
                if (mutation.type === 'characterData') {
                    const textNode = mutation.target;
                    if (!this.shouldExcludeNode(textNode)) {
                        this.processedNodes.delete(textNode);
                        nodesToProcess.add(textNode);
                    }
                }

                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    mutation.target.querySelectorAll('.localized').forEach(node => {
                        const currentText = node.textContent;
                        const originalText = node.dataset.originalText;

                        if (currentText !== originalText) {
                            this.processedNodes.delete(node);
                            nodesToProcess.add(node);
                        }
                    });
                }

                mutation.addedNodes.forEach(node => {
                    if (!this.shouldExcludeNode(node)) {
                        nodesToProcess.add(node);
                    }
                });
            });

            if (nodesToProcess.size > 0) {
                callback(Array.from(nodesToProcess));
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
            attributes: true,           // 속성 변경 감지 추가
            attributeOldValue: true     // 이전 속성값 저장
        });
    }
}