import { CONFIG } from '../config.js';

export class LocaleAPI {
    static async getServices() {
        const url = `${CONFIG.LOCALE_SERVER}/api/v1/services`;
        const response = await fetch(url);
        return response.json();
    }

    static async getSupportedLanguages(serviceId) {
        const url = `${CONFIG.LOCALE_SERVER}/api/v1/services/${serviceId}/languages`;
        const response = await fetch(url);
        return response.json();
    }

    static async getLatestVersion(locale, serviceId) {
        const languages = await this.getSupportedLanguages(serviceId);
        return languages.languages[locale]?.version || null;
    }

    static async getCommonResources(serviceId, locale) {
        const url = `${CONFIG.LOCALE_SERVER}/api/v1/localization/${serviceId}/${locale}/common`;
        const response = await fetch(url);
        return response.json();
    }

    static async getModuleResources(serviceId, locale, path) {
        const url = `${CONFIG.LOCALE_SERVER}/api/v1/localization/${serviceId}/${locale}/modules${path}`;
        const response = await fetch(url);
        return response.json();
    }

    static async getStandaloneResources(serviceId, locale, path) {
        const url = `${CONFIG.LOCALE_SERVER}/api/v1/localization/${serviceId}/${locale}/standalone${path}`;
        const response = await fetch(url);
        return response.json();
    }

    static async getBulkResources(serviceId, locale, options) {
        const url = `${CONFIG.LOCALE_SERVER}/api/v1/localization/${serviceId}/${locale}/bulk`;
        const requestBody = {
            modules: options.modules || [],
            standalone: options.standalone || [],
            includeCommon: options.includeCommon || false
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        return response.json();
    }

    static async getLocaleData(locale, path) {
        if (path === 'common') {
            return this.getCommonResources(CONFIG.SERVICE_ID, locale);
        }

        const isStandalone = Object.values(CONFIG.PATHS.STANDALONE).some(p => path.includes(p));

        if (isStandalone) {
            return this.getStandaloneResources(CONFIG.SERVICE_ID, locale, path);
        } else {
            return this.getModuleResources(CONFIG.SERVICE_ID, locale, path);
        }
    }

    static compareVersions(version1, version2) {
        if (!version1 || !version2) return false;

        const [date1, hash1] = version1.split('.');
        const [date2, hash2] = version2.split('.');

        // 날짜 비교
        if (date1 !== date2) {
            return parseInt(date1) < parseInt(date2);
        }

        // 해시값 비교
        return hash1 !== hash2;
    }

    static async checkForUpdates(locale, path) {
        const currentVersion = await StorageManager.getCurrentVersion(locale, path);
        const latestVersion = await this.getLatestVersion(locale, CONFIG.SERVICE_ID);
        return this.compareVersions(currentVersion, latestVersion);
    }

    static async loadExternalTranslations(locale, path) {
        // If external translations are needed, implement here
        return {};
    }
}