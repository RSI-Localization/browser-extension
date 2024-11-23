import {LocaleAPI} from '../utils/locale-api';
import {PathValidator} from '../utils/path-validator';
import {LocaleStorage} from '../utils/locale-storage';

export class LocaleManager {
    STORAGE_KEY = 'path_metadata';
    VERSION_CACHE_DURATION = 5 * 60 * 1000;

    constructor() {
        this.currentLocale = null;
        this.pathData = null;
        this.updateInProgress = false;
        this.versionCache = null;
        this.lastVersionCheck = null;
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

    async getVersionData() {
        const now = Date.now();

        if (this.versionCache && this.lastVersionCheck &&
            (now - this.lastVersionCheck < this.VERSION_CACHE_DURATION)) {
            return this.versionCache;
        }

        const storedVersion = await LocaleStorage.getVersionData();
        if (storedVersion && storedVersion.timestamp &&
            (now - storedVersion.timestamp < this.VERSION_CACHE_DURATION)) {
            this.versionCache = storedVersion.data;
            this.lastVersionCheck = storedVersion.timestamp;
            return storedVersion.data;
        }

        const versionData = await LocaleAPI.getVersionData();
        this.versionCache = versionData;
        this.lastVersionCheck = now;

        await LocaleStorage.saveVersionData({
            data: versionData,
            timestamp: now
        });

        return versionData;
    }

    async checkForUpdates() {
        if (this.updateInProgress) return false;
        this.updateInProgress = true;

        try {
            const currentLocale = await LocaleStorage.getCurrentLocale();
            if (currentLocale === 'en' || !navigator.onLine) return false;

            const versionData = await this.getVersionData();
            const needsUpdate = await LocaleStorage.needsUpdate(versionData);

            if (needsUpdate) {
                this.versionCache = null;
                this.lastVersionCheck = null;
                await this.initializePaths();
                await LocaleStorage.saveGlobalMetadata(versionData);
                return true;
            }
            return false;
        } finally {
            this.updateInProgress = false;
        }
    }

    async loadCommonTranslations(locale, forceFresh = false) {
        if (locale === 'en') return null;

        if (!forceFresh) {
            const cached = await LocaleStorage.getCommonTranslations(locale);
            if (cached) return cached.data;
        }

        const response = await LocaleAPI.getCommonResources('website', locale);
        if (response) {
            await LocaleStorage.saveCommonTranslations(locale, response.data, response.version);
            return response.data;
        }

        return null;
    }

    async getLocaleData(locale, path) {
        if (locale === 'en') return {};

        const versionData = await this.getVersionData();
        const serviceData = versionData.languages[locale]?.website;

        const {bestMatchPath, version} = this.findBestMatch(serviceData, path);
        if (!bestMatchPath) return {};

        const response = await LocaleAPI.getModuleResources(locale, bestMatchPath);
        return {
            ...response.data,
            version: version
        };
    }

    findBestMatch(serviceData, path) {
        if (path === '/' || path === '') {
            const mainData = serviceData?.modules?.main?.files['index.json'];
            return {
                bestMatchPath: '/main/index.json',
                version: mainData?.version
            };
        }

        const pathParts = path.split('/').filter(Boolean);
        const section = pathParts[0] || 'main';
        const remainingPath = pathParts.slice(1);

        const sectionData = serviceData?.modules?.[section];
        if (!sectionData?.files) return {};

        while (remainingPath.length >= 0) {
            const currentPath = '/' + remainingPath.join('/');
            const jsonPath = currentPath + (currentPath === '/' ? 'index.json' : '.json');

            if (sectionData.files[jsonPath]) {
                return {
                    bestMatchPath: `/${section}${jsonPath}`,
                    version: sectionData.files[jsonPath].version
                };
            }

            if (remainingPath.length === 0) break;
            remainingPath.pop();
        }

        return {};
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

        const data = await this.getVersionData();
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
}