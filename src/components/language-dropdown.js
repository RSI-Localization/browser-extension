import { CONFIG } from '../config';
import { LocaleButton } from './locale-button';
import { LocaleStorage } from "../utils/locale-storage";

export class LanguageDropdown {
    constructor() {
        this.currentLocale = null;
        this.supportedLocales = [];
        this.localeChangeHandlers = new Set();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('localeChange', async (e) => {
            const newLocale = e.detail.locale;
            if (await this.changeLocale(newLocale)) {
                this.notifyLocaleChange(newLocale);
                window.location.reload();
            }
        });
    }

    async init() {
        this.supportedLocales = CONFIG.SUPPORTED_LANGUAGES; //TODO: Replace to get from backend
        this.currentLocale = await LocaleStorage.getCurrentLocale();
    }

    observeDropdown() {
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

        Object.entries(this.supportedLocales).forEach(([locale, langName]) => {
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
                    const currentText = label.textContent;
                    const currencyPart = currentText.split('/')[1].trim();
                    label.textContent = `${locale} / ${currencyPart}`;
                    clearInterval(waitForCurrency);
                }
            }
        }, 100);

        setTimeout(() => clearInterval(waitForCurrency), 1000);
    }

    async changeLocale(newLocale) {
        if (this.supportedLocales[newLocale]) {
            this.currentLocale = newLocale;
            await LocaleStorage.setCurrentLocale(this.currentLocale);
            return true;
        }
        return false;
    }

    onLocaleChange(handler) {
        this.localeChangeHandlers.add(handler);
    }

    notifyLocaleChange(locale) {
        this.localeChangeHandlers.forEach(handler => handler(locale));
    }
}
