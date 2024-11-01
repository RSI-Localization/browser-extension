import { CONFIG } from '../config';
import { LRUCache } from '../utils/lru-cache';

export class Localizer {
    constructor() {
        this.currentLocale = 'en';
        this.translations = new Map();
        this.textCache = new LRUCache(CONFIG.CACHE.SIZE || 1000);
        this.initialized = false;
        this.batchSize = CONFIG.CACHE.BATCH_SIZE || 100;
        this.processInterval = CONFIG.CACHE.PROCESS_INTERVAL || 16;
    }

    async init(defaultLocale = 'en') {
        this.currentLocale = defaultLocale;
        this.initialized = true;
    }

    setLocale(locale) {
        if (!this.initialized) {
            throw new Error('Localizer not initialized');
        }
        this.currentLocale = locale;
        this.textCache.clear();
    }

    async loadTranslations(locale, translations) {
        this.translations.set(locale, translations);
    }

    translate(text, params = {}) {
        if (!this.initialized || this.currentLocale === 'en') {
            return text;
        }

        const cacheKey = `${this.currentLocale}:${text}`;

        // 캐시된 번역이 있으면 반환
        if (this.textCache.has(cacheKey)) {
            return this.interpolate(this.textCache.get(cacheKey), params);
        }

        // 현재 로케일의 번역 데이터 가져오기
        const translations = this.translations.get(this.currentLocale);
        if (!translations) {
            return text;
        }

        // 번역된 텍스트 가져오기
        const translation = translations['strings'][text] || text;

        // 캐시에 저장
        this.textCache.set(cacheKey, translation);

        // 번역된 텍스트 반환
        return this.interpolate(translation, params);
    }

    interpolate(text, params) {
        return text.replace(/\{(\w+)}/g, (_, key) => {
            return params[key] !== undefined ? params[key] : `{${key}}`;
        });
    }

    clearCache() {
        this.textCache.clear();
    }
}