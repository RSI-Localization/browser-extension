import {LocaleStorage} from "../utils/locale-storage";

export class DOMManager {
    constructor() {
        this.excludeSelectors = [
            'script', 'style', 'code', 'pre', 'iframe',
            '[data-no-translate]', // Custom attribute to skip translation
        ].join(',');

        this.translatableAttributes = ['placeholder', 'title', 'alt', 'aria-label'];
        this.translationCache = new Map();
        this.observer = null;
        this.textProcessor = null;
        this.translationManager = null;
    }

    async load(textProcessor, translationManager) {
        this.textProcessor = textProcessor;
        this.translationManager = translationManager;

        await this.translateVisibleContent();
        this.setupIntersectionObserver();
        this.setupMutationObserver();
        this.setupRouteChangeListener();
    }

    async translateVisibleContent() {
        const elements = document.body.querySelectorAll(`*:not(${this.excludeSelectors})`);
        const visibleElements = Array.from(elements).filter(el =>
            !el.closest(this.excludeSelectors) && this.isElementVisible(el)
        );

        await Promise.all(visibleElements.map(el => this.translateElement(el)));
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver(async (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !entry.target.hasAttribute('data-translated')) {
                    await this.translateElement(entry.target);
                }
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
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            changes.add(this.translateElement(node));
                        }
                    });
                }

                if (mutation.type === 'characterData' && !this.isExcluded(mutation.target)) {
                    changes.add(this.translateTextNode(mutation.target));
                }

                if (mutation.type === 'attributes' &&
                    this.translatableAttributes.includes(mutation.attributeName)) {
                    changes.add(this.translateAttributes(mutation.target));
                }
            }

            await Promise.all(changes);
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
        // Handle HTML5 History API
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

        await this.translateVisibleContent();
    }

    async translateElement(element) {
        if (this.isExcluded(element)) return;

        const textNodes = this.getTextNodes(element);
        await Promise.all(textNodes.map(node => this.translateTextNode(node)));

        await this.translateAttributes(element);

        element.setAttribute('data-translated', 'true');
    }

    async translateTextNode(node) {
        const text = node.textContent.trim();
        if (!text) return;

        const cacheKey = `text:${text}`;
        if (!this.translationCache.has(cacheKey)) {
            const processed = this.textProcessor.processText(text);
            const translated = await this.translationManager.translate(processed.pattern);
            this.translationCache.set(cacheKey, translated);
        }

        const translation = this.translationCache.get(cacheKey);
        if (translation !== text) {
            node.textContent = translation;
        }
    }

    async translateAttributes(element) {
        for (const attr of this.translatableAttributes) {
            if (!element.hasAttribute(attr)) continue;

            const value = element.getAttribute(attr);
            const cacheKey = `attr:${attr}:${value}`;

            if (!this.translationCache.has(cacheKey)) {
                const processed = this.textProcessor.processText(value);
                const translated = await this.translationManager.translate(processed.pattern);
                this.translationCache.set(cacheKey, translated);
            }

            const translation = this.translationCache.get(cacheKey);
            if (translation !== value) {
                element.setAttribute(attr, translation);
            }
        }
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