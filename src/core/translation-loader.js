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
            return { page: {} };
        }

        const pathParts = currentPath.split('/').filter(Boolean);
        const section = pathParts[0] || 'main';
        const cacheKey = `${locale}_${section}_${currentPath}`;

        if (this.translationCache.has(cacheKey)) {
            const cached = this.translationCache.get(cacheKey);
            return {
                page: {
                    data: cached.data,
                    version: cached.version
                }
            };
        }

        const translations = await this.localeManager.getLocaleData(locale, currentPath);
        if (translations) {
            this.translationCache.set(cacheKey, {
                data: translations.data,
                version: translations.version
            });
            return {
                page: {
                    data: translations.data,
                    version: translations.version
                }
            };
        }

        return { page: {} };
    }

    async loadCommonTranslations(locale) {
        if (this.commonCache.has(locale)) {
            const cached = this.commonCache.get(locale);
            return {
                data: cached.data,
                version: cached.version
            };
        }

        const storedData = await LocaleStorage.getCommonTranslations(locale);
        if (storedData) {
            this.commonCache.set(locale, {
                data: storedData.data,
                version: storedData.version
            });
            return {
                data: storedData.data,
                version: storedData.version
            };
        }

        const translations = await this.localeManager.loadCommonTranslations(locale);
        if (translations) {
            this.commonCache.set(locale, {
                data: translations.data,
                version: translations.version
            });
            return {
                data: translations.data,
                version: translations.version
            };
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