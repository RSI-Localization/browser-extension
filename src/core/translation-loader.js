import {LocaleManager} from './locale-manager';
import {LocaleStorage} from '../utils/locale-storage';

export class TranslationLoader {
    constructor() {
        this.translationCache = new Map();
        this.localeManager = new LocaleManager();
        this.setupUpdateListener();
    }

    async load(locale, currentPath) {
        if (locale === 'en') {
            return {
                page: {}
            };
        }

        const cacheKey = `${locale}_${currentPath}`;

        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        const storedData = await LocaleStorage.getLocaleData(locale, currentPath);
        if (storedData?.data) {
            const translations = { page: storedData.data };
            this.translationCache.set(cacheKey, translations);

            return translations;
        }

        const translations = await this.localeManager.getLocaleData(locale, currentPath);
        if (translations) {
            await LocaleStorage.saveLocaleData(locale, currentPath, translations);
            const result = { page: translations };
            this.translationCache.set(cacheKey, result);

            return result;
        }

        return {
            page: {}
        };
    }

    setupUpdateListener() {
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'localeUpdated') {
                const cacheKey = `${message.locale}_${message.path}`;
                this.translationCache.delete(cacheKey);
            }
        });
    }

    clearCache() {
        this.translationCache.clear();
    }
}