import {TranslationManager} from './core/translation-manager';
import {TextProcessor} from './core/text-processor';
import {DOMManager} from './core/dom-manager';
import {LocaleManager} from "./core/locale-manager";
import {LanguageDropdown} from './components/language-dropdown';
import {LocaleStorage} from './utils/locale-storage';
import {ReferralButton} from "./components/referral-button";
import './styles.css'

export class Main {
    constructor() {
        this.components = {
            localeManager: new LocaleManager(),
            translationManager: new TranslationManager(),
            textProcessor: new TextProcessor(),
            domManager: new DOMManager(),
            languageDropdown: new LanguageDropdown(),
            contributorButton: new ReferralButton()
        };
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        console.log('🚀 Starting RSI localization...');

        try {
            await this.components.localeManager.load();
            await this.components.languageDropdown.init();
            await this.waitForDOM();

            const currentLocale = await LocaleStorage.getCurrentLocale();

            if (currentLocale !== 'en') {
                await this.components.translationManager.load(window.location.pathname);

                await this.components.domManager.load(
                    this.components.textProcessor,
                    this.components.translationManager
                );

                await this.components.contributorButton.init(
                    this.components.translationManager
                );

                const hasUpdates = await this.components.localeManager.checkForUpdates();
                if (hasUpdates) {
                    const newTranslations = await this.components.translationManager.refresh();
                    if (newTranslations) {
                        document.dispatchEvent(new CustomEvent('translationsRefreshed'));
                    }
                }
            }

            this.setupEventListeners();
            this.initialized = true;

            console.log('✅ RSI localization initialized');
            console.log('🌐 Current locale:', currentLocale);

        } catch (error) {
            console.error('❌ Initialization failed:', error);
        }
    }

    setupEventListeners() {
        const {
            translationManager,
            languageDropdown,
            contributorButton
        } = this.components;

        languageDropdown.onLocaleChange(async (locale) => {
            await LocaleStorage.setCurrentLocale(locale);
            const translations = await translationManager.load(window.location.pathname);
            if (translations) {
                document.dispatchEvent(new CustomEvent('translationsRefreshed'));
            }
        });

        languageDropdown.observeDropdown();

        window.addEventListener('popstate', async () => {
            const currentLocale = await LocaleStorage.getCurrentLocale();
            if (currentLocale !== 'en') {
                const translations = await translationManager.load(window.location.pathname);
                if (translations) {
                    document.dispatchEvent(new CustomEvent('translationsRefreshed'));
                }
            }
        });
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