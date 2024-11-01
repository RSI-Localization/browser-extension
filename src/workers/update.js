import { CONFIG } from "../config";

export class UpdateWorker {
    constructor() {
        this.setupAlarms();
        this.setupMessageListeners();
    }

    setupAlarms() {
        chrome.alarms.create('checkLocaleUpdates', {
            periodInMinutes: CONFIG.UPDATE_INTERVAL_HOURS * 60
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'checkLocaleUpdates') {
                this.checkForUpdates().then();
            }
        });
    }

    async checkForUpdates() {
        for (const locale of CONFIG.LOCALES_TO_MONITOR) {
            try {
                const currentVersion = await StorageManager.getCurrentVersion(locale);
                const latestVersion = await LocaleAPI.getLatestVersion(locale);

                if (latestVersion > currentVersion) {
                    await this.updateLocale(locale);
                }
            } catch (error) {
                console.error(`Update check failed for ${locale}:`, error);
            }
        }
    }

    async updateLocale(locale) {
        try {
            const localeData = await LocaleAPI.getLocaleData(locale);
            await StorageManager.saveLocaleData(locale, localeData);
            this.broadcastUpdate(locale);
        } catch (error) {
            console.error(`Failed to update locale ${locale}:`, error);
        }
    }

    broadcastUpdate(locale) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'localeUpdated',
                    locale: locale
                });
            });
        });
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getLocaleData') {
                this.handleGetLocaleData(request, sendResponse);
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