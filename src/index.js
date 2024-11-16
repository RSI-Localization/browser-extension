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

            this.initialized = true;
            console.log('✅ RSI localization initialized');
            console.log('🌐 Current locale:', currentLocale);

        } catch (error) {
            console.error('❌ Initialization failed:', error);
        }
    }

    async initializeComponents() {
        const {localeManager, languageDropdown} = this.components;

        await localeManager.load();
        await languageDropdown.init();

        this.setupEventListeners();
    }

    async setupLocalization() {
        const {translationManager, textProcessor, domManager} = this.components;

        await this.waitForDOM();
        await translationManager.load(window.location.pathname);

        const currentLocale = await LocaleStorage.getCurrentLocale();
        if (currentLocale !== 'en') {
            await domManager.load(textProcessor, translationManager);
        }
    }

    setupEventListeners() {
        const {translationManager, languageDropdown} = this.components;

        languageDropdown.onLocaleChange(async (locale) => {
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
