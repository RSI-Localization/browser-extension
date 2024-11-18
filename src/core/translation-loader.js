import {LocaleManager} from './locale-manager';
import {LocaleStorage} from '../utils/locale-storage';

export class TranslationLoader {
    constructor() {
        this.translationCache = new Map();
        this.commonCache = new Map();
        this.localeManager = new LocaleManager();
    }

    async load(locale, currentPath) {
        if (locale === 'en') {
            return { page: { data: {} } };
        }

        const pathParts = currentPath.split('/').filter(Boolean);
        const section = pathParts[0] || 'main';
        const cacheKey = `${locale}_${section}_${currentPath}`;

        if (this.translationCache.has(cacheKey)) {
            const cached = this.translationCache.get(cacheKey);
            return {
                page: cached
            };
        }

        const translations = await this.localeManager.getLocaleData(locale, currentPath);
        if (translations) {
            const translationData = {
                data: translations,
                version: translations.version
            };
            this.translationCache.set(cacheKey, translationData);

            return {
                page: translationData
            };
        }

        return {
            page: {
                data: {},
                version: null
            }
        };
    }

    async loadCommonTranslations(locale) {
        if (this.commonCache.has(locale)) {
            return this.commonCache.get(locale);
        }

        const translations = await this.localeManager.loadCommonTranslations(locale);
        if (translations) {
            const commonData = {
                data: translations.data,
                version: translations.version
            };
            this.commonCache.set(locale, commonData);
            return commonData;
        }

        return {
            data: {},
            version: null
        };
    }

    clearCache() {
        this.translationCache.clear();
        this.commonCache.clear();
    }
}