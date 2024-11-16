export class TranslationWorker {
    constructor() {
        this.setupWorker();

    }

    setupWorker() {
        const listener = (message, sender, sendResponse) => {
            if (message.type === 'TRANSLATE') {
                const { nodes, translations } = message.data;
                const processedNodes = this.processNodes(nodes, translations);
                sendResponse({ processedNodes });
            }
            return true;
        };

        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }

    processNodes(nodes, translations) {
        return nodes.map(node => {
            const { text, type, attributes } = node;

            if (type === 'TEXT_NODE') {
                const translatedText = translations[text] || text;

                return {
                    type: 'TEXT_NODE',
                    originalText: text,
                    translatedText: translatedText
                };
            }

            if (type === 'ELEMENT_NODE') {
                const translatedAttributes = {};

                for (const [key, value] of Object.entries(attributes)) {
                    translatedAttributes[key] = translations[value] || value;
                }

                return {
                    type: 'ELEMENT_NODE',
                    originalText: text,
                    attributes: translatedAttributes
                };
            }
        });
    }

    postMessage(data) {
        chrome.runtime.sendMessage({ type: 'TRANSLATE', data });
    }

    onMessage(callback) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'TRANSLATION_COMPLETE') {
                callback(message);
            }
        });
    }
}