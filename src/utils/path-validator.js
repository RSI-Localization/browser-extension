export class PathValidator {
    static paths = null;

    static isStandalone(path) {
        return this.paths?.standalone?.has(path);
    }

    static isCommon(path) {
        return this.paths?.common?.has(path);
    }

    static isModule(path) {
        return this.paths?.module?.has(path);
    }

    static getPathType(path) {
        if (!this.paths) return 'module';
        if (this.isCommon(path)) return 'common';
        if (this.isStandalone(path)) return 'standalone';
        return 'module';
    }

    static setPathData(pathData) {
        this.paths = {
            generated: pathData.generated,
            common: new Set(Object.values(pathData.common || {})),
            standalone: new Set(Object.values(pathData.standalone || {})),
            modules: new Set(Object.values(pathData.modules || {}))
        };
    }
}