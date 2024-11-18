import i18next from 'i18next';

export class TextProcessor {
    constructor() {
        this.quotationMap = {
            "'": ["'", "‘", "’"],
            "\"": ["\"",]
        };
        this.cache = new Map();
        this.initI18next();
    }

    initI18next() {
        i18next.init({
            interpolation: {
                escapeValue: false,
                format: (value, format, lng) => {
                    if (format === 'number') {
                        return new Intl.NumberFormat(lng).format(value);
                    }
                    if (format === 'date') {
                        return new Intl.DateTimeFormat(lng).format(value);
                    }
                    return value;
                }
            }
        }).then();
    }

    normalizeQuotations(text) {
        const cacheKey = `normalize_${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let normalized = text;
        Object.entries(this.quotationMap).forEach(([standard, variants]) => {
            variants.forEach(variant => {
                normalized = normalized.replace(new RegExp(variant, 'g'), standard);
            });
        });

        this.cache.set(cacheKey, normalized);
        return normalized;
    }

    processText(originalText, tokens = {}) {
        const cacheKey = `process_${originalText}_${JSON.stringify(tokens)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const normalizedText = this.normalizeQuotations(originalText);
        const result = {
            original: originalText,
            translated: normalizedText,
            pattern: normalizedText,
            tokens: tokens
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    restoreText(translatedPattern, tokens) {
        const cacheKey = `restore_${translatedPattern}_${JSON.stringify(tokens)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const result = i18next.t(translatedPattern, tokens);
        this.cache.set(cacheKey, result);
        return result;
    }

    clearCache() {
        this.cache.clear();
    }
}
