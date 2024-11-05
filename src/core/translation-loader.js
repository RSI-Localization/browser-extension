import { CONFIG } from '../config';
import { LocaleAPI } from '../utils/api';
import { StorageManager } from '../utils/storage';

export class TranslationLoader {
    constructor() {
        this.translationCache = new Map();
        this.pendingUpdates = new Map();
    }

    async load(locale, currentPath) {
        if (locale === 'en') {
            return { page: {} };
        }

        const cacheKey = `${locale}_${currentPath}`;

        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        const storedData = await StorageManager.getLocaleData(locale, currentPath);
        if (storedData?.data) {
            this.translationCache.set(cacheKey, {
                page: storedData.data
            });

            if (!this.pendingUpdates.has(cacheKey)) {
                this.pendingUpdates.set(cacheKey, true);
                await this.checkForUpdatesInBackground(locale, currentPath);
                this.pendingUpdates.delete(cacheKey);
            }

            return {
                page: storedData.data
            };
        }

        const translations = await this.fetchFromAPI(locale, currentPath);
        await StorageManager.saveLocaleData(locale, currentPath, translations.page);

        this.translationCache.set(cacheKey, translations);
        return translations;
    }

    async fetchFromAPI(locale, currentPath) {
        const bulkOptions = this.prepareBulkOptions(currentPath);
        const response = await LocaleAPI.getBulkResources('website', locale, bulkOptions);
        return {
            page: response.data
        };
    }

    prepareBulkOptions(currentPath) {
        const bulkOptions = {
            modules: [],
            standalone: [],
            includeCommon: true
        };

        const isStandalone = Object.values(CONFIG.PATHS.STANDALONE)
            .some(path => currentPath.includes(path));

        if (isStandalone) {
            bulkOptions.standalone.push(currentPath);
            bulkOptions.includeCommon = false;
        } else {
            bulkOptions.modules.push(currentPath);
        }

        if (bulkOptions.includeCommon) {
            Object.values(CONFIG.PATHS.COMMON).forEach(path => {
                if (path.startsWith('modules/')) {
                    bulkOptions.modules.push(path.replace('modules/', ''));
                }
            });
        }

        return bulkOptions;
    }

    async checkForUpdatesInBackground(locale, currentPath) {
        if (locale === 'en' || !navigator.onLine) return;

        try {
            const hasUpdate = await LocaleAPI.checkForUpdates(locale, currentPath);
            if (hasUpdate) {
                const newData = await this.fetchFromAPI(locale, currentPath);
                await StorageManager.saveLocaleData(locale, currentPath, newData.page);

                const cacheKey = `${locale}_${currentPath}`;
                this.translationCache.set(cacheKey, newData);

                chrome.runtime.sendMessage({
                    action: 'localeUpdated',
                    locale: locale,
                    path: currentPath,
                    data: newData
                });
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    }

    clearCache() {
        this.translationCache.clear();
        this.pendingUpdates.clear();
    }
}
