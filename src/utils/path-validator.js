export class PathValidator {
    static paths = null;
    static versionData = null;
    static versionTimestamp = null;
    static VERSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    static setPathData(pathData) {
        this.paths = {
            generated: pathData.generated,
            common: new Set(Object.values(pathData.common || {})),
            standalone: new Set(Object.values(pathData.standalone || {})),
            modules: new Set(Object.values(pathData.modules || {}))
        };
    }

    static setVersionData(data, timestamp = Date.now()) {
        this.versionData = data;
        this.versionTimestamp = timestamp;
    }

    static isVersionCacheValid() {
        return this.versionData &&
            this.versionTimestamp &&
            (Date.now() - this.versionTimestamp < this.VERSION_CACHE_DURATION);
    }

    static getPathType(path) {
        if (!path || path === '/') return 'module';

        const pathParts = path.split('/').filter(Boolean);
        const section = pathParts[0];

        if (this.versionData?.languages?.ko?.website?.standalone?.[section]) {
            return 'standalone';
        }

        return 'module';
    }

    static getSectionFromPath(path) {
        if (!path || path === '/') return 'main';
        const pathParts = path.split('/').filter(Boolean);
        return pathParts[0];
    }

    static getFilePathFromSection(section, remainingPath = '') {
        if (!remainingPath) return '/index.json';
        return '/' + remainingPath + '.json';
    }

    static validatePath(path) {
        if (!this.versionData) return false;

        const section = this.getSectionFromPath(path);
        const moduleData = this.versionData?.languages?.ko?.website?.modules?.[section];

        if (!moduleData) return false;

        const pathParts = path.split('/').filter(Boolean);
        pathParts.shift();

        while (pathParts.length >= 0) {
            const currentPath = '/' + pathParts.join('/');
            const jsonPath = currentPath + (currentPath === '/' ? 'index.json' : '.json');

            if (moduleData.files[jsonPath]) {
                return true;
            }

            if (pathParts.length === 0) break;
            pathParts.pop();
        }

        return false;
    }

    static getVersionForPath(locale, path) {
        if (!this.versionData) return null;

        const section = this.getSectionFromPath(path);
        const serviceData = this.versionData?.languages?.[locale]?.website;

        if (!serviceData) return null;

        const sectionData = serviceData.modules?.[section];
        if (!sectionData?.files) return null;

        const pathParts = path.split('/').filter(Boolean);
        pathParts.shift();

        while (pathParts.length >= 0) {
            const currentPath = '/' + pathParts.join('/');
            const jsonPath = currentPath + (currentPath === '/' ? 'index.json' : '.json');

            if (sectionData.files[jsonPath]) {
                return sectionData.files[jsonPath].version;
            }

            if (pathParts.length === 0) break;
            pathParts.pop();
        }

        return sectionData.version;
    }

    static clearCache() {
        this.versionData = null;
        this.versionTimestamp = null;
    }
}