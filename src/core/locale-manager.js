import {LocaleAPI} from '../utils/locale-api';
import {PathValidator} from '../utils/path-validator';
import {LocaleStorage} from '../utils/locale-storage';

export class LocaleManager {
    STORAGE_KEY = 'path_metadata';
    VERSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.currentLocale = null;
        this.pathData = null;
        this.updateInProgress = false;
        this.commonTranslations = new Map();
        this.versionCache = null;
        this.lastVersionCheck = null;
    }

    async load() {
        this.currentLocale = await LocaleStorage.getCurrentLocale();
        if (this.currentLocale !== 'en') {
            await this.loadCommonTranslations(this.currentLocale);
        }

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

    findBestMatch(serviceData, path) {
        if (path === '/' || path === '') {
            const mainData = serviceData?.modules?.main?.files['index.json'];
            return {
                bestMatchPath: '/main/index',
                version: mainData?.version
            };
        }

        const pathParts = path.split('/').filter(Boolean);
        const section = pathParts[0];
        const remainingPath = pathParts.slice(1);

        const sectionData = serviceData?.modules?.[section];
        if (!sectionData?.files) return {};

        while (remainingPath.length >= 0) {
            const currentPath = '/' + remainingPath.join('/');
            const jsonPath = currentPath + (currentPath === '/' ? 'index.json' : '.json');

            if (sectionData.files[jsonPath]) {
                return {
                    bestMatchPath: currentPath === '/' ? `/${section}/index` : `/${section}${currentPath}`,
                    version: sectionData.files[jsonPath].version
                };
            }

            if (remainingPath.length === 0) break;
            remainingPath.pop();
        }

        return {};
    }

    async loadCommonTranslations(locale) {
        if (this.commonTranslations.has(locale)) {
            return this.commonTranslations.get(locale);
        }

        const cached = await LocaleStorage.getCommonTranslations(locale);
        if (cached) {
            this.commonTranslations.set(locale, cached.data);
            return cached.data;
        }

        const response = await LocaleAPI.getCommonResources('website', locale);
        if (response) {
            await LocaleStorage.saveCommonTranslations(locale, response.data, response.version);
            this.commonTranslations.set(locale, response.data);
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
        const commonData = await this.loadCommonTranslations(locale);

        return {
            ...commonData,
            ...response.data,
            version: version
        };
    }

    async checkForUpdates() {
        if (this.updateInProgress) return;
        this.updateInProgress = true;

        try {
            const currentLocale = await LocaleStorage.getCurrentLocale();
            if (currentLocale === 'en') return;
            if (!navigator.onLine) return;

            const versionData = await this.getVersionData();
            const needsUpdate = await LocaleStorage.needsUpdate(versionData);

            if (needsUpdate) {
                this.versionCache = null;
                this.lastVersionCheck = null;
                await this.initializePaths();
                await LocaleStorage.saveGlobalMetadata(versionData);
                await this.updateCurrentLocale();
                await this.updateCommonTranslations(currentLocale);
            }
        } finally {
            this.updateInProgress = false;
        }
    }

    async updateCommonTranslations(locale) {
        const response = await LocaleAPI.getCommonResources('website', locale);
        if (response) {
            await LocaleStorage.saveCommonTranslations(locale, response.data, response.version);
            this.commonTranslations.set(locale, response.data);
            document.dispatchEvent(new CustomEvent('commonTranslationsUpdated', {
                detail: { locale }
            }));
        }
    }

    async updateCurrentLocale() {
        const currentLocale = await LocaleStorage.getCurrentLocale();
        const currentPath = await LocaleStorage.getCurrentPath();

        if (!currentLocale || !currentPath) return;
        await this.processUpdate(currentLocale, currentPath);
    }

    async processUpdate(locale, path) {
        const data = await this.getLocaleData(locale, path);
        if (data) {
            await LocaleStorage.saveLocaleData(locale, path, data);
            document.dispatchEvent(new CustomEvent('translationUpdated', {
                detail: { locale, path }
            }));
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