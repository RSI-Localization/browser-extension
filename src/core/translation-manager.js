import {TranslationLoader} from './translation-loader';
import {LocaleManager} from './locale-manager';
import {LocaleStorage} from '../utils/locale-storage';

export class TranslationManager {
    constructor() {
        this.translations = new Map();
        this.translationLoader = new TranslationLoader();
        this.localeManager = new LocaleManager();
    }

    async load(currentPath) {
        await LocaleStorage.setCurrentPath(currentPath);
        const currentLocale = await LocaleStorage.getCurrentLocale();
        const translations = await this.translationLoader.load(currentLocale, currentPath);

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
        currentTranslations.data = {
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
    }
}