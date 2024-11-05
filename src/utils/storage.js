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

    static getStorageKey(locale, path) {
        return `locale_${locale}_${path.replace(/\//g, '_')}`;
    }

    static async getCurrentVersion(locale, path) {
        const result = await this.getLocaleData(locale, path);

        return result.version;
    }

    static async getLocaleData(locale, path) {
        const key = this.getStorageKey(locale, path);
        const result = await this.get(key);

        return result[key];
    }

    static async saveLocaleData(locale, path, data) {
        const key = this.getStorageKey(locale, path);
        const metadata = {
            version: data.version,
            updatedAt: new Date().toISOString(),
            path: path
        };

        await this.set({
            [key]: {
                data: data,
                metadata: metadata
            }
        });
    }
}
