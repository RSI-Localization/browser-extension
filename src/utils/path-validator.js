export class PathValidator {
    static paths = null;
    static versionData = null;

    static setPathData(pathData) {
        this.paths = {
            generated: pathData.generated,
            common: new Set(Object.values(pathData.common || {})),
            standalone: new Set(Object.values(pathData.standalone || {})),
            modules: new Set(Object.values(pathData.modules || {}))
        };
    }

    static setVersionData(data) {
        this.versionData = data;
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
        const section = this.getSectionFromPath(path);
        const moduleData = this.versionData?.languages?.ko?.website?.modules?.[section];

        if (!moduleData) return false;

        const pathParts = path.split('/').filter(Boolean);
        pathParts.shift(); // Remove section

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
        const section = this.getSectionFromPath(path);
        const serviceData = this.versionData?.languages?.[locale]?.website;

        if (!serviceData) return null;

        const sectionData = serviceData.modules?.[section];
        if (!sectionData?.files) return null;

        const pathParts = path.split('/').filter(Boolean);
        pathParts.shift(); // Remove section

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
}