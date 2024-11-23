import {TranslationLoader} from './translation-loader';
import {LocaleManager} from './locale-manager';
import {LocaleStorage} from '../utils/locale-storage';

export class TranslationManager {
    constructor() {
        this.translations = new Map();
        this.translationLoader = new TranslationLoader();
        this.localeManager = new LocaleManager();
        this.currentPath = null;
        this.commonTranslations = new Map();
    }

    async load(currentPath) {
        this.currentPath = currentPath;
        await LocaleStorage.setCurrentPath(currentPath);
        const currentLocale = await LocaleStorage.getCurrentLocale();

        if (currentLocale === 'en') {
            return { page: { data: {} } };
        }

        // Load common translations if not loaded
        if (!this.commonTranslations.has(currentLocale)) {
            const commonData = await this.localeManager.loadCommonTranslations(currentLocale);
            if (commonData) {
                this.commonTranslations.set(currentLocale, commonData);
            }
        }

        // Load page translations
        const translations = await this.translationLoader.load(currentLocale, currentPath);
        if (translations?.page?.data) {
            this.setTranslations(translations.page, currentLocale);
        }

        return translations;
    }

    async refresh() {
        if (!this.currentPath) return null;

        const currentLocale = await LocaleStorage.getCurrentLocale();
        if (currentLocale === 'en') return null;

        // Refresh common translations
        const commonData = await this.localeManager.loadCommonTranslations(currentLocale, true);
        if (commonData) {
            this.commonTranslations.set(currentLocale, commonData);
        }

        // Refresh page translations
        const translations = await this.translationLoader.loadFresh(currentLocale, this.currentPath);
        if (translations?.page?.data) {
            this.setTranslations(translations.page, currentLocale);
        }

        return translations;
    }

    setTranslations(translations, locale) {
        if (!this.translations.has(locale)) {
            this.translations.set(locale, {data: {}});
        }

        const currentTranslations = this.translations.get(locale);
        const commonData = this.commonTranslations.get(locale) || {};

        currentTranslations.data = {
            ...commonData,
            ...currentTranslations.data,
            ...translations.data
        };
    }

    async translate(text, params = {}) {
        const currentLocale = await LocaleStorage.getCurrentLocale();
        const translations = this.translations.get(currentLocale);

        if (!translations || currentLocale === 'en') {
            return this.interpolate(text, params);
        }

        const translation = translations.data[text] || text;
        return this.interpolate(translation, params);
    }

    interpolate(text, params) {
        return text.replace(/\{(\w+)}/g, (_, key) => {
            return params[key] !== undefined ? params[key] : `{${key}}`;
        });
    }

    clearCache() {
        this.translationLoader.clearCache();
        this.translations.clear();
        this.commonTranslations.clear();
        this.currentPath = null;
    }

    getCurrentTranslations(locale) {
        return this.translations.get(locale)?.data || {};
    }

    hasTranslations(locale) {
        return this.translations.has(locale) &&
            Object.keys(this.translations.get(locale).data).length > 0;
    }
}