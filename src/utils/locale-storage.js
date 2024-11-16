export class LocaleStorage {
    static METADATA_KEY = 'global_metadata';
    static LOCALE_PREFERENCE_KEY = 'locale_preference';
    static CURRENT_PATH_KEY = 'current_path';

    static async get(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    resolve({});
                    return;
                }
                resolve(result);
            });
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
        const data = await this.getLocaleData(locale, path);
        return data?.metadata?.version || null;
    }

    static async getLocaleData(locale, path) {
        const key = this.getStorageKey(locale, path);
        const result = await this.get(key);
        return result[key];
    }

    static async getCurrentLocale() {
        const data = await this.get(this.LOCALE_PREFERENCE_KEY);
        return data?.[this.LOCALE_PREFERENCE_KEY] || 'en';
    }

    static async setCurrentLocale(locale) {
        await this.set({
            [this.LOCALE_PREFERENCE_KEY]: locale
        });
    }

    static async getCurrentPath() {
        const data = await this.get(this.CURRENT_PATH_KEY);
        return data?.[this.CURRENT_PATH_KEY] || '/';
    }

    static async setCurrentPath(path) {
        await this.set({
            [this.CURRENT_PATH_KEY]: path
        });
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

    static async getGlobalMetadata() {
        const result = await this.get(this.METADATA_KEY);
        return result[this.METADATA_KEY] || null;
    }

    static async saveGlobalMetadata(metadata) {
        await this.set({
            [this.METADATA_KEY]: {
                generated: metadata.generated,
                updatedAt: new Date().toISOString()
            }
        });
    }

    static async needsUpdate(newMetadata) {
        const currentMetadata = await this.getGlobalMetadata();
        if (!currentMetadata) return true;

        return currentMetadata.generated !== newMetadata.generated;
    }
}
