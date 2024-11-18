import {LocaleAPI} from '../utils/locale-api';
import {PathValidator} from '../utils/path-validator';
import {LocaleStorage} from '../utils/locale-storage';

export class LocaleManager {
    STORAGE_KEY = 'path_metadata';

    constructor() {
        this.currentLocale = null;
        this.pathData = null;
        this.updateInProgress = false;
    }

    async load() {
        this.currentLocale = await LocaleStorage.getCurrentLocale();
        const stored = await LocaleStorage.get(this.STORAGE_KEY);

        if (stored?.[this.STORAGE_KEY]) {
            this.pathData = stored[this.STORAGE_KEY];
            PathValidator.setPathData(this.pathData);
            return;
        }

        await this.initializePaths();
    }

    async checkForUpdates() {
        if (this.updateInProgress) {
            console.log('Update already in progress');
            return;
        }

        console.log('Starting update check');
        this.updateInProgress = true;

        try {
            const currentLocale = await LocaleStorage.getCurrentLocale();

            if (currentLocale === 'en') {
                console.log('English locale detected, skipping update check');
                return;
            }

            if (!navigator.onLine) {
                console.log('No internet connection');
                return;
            }

            const versionData = await LocaleAPI.getVersionData();
            const needsUpdate = await LocaleStorage.needsUpdate(versionData);

            if (needsUpdate) {
                console.log('Updates available, processing...');
                await this.initializePaths();
                await LocaleStorage.saveGlobalMetadata(versionData);
                await this.updateCurrentLocale();
            } else {
                console.log('No updates needed');
            }
        } catch (error) {
            console.error('Update check failed:', error);
        } finally {
            this.updateInProgress = false;
        }
    }

    async updateCurrentLocale() {
        const currentLocale = await LocaleStorage.getCurrentLocale();
        const currentPath = await LocaleStorage.getCurrentPath();

        if (!currentLocale || !currentPath) {
            console.log('No locale or path information available');
            return;
        }

        await this.processUpdate(currentLocale, currentPath);
    }

    async processUpdate(locale, path) {
        try {
            console.log(`Processing update for ${locale}/${path}`);
            const data = await this.getLocaleData(locale, path);
            if (data) {
                await LocaleStorage.saveLocaleData(locale, path, data);
                document.dispatchEvent(new CustomEvent('translationUpdated', {
                    detail: { locale, path }
                }));
                console.log(`Update completed for ${locale}/${path}`);
            }
        } catch (error) {
            console.error(`Failed to process update for ${locale}/${path}:`, error);
        }
    }

    async initializePaths() {
        if (this.currentLocale === 'en') {
            const defaultPathData = {
                generated: Date.now(),
                common: [],
                standalone: [],
                modules: []
            };
            PathValidator.setPathData(defaultPathData);
            await LocaleStorage.set({[this.STORAGE_KEY]: defaultPathData});
            return;
        }

        const data = await LocaleAPI.getVersionData();
        const pathData = this.processPathData(data, this.currentLocale);

        this.pathData = pathData;
        PathValidator.setPathData(pathData);
        await LocaleStorage.set({[this.STORAGE_KEY]: pathData});
        await LocaleStorage.saveGlobalMetadata({generated: data.generated});
    }

    processPathData(data, locale) {
        const serviceData = data.languages[locale]?.website;

        return {
            generated: data.generated,
            common: this.extractPaths(serviceData?.common?.files),
            standalone: this.extractModulePaths(serviceData?.standalone),
            modules: this.extractModulePaths(serviceData?.modules)
        };
    }

    extractPaths(files) {
        return files ? Object.keys(files).map(file => file.replace('.json', '')) : [];
    }

    extractModulePaths(moduleData) {
        if (!moduleData) return [];

        return Object.entries(moduleData).reduce((paths, [module, data]) => {
            const files = data.files || {};
            const modulePaths = Object.keys(files).map(file =>
                `/${module}${file.replace('.json', '')}`
            );
            return [...paths, ...modulePaths];
        }, []);
    }

    async getLocaleData(locale, path) {
        if (locale === 'en') return {};

        const pathType = PathValidator.getPathType(path);
        const bulkOptions = {
            modules: [],
            standalone: [],
            includeCommon: pathType === 'module'
        };

        if (pathType === 'standalone') {
            bulkOptions.standalone.push(path);
        } else {
            bulkOptions.modules.push(path);
        }

        const response = await LocaleAPI.getBulkResources(locale, bulkOptions);
        return response.data;
    }
}
