import {CONFIG} from "../config";
import {LocaleStorage} from "../utils/locale-storage";
import {LocaleManager} from "../core/locale-manager";
import {LocaleAPI} from "../utils/locale-api";

export class UpdateWorker {
    constructor() {
        console.log('UpdateWorker initialized');
        this.setupAlarms();
        this.setupMessageListeners();
        this.updateInProgress = false;
        this.localeManager = new LocaleManager();
    }

    setupAlarms() {
        chrome.alarms.create('checkLocaleUpdates', {
            periodInMinutes: CONFIG.UPDATE_INTERVAL_HOURS * 60,
            when: Date.now() + 1000
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'checkLocaleUpdates') {
                console.log('Update alarm triggered');
                this.checkForUpdates().then();
            }
        });
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
                await this.localeManager.initializePaths();
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

        await this.processUpdate({
            locale: currentLocale,
            path: currentPath
        });
    }

    async processUpdate({locale, path}) {
        try {
            console.log(`Processing update for ${locale}/${path}`);
            const data = await this.localeManager.getLocaleData(locale, path);
            if (data) {
                await LocaleStorage.saveLocaleData(locale, path, data);
                this.broadcastUpdate(locale, path);
                console.log(`Update completed for ${locale}/${path}`);
            }
        } catch (error) {
            console.error(`Failed to process update for ${locale}/${path}:`, error);
        }
    }

    broadcastUpdate(locale, path) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                try {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'localeUpdated',
                        locale: locale,
                        path: path
                    }).catch(() => {});
                } catch (error) {}
            });
        });
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'forceUpdate') {
                console.log('Force update requested');
                this.checkForUpdates().then(() => {
                    sendResponse({success: true});
                });
                return true;
            }
        });
    }
}