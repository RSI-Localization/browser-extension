import {LocaleAPI} from '../utils/locale-api';
import {PathValidator} from '../utils/path-validator';
import {LocaleStorage} from '../utils/locale-storage';

export class LocaleManager {
    STORAGE_KEY = 'path_metadata';

    constructor() {
        this.currentLocale = null;
        this.pathData = null;
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
