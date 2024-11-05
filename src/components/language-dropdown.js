import { CONFIG } from '../config';
import { LocaleButton } from './locale-button';
import {StorageManager} from "../utils/storage";

export class LanguageDropdown {
    constructor(currentLocale) {
        this.currentLocale = currentLocale;

        document.addEventListener('localeChange', async (e) => {
            const newLocale = e.detail.locale;
            if (await this.#changeLocale(newLocale)) {
                //window.location.reload();
            }
        });
    }

    observeDropdown() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList?.contains('o-localizationPopover')) {
                        if (node.getAttribute('data-orion-theme')) return;

                        this.#injectLanguageButtons(node);
                        this.#updateToolbarLanguageDisplay(this.currentLocale);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    #injectLanguageButtons(popover) {
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

    #updateToolbarLanguageDisplay(locale) {
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

    async #changeLocale(newLocale) {
        if (CONFIG.SUPPORTED_LANGUAGES[newLocale]) {
            this.currentLocale = newLocale;
            await StorageManager.set({ selectedLocale: newLocale });

            console.log('Locale changed to:', newLocale);

            return true;
        }
        return false;
    }
}
