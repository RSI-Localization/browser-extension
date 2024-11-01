export class StorageManager {
    static async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    static async set(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    }

    static async getCurrentVersion(locale) {
        const result = await this.get(`version_${locale}`);
        return result[`version_${locale}`] || '0.0.0';
    }

    static async saveLocaleData(locale, data) {
        await this.set({
            [`locale_${locale}`]: data,
            [`version_${locale}`]: data.version,
            [`updated_at_${locale}`]: new Date().toISOString()
        });
    }
}