import { CONFIG } from '../config.js';

export class LocaleAPI {
    static async getLatestVersion(locale) {
        const response = await fetch(`${CONFIG.LOCALE_SERVER}/locales/refs/heads/main/lang/${locale}.json`);
        const data = await response.json();
        return data.version;
    }

    static async getLocaleData(locale) {
        const response = await fetch(`${CONFIG.LOCALE_SERVER}/locales/refs/heads/main/lang/${locale}.json`);
        return response.json();
    }
}