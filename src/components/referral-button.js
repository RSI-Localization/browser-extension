import { LocaleAPI } from '../utils/locale-api';

export class ReferralButton {
    constructor() {
        this.translationManager = null;
        this.element = null;
        this.processedInputs = new Set();
    }

    async init(translationManager) {
        this.translationManager = translationManager;

        // 동적으로 추가되는 레퍼럴 코드 입력칸 처리
        document.addEventListener('referralCodeInputReady', (e) => {
            this.processReferralInput(e.detail.element);
        });
    }

    processReferralInput(inputElement) {
        if (!this.processedInputs.has(inputElement)) {
            const helperMessage = inputElement.querySelector('.a-inputHelperMessage');
            if (helperMessage && !helperMessage.querySelector('[data-cy-id="__contributor-button"]')) {
                this.injectButton(helperMessage).then();
                this.processedInputs.add(inputElement);
            }
        }
    }

    async injectButton(helperMessage) {
        try {
            const container = document.createElement('span');
            container.className = 'referral-content';

            const message = await this.translationManager.translate('contributor_message');
            const buttonText = await this.translationManager.translate('apply_code_button');
            const loadingText = await this.translationManager.translate('applying_code');

            const button = document.createElement('button');
            button.className = 'contributor-code-button';
            button.setAttribute('data-cy-id', '__contributor-button');
            button.setAttribute('data-original-text', buttonText);
            button.setAttribute('data-loading-text', loadingText);
            button.textContent = buttonText;

            button.addEventListener('click', this.handleClick.bind(this));

            container.innerHTML = ` ${message} - `;
            container.appendChild(button);
            helperMessage.appendChild(container);

            this.element = button;
        } catch (error) {
            console.error('Error creating contributor button:', error);
        }
    }

    async handleClick(e) {
        e.preventDefault();
        const button = e.target;

        try {
            button.textContent = button.getAttribute('data-loading-text');
            button.disabled = true;

            const response = await LocaleAPI.getRandomContributorCode();
            const referralContainer = button.closest('[data-cy-id="__referral-code"]');
            const referralInput = referralContainer?.querySelector('input[data-cy-id="input"]');

            if (referralInput && response.referralCode) {
                referralInput.value = response.referralCode;
                referralInput.dispatchEvent(new Event('input', { bubbles: true }));
                referralInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } catch (error) {
            console.error('Error fetching contributor code:', error);
        } finally {
            button.textContent = button.getAttribute('data-original-text');
            button.disabled = false;
        }
    }
}