import { Localizer } from './core/localizer';
import { TextProcessor } from './core/text-processor';
import { DOMManager } from './core/dom-manager';
import { CONFIG } from './config';
import { StorageManager } from './utils/storage';
import { LocaleButton } from './components/locale-button';
import './styles.css'

class Main {
    constructor() {
        this.localizer = new Localizer();
        this.textProcessor = new TextProcessor();
        this.domManager = new DOMManager({
            batchSize: CONFIG.CACHE.BATCH_SIZE,
            processInterval: CONFIG.CACHE.PROCESS_INTERVAL
        });
        // 기본 언어 설정
        this.currentLocale = Object.keys(CONFIG.SUPPORTED_LANGUAGES)[0];

        document.addEventListener('localeChange', async (e) => {
            const newLocale = e.detail.locale;
            await this.changeLocale(newLocale);
        });
    }

    static getInstance() {
        if (!Main.instance) {
            Main.instance = new Main();
        }
        return Main.instance;
    }

    async init() {
        console.log('🚀 Starting RSI localization...');

        await this.waitForDOM();
        await this.localizer.init();

        const storage = await StorageManager.get('selectedLocale');

        if (storage.selectedLocale && CONFIG.SUPPORTED_LANGUAGES[storage.selectedLocale]) {
            this.currentLocale = storage.selectedLocale;
        }

        await this.loadAllTranslations();

        this.localizer.setLocale(this.currentLocale);
        this.observePopover();
        this.startLocalization();
    }

    observePopover() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList?.contains('o-localizationPopover')) {
                        if (node.getAttribute('data-orion-theme')) return;

                        this.injectLanguageButtons(node);
                        this.updateToolbarLanguageDisplay(this.currentLocale);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    injectLanguageButtons(popover) {
        const languageBlocks = Array.from(popover.querySelectorAll('.c-localizationBlock'));
        const languageBlock = languageBlocks[0];
        if (!languageBlock) return;

        const buttonContainer = languageBlock.querySelector('.c-localizationBlock__content');
        if (!buttonContainer) return;

        const templateButton = buttonContainer.querySelector('button');
        if (!templateButton) return;

        Object.entries(CONFIG.SUPPORTED_LANGUAGES).forEach(([locale, langName]) => {
            const isActive = locale === this.currentLocale;
            const button = new LocaleButton(locale, langName, isActive);
            const buttonElement = button.create(templateButton);
            if (buttonElement) {
                buttonContainer.appendChild(buttonElement);
            }
        });

        templateButton.remove();
    }

    updateToolbarLanguageDisplay(locale) {
        const waitForCurrency = setInterval(() => {
            const toolbarButton = document.querySelector('.m-toolBarButton[data-overlay-opener="true"]');
            if (toolbarButton) {
                const label = toolbarButton.querySelector('.m-toolBarButton__label');
                if (label && label.textContent.includes('/')) {
                    // 현재 표시된 텍스트에서 통화 부분만 가져오기
                    const currentText = label.textContent;
                    const currencyPart = currentText.split('/')[1].trim();

                    // 새로운 언어 코드와 기존 통화 조합
                    label.textContent = `${locale} / ${currencyPart}`;
                    clearInterval(waitForCurrency);
                }
            }
        }, 100);

        // 5초 후 자동 정리
        setTimeout(() => clearInterval(waitForCurrency), 5000);
    }

    async loadAllTranslations() {
        for (const locale of Object.keys(CONFIG.SUPPORTED_LANGUAGES)) {
            if (locale === 'en') continue;

            const response = await fetch(chrome.runtime.getURL(`/dist/locales/${locale}.json`));
            const translations = await response.json();
            await this.localizer.loadTranslations(locale, translations);
        }
    }

    async changeLocale(newLocale) {
        if (CONFIG.SUPPORTED_LANGUAGES[newLocale]) {
            this.currentLocale = newLocale;

            await StorageManager.set({ selectedLocale: newLocale });

            /**
            if (newLocale === 'en') {
                // Restore original English content
                const elements = document.querySelectorAll('[data-original-text]');
                elements.forEach(element => {
                    element.textContent = element.getAttribute('data-original-text');
                });
            } else {
                // Apply translations for other languages
                this.localizer.setLocale(newLocale);
                await this.domManager.processElement(document.body, this.textProcessor, this.localizer);
            }
             **/

            return true;
        }
        return false;
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

    startLocalization() {
        // Process initial DOM
        this.domManager.processElement(document.body, this.textProcessor, this.localizer).then();

        // Set up mutation observer for dynamic content
        this.domManager.observeMutations((node) => {
            this.domManager.processElement(node, this.textProcessor, this.localizer).then();
        });
    }
}

// 웹사이트 현지화 시작
const main = new Main();
main.init().then(() => {
    console.log('✅ RSI localization initialized');
    console.log('📚 Supported languages:', CONFIG.SUPPORTED_LANGUAGES);
    console.log('🌍 Current language:', main.currentLocale);
});

export const instance = Main.getInstance();