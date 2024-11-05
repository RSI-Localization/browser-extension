import { CONFIG } from './config';
import { TranslationManager } from './core/translation-manager';
import { TextProcessor } from './core/text-processor';
import { DOMManager } from './core/dom-manager';
import { LanguageDropdown } from './components/language-dropdown';
import { StorageManager } from './utils/storage';
import './styles.css'

class Main {
    constructor() {
        this.translationManager = new TranslationManager();
        this.textProcessor = new TextProcessor();
        this.domManager = new DOMManager();

        StorageManager.get('selectedLocale').then(result => {
            this.currentLocale = result.selectedLocale || Object.keys(CONFIG.SUPPORTED_LANGUAGES)[0];
            this.translationManager.init(this.currentLocale).then();
            this.languageDropdown = new LanguageDropdown(this.currentLocale);
        });
    }

    async init() {
        console.log('🚀 Starting RSI localization...');

        await this.waitForDOM();

        await this.translationManager.load(window.location.pathname);
        this.languageDropdown.observeDropdown();
        this.domManager.load(this.textProcessor, this.translationManager);
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

// 웹사이트 현지화 시작
const main = new Main();

main.init().then(() => {
    console.log('✅ RSI localization initialized');
    console.log('🌐 Current locale:', main.currentLocale);
});