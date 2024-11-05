export class DOMManager {
    constructor() {
        this.excludeTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'IFRAME'];
        this.localizableAttributes = ['placeholder', 'title', 'alt', 'aria-label'];
        this.processedNodes = new WeakSet();
        this.mutationObserver = null;
    }

    load(textProcessor, translationManager) {
        this.processElement(document.body, textProcessor, translationManager).then();
        this.observeMutations((node) => {
            this.processElement(node, textProcessor, translationManager).then();
        });
    }

    async processElement(element, textProcessor, translationManager) {
        if (Array.isArray(element)) {
            for (const node of element) {
                if (node instanceof Node) {
                    await this.processElement(node, textProcessor, translationManager);
                }
            }

            return;
        }

        if (!(element instanceof Node)) {
            return;
        }

        const nodesToProcess = this.collectNodes(element);

        nodesToProcess.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                const originalText = node.textContent.trim();

                if (originalText) {
                    const processed = textProcessor.processText(originalText);
                    const translatedPattern = translationManager.translate(processed.pattern);
                    const translatedText = textProcessor.restoreText(translatedPattern, processed.tokens);

                    this.applyTranslation(node, originalText, translatedText);
                    this.processedNodes.add(node);
                }
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                this.localizableAttributes.forEach(attr => {
                    if (node.hasAttribute(attr)) {
                        const originalValue = node.getAttribute(attr);
                        const processed = textProcessor.processText(originalValue);
                        const translatedPattern = translationManager.translate(processed.pattern);
                        const translatedValue = textProcessor.restoreText(translatedPattern, processed.tokens);

                        node.setAttribute(attr, translatedValue);
                    }
                });

                this.processedNodes.add(node);
            }
        });
    }

    collectNodes(element) {
        const nodes = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (this.processedNodes.has(node)) return NodeFilter.FILTER_REJECT;

                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent.trim();
                        // 공백이 아닌 텍스트만 포함
                        if (text && /\S/.test(text)) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (node.nodeType === Node.ELEMENT_NODE) {
                        return this.excludeTags.includes(node.tagName.toUpperCase())
                            ? NodeFilter.FILTER_REJECT
                            : NodeFilter.FILTER_ACCEPT;
                    }

                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            nodes.push(node);
        }

        return nodes;
    }

    applyTranslation(node, originalText, translatedText) {
        const parent = node.parentNode;

        if (originalText === translatedText) {
            return;
        }

        if (parent.childNodes.length === 1) {
            parent.classList.add('localized');
            parent.dataset.originalText = originalText;
            node.textContent = translatedText;

            return;
        }

        // 여러 노드가 있는 경우 span으로 래핑
        const span = document.createElement('span');

        span.classList.add('localized');
        span.dataset.originalText = originalText;
        span.textContent = translatedText;
        node.parentNode.replaceChild(span, node);
    }

    observeMutations(callback) {
        this.mutationObserver = new MutationObserver((mutations) => {
            const addedNodes = [];

            mutations.forEach(mutation => {
                // 텍스트 노드 변경 감지
                if (mutation.type === 'characterData') {
                    const node = mutation.target;
                    if (!this.processedNodes.has(node)) {
                        addedNodes.push(node);
                    }
                }

                // 새로 추가된 노드 감지
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && !this.processedNodes.has(node)) {
                        addedNodes.push(node);
                    }
                });
            });

            if (addedNodes.length > 0) {
                callback(addedNodes);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true
        });
    }
}