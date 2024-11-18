import QuickLRU from 'quick-lru';

export class DOMManager {
    constructor() {
        this.excludeSelectors = [
            'script', 'style', 'code', 'pre', 'iframe'
        ].join(',');

        this.translatableAttributes = ['placeholder', 'title', 'alt', 'aria-label'];
        this.translationCache = new QuickLRU({ maxSize: 2000 });
        this.textProcessor = null;
        this.translationManager = null;
        this.batchSize = 50;
        this.batchDelay = 16;
    }

    async load(textProcessor, translationManager) {
        this.textProcessor = textProcessor;
        this.translationManager = translationManager;

        await this.processVisibleContent();
        this.setupIntersectionObserver();
        this.setupMutationObserver();
        this.setupRouteChangeListener();
    }

    async processVisibleContent() {
        const elements = document.body.querySelectorAll(`*:not(${this.excludeSelectors})`);
        const visibleElements = Array.from(elements).filter(el =>
            !el.closest(this.excludeSelectors) && this.isElementVisible(el)
        );

        for (let i = 0; i < visibleElements.length; i += this.batchSize) {
            const batch = visibleElements.slice(i, i + this.batchSize);
            await Promise.all(batch.map(el => this.translateElement(el)));
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver(async (entries) => {
            const visibleElements = entries
                .filter(entry => entry.isIntersecting)
                .map(entry => entry.target)
                .filter(el => !el.hasAttribute('data-translated'));

            for (let i = 0; i < visibleElements.length; i += this.batchSize) {
                const batch = visibleElements.slice(i, i + this.batchSize);
                await Promise.all(batch.map(el => this.translateElement(el)));
                await new Promise(resolve => setTimeout(resolve, this.batchDelay));
            }
        }, { rootMargin: '50px' });

        this.observeNewElements(observer);
    }

    setupMutationObserver() {
        const observer = new MutationObserver(async (mutations) => {
            const changes = new Set();

            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && !this.isExcluded(node)) {
                            changes.add(node);
                        }
                    });
                }

                if (mutation.type === 'characterData' && !this.isExcluded(mutation.target)) {
                    const cacheKey = this.getCacheKey(mutation.target.textContent);
                    this.translationCache.delete(cacheKey);
                    changes.add(mutation.target.parentElement);
                }

                if (mutation.type === 'attributes' &&
                    this.translatableAttributes.includes(mutation.attributeName)) {
                    const cacheKey = this.getCacheKey(mutation.target.getAttribute(mutation.attributeName));
                    this.translationCache.delete(cacheKey);
                    changes.add(mutation.target);
                }
            }

            const elementsToTranslate = Array.from(changes);
            for (let i = 0; i < elementsToTranslate.length; i += this.batchSize) {
                const batch = elementsToTranslate.slice(i, i + this.batchSize);
                await Promise.all(batch.map(el => this.translateElement(el)));
                await new Promise(resolve => setTimeout(resolve, this.batchDelay));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: this.translatableAttributes
        });

        this.observer = observer;
    }

    setupRouteChangeListener() {
        const originalPushState = history.pushState;
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.handleRouteChange().then();
        };

        window.addEventListener('popstate', () => this.handleRouteChange());
        window.addEventListener('hashchange', () => this.handleRouteChange());
    }

    async handleRouteChange() {
        this.translationCache.clear();
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.processVisibleContent();
    }

    async translateElement(element) {
        if (this.isExcluded(element)) return;

        const textNodes = this.getTextNodes(element);
        await Promise.all([
            ...textNodes.map(node => this.translateTextNode(node)),
            this.translateAttributes(element)
        ]);

        element.setAttribute('data-translated', 'true');
    }

    async translateTextNode(node) {
        const text = node.textContent.trim();
        if (!text) return;

        const cacheKey = this.getCacheKey(text);
        let translation = this.translationCache.get(cacheKey);

        if (!translation) {
            const processed = this.textProcessor.processText(text);
            translation = await this.translationManager.translate(processed.pattern);
            this.translationCache.set(cacheKey, translation);
        }

        if (translation !== text) {
            node.textContent = translation;
        }
    }

    async translateAttributes(element) {
        for (const attr of this.translatableAttributes) {
            if (!element.hasAttribute(attr)) continue;

            const value = element.getAttribute(attr);
            const cacheKey = this.getCacheKey(`attr:${attr}:${value}`);
            let translation = this.translationCache.get(cacheKey);

            if (!translation) {
                const processed = this.textProcessor.processText(value);
                translation = await this.translationManager.translate(processed.pattern);
                this.translationCache.set(cacheKey, translation);
            }

            if (translation !== value) {
                element.setAttribute(attr, translation);
            }
        }
    }

    getCacheKey(text) {
        return `${text.length}:${text}`;
    }

    isExcluded(node) {
        return node.closest?.(this.excludeSelectors);
    }

    isElementVisible(element) {
        return element.offsetParent !== null;
    }

    getTextNodes(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    return node.textContent.trim() && !this.isExcluded(node.parentElement)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT;
                }
            }
        );

        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            nodes.push(node);
        }
        return nodes;
    }

    observeNewElements(observer) {
        document.querySelectorAll(`*:not(${this.excludeSelectors})`).forEach(el => {
            if (!el.closest(this.excludeSelectors)) {
                observer.observe(el);
            }
        });

        new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && !this.isExcluded(node)) {
                        observer.observe(node);
                    }
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
}