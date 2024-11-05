import {CONFIG} from "../config";
import {StorageManager} from "../utils/storage";
import {LocaleAPI} from "../utils/api";

export class UpdateWorker {
    constructor() {
        this.setupAlarms();
        this.setupMessageListeners();
        this.updateInProgress = false;
        this.updateQueue = new Set();
        this.maxRetries = 3;
    }

    setupAlarms() {
        chrome.alarms.create('checkLocaleUpdates', {
            periodInMinutes: CONFIG.UPDATE_INTERVAL_HOURS * 60
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'checkLocaleUpdates') {
                this.checkForUpdates();
            }
        });
    }

    async checkForUpdates() {
        if (this.updateInProgress) {
            return;
        }

        this.updateInProgress = true;
        const locales = CONFIG.SUPPORTED_LANGUAGES;

        try {
            if (!navigator.onLine) {
                return;
            }

            for (const locale of Object.keys(locales)) {
                await this.checkLocaleUpdates(locale);
            }

            // 큐에 있는 업데이트 처리
            for (const update of this.updateQueue) {
                await this.processUpdate(update);
            }
            this.updateQueue.clear();
        } finally {
            this.updateInProgress = false;
        }
    }

    async checkLocaleUpdates(locale) {
        const updates = [];

        // 공통 요소 체크
        for (const [key, path] of Object.entries(CONFIG.PATHS.COMMON)) {
            const needsUpdate = await this.checkAndUpdateFile(locale, path);
            if (needsUpdate) updates.push({locale, path});
        }

        // 페이지별 체크
        for (const path of Object.values(CONFIG.PATHS.PAGES)) {
            const needsUpdate = await this.checkAndUpdateFile(locale, path);
            if (needsUpdate) updates.push({locale, path});
        }

        // 배치 처리
        if (updates.length > 0) {
            await this.processBatchUpdates(updates);
        }
    }

    async checkAndUpdateFile(locale, path, retryCount = 0) {
        try {
            const currentVersion = await StorageManager.getCurrentVersion(locale, path);
            const latestVersion = await LocaleAPI.getLatestVersion(locale, path);

            if (!currentVersion || latestVersion > currentVersion) {
                return true;
            }
            return false;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.checkAndUpdateFile(locale, path, retryCount + 1);
            }
            console.error(`Update check failed for ${locale}/${path}:`, error);
            return false;
        }
    }

    async processBatchUpdates(updates) {
        const batchSize = 5;
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await Promise.all(batch.map(update => this.processUpdate(update)));
        }
    }

    async processUpdate({locale, path}) {
        try {
            const data = await LocaleAPI.getLocaleData(locale, path);
            await StorageManager.saveLocaleData(locale, path, data);
            this.broadcastUpdate(locale, path);
        } catch (error) {
            this.updateQueue.add({locale, path});
            console.error(`Failed to process update for ${locale}/${path}:`, error);
        }
    }

    broadcastUpdate(locale, path) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'localeUpdated',
                    locale: locale,
                    path: path
                });
            });
        });
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getLocaleData') {
                this.handleGetLocaleData(request, sendResponse).then();
                return true;
            }
        });
    }

    async handleGetLocaleData(request, sendResponse) {
        const data = await StorageManager.get([
            `locale_${request.locale}`,
            `version_${request.locale}`
        ]);
        sendResponse(data);
    }
}
