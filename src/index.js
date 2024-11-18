import {CONFIG} from './config';
import {TranslationManager} from './core/translation-manager';
import {TextProcessor} from './core/text-processor';
import {DOMManager} from './core/dom-manager';
import {LocaleManager} from "./core/locale-manager";
import {LanguageDropdown} from './components/language-dropdown';
import {LocaleStorage} from './utils/locale-storage';
import './styles.css'

export class Main {
    constructor() {
        this.components = {
            localeManager: new LocaleManager(),
            translationManager: new TranslationManager(),
            textProcessor: new TextProcessor(),
            domManager: new DOMManager(),
            languageDropdown: new LanguageDropdown()
        };
        this.initialized = false;
        this.updateInterval = null;
    }

    async init() {
        if (this.initialized) return;

        console.log('🚀 Starting RSI localization...');

        try {
            await this.components.localeManager.load();
            await this.components.languageDropdown.init();
            await this.waitForDOM();
            await this.components.translationManager.load(window.location.pathname);
            this.setupEventListeners();

            const currentLocale = await LocaleStorage.getCurrentLocale();
            if (currentLocale !== 'en') {
                await this.components.domManager.load(
                    this.components.textProcessor,
                    this.components.translationManager
                );
            }

            this.setupUpdateCheck();
            await this.components.localeManager.checkForUpdates();

            this.initialized = true;
            console.log('✅ RSI localization initialized');
            console.log('🌐 Current locale:', currentLocale);

        } catch (error) {
            console.error('❌ Initialization failed:', error);
        }
    }

    setupUpdateCheck() {
        const intervalMs = CONFIG.UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;
        this.updateInterval = setInterval(() => {
            this.components.localeManager.checkForUpdates().then();
        }, intervalMs);

        document.addEventListener('translationsRefreshed', async () => {
            await this.components.domManager.load(
                this.components.textProcessor,
                this.components.translationManager
            );
        });
    }

    setupEventListeners() {
        const {translationManager, languageDropdown} = this.components;

        languageDropdown.onLocaleChange(async (locale) => {
            await LocaleStorage.setCurrentLocale(locale);
            await translationManager.load(window.location.pathname);
        });

        languageDropdown.observeDropdown();
    }

    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
}

const main = new Main();
main.init().then();
