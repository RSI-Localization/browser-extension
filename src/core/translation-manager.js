import { TranslationLoader } from './translation-loader';

export class TranslationManager {
    constructor() {
        this.currentLocale = 'en';
        this.translations = new Map();
        this.initialized = false;
        this.translationLoader = new TranslationLoader();
    }

    async init(defaultLocale = 'en') {
        this.currentLocale = defaultLocale;
        this.initialized = true;
    }

    async load(currentPath) {
        if (!this.initialized) {
            throw new Error('TranslationManager not initialized');
        }

        const translations = await this.translationLoader.load(this.currentLocale, currentPath);
        this.setTranslations(translations.page);
        return translations;
    }

    setTranslations(translations) {
        if (!this.initialized) {
            throw new Error('TranslationManager not initialized');
        }

        if (!this.translations.has(this.currentLocale)) {
            this.translations.set(this.currentLocale, {strings: {}});
        }

        const currentTranslations = this.translations.get(this.currentLocale);
        currentTranslations.strings = {
            ...currentTranslations.strings,
            ...(translations.strings || translations)
        };
    }

    translate(text, params = {}) {
        if (!this.initialized || this.currentLocale === 'en') {
            return text;
        }

        const translations = this.translations.get(this.currentLocale);
        if (!translations) {
            return text;
        }

        const translation = translations['strings'][text] || text;
        return this.interpolate(translation, params);
    }

    interpolate(text, params) {
        return text.replace(/\{(\w+)}/g, (_, key) => {
            return params[key] !== undefined ? params[key] : `{${key}}`;
        });
    }

    clearCache() {
        this.translationLoader.clearCache();
    }
}
