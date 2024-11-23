import {CONFIG} from "../config";

export class LocaleAPI {
    static defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    static async fetchJSON(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: this.defaultHeaders
        });
        return response.json();
    }

    static buildUrl(path) {
        return `${CONFIG.LOCALE_SERVER}/api/v1/${path}`;
    }

    static async getServices() {
        return this.fetchJSON(this.buildUrl('services'));
    }

    static async getVersionData() {
        return this.fetchJSON(this.buildUrl('localization/all/version'));
    }

    static async getSupportedLanguages() {
        return this.fetchJSON(this.buildUrl('localization/website/languages'));
    }

    static async getRandomContributorCode() {
        return this.fetchJSON(this.buildUrl('localization/contributors/random'));
    }

    static async getModuleResources(locale, path) {
        const cleanPath = path.replace('.json', '');
        const response = await this.fetchJSON(
            this.buildUrl(`localization/website/${locale}/modules${cleanPath}`)
        );
        return {
            data: response.data,
            version: response.version
        };
    }

    static async getCommonResources(serviceId, locale) {
        const response = await this.fetchJSON(
            this.buildUrl(`localization/website/${locale}/common`)
        );
        return {
            data: response.data,
            version: response.version
        };
    }

    static async getStandaloneResources(locale, path) {
        const cleanPath = path.replace('.json', '');
        const response = await this.fetchJSON(
            this.buildUrl(`localization/website/${locale}/standalone${cleanPath}`)
        );
        return {
            data: response.data,
            version: response.version
        };
    }

    static async getBulkResources(locale, options) {
        const requestBody = {
            modules: options.modules.map(path => path.replace('.json', '')),
            standalone: options.standalone.map(path => path.replace('.json', '')),
            includeCommon: options.includeCommon || false
        };

        const response = await this.fetchJSON(
            this.buildUrl(`localization/website/${locale}/bulk`),
            {
                method: 'POST',
                body: JSON.stringify(requestBody)
            }
        );

        return {
            data: response.data,
            version: response.version
        };
    }
}