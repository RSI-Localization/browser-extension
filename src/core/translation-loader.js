import {LocaleManager} from './locale-manager';
import {LocaleStorage} from '../utils/locale-storage';
import {LocaleAPI} from '../utils/locale-api';

export class TranslationLoader {
    constructor() {
        this.translationCache = new Map();
        this.localeManager = new LocaleManager();
    }

    async load(locale, currentPath) {
        if (locale === 'en') {
            return { page: { data: {} } };
        }

        const pathParts = currentPath.split('/').filter(Boolean);
        const section = pathParts[0] || 'main';
        const cacheKey = `${locale}_${section}_${currentPath}`;

        // Check memory cache
        if (this.translationCache.has(cacheKey)) {
            return {
                page: this.translationCache.get(cacheKey)
            };
        }

        // Check local storage
        const storedData = await LocaleStorage.getLocaleData(locale, currentPath);
        if (storedData?.data) {
            const translationData = {
                data: storedData.data,
                version: storedData.version
            };
            this.translationCache.set(cacheKey, translationData);
            return {
                page: translationData
            };
        }

        // Load fresh data
        return this.loadFresh(locale, currentPath);
    }

    async loadFresh(locale, currentPath) {
        if (locale === 'en') {
            return { page: { data: {} } };
        }

        const pathParts = currentPath.split('/').filter(Boolean);
        const section = pathParts[0] || 'main';
        const cacheKey = `${locale}_${section}_${currentPath}`;

        try {
            const data = await this.localeManager.getLocaleData(locale, currentPath);
            if (data) {
                const translationData = {
                    data: data,
                    version: data.version
                };

                this.translationCache.set(cacheKey, translationData);
                await LocaleStorage.saveLocaleData(locale, currentPath, data);

                return {
                    page: translationData
                };
            }
        } catch (error) {
            console.error('Failed to load fresh translations:', error);
        }

        return {
            page: {
                data: {},
                version: null
            }
        };
    }

    clearCache() {
        this.translationCache.clear();
    }
}