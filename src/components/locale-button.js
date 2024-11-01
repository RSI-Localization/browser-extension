export class LocaleButton {
    static instances = new Map();

    constructor(locale, langName, isActive = false) {
        this.locale = locale;
        this.langName = langName;
        this.isActive = isActive;
        this.element = null;
        LocaleButton.instances.set(locale, this);
    }

    create(templateButton = null) {
        try {
            const button = document.createElement('button');
            button.className = `m-localizationItem${this.isActive ? ' -active' : ''}`;
            button.setAttribute('data-cy-id', '__localization-item');
            button.setAttribute('data-locale', this.locale);

            const textDiv = document.createElement('div');
            textDiv.className = 'm-localizationItem__text';

            const label = document.createElement('p');
            label.className = 'm-localizationItem__label a-fontStyle -body-3 -no-rich-text';
            label.textContent = this.langName;

            const subLabel = document.createElement('p');
            subLabel.className = 'm-localizationItem__subLabel a-fontStyle -body-3 -no-rich-text';

            textDiv.appendChild(label);
            textDiv.appendChild(subLabel);
            button.appendChild(textDiv);

            button.addEventListener('click', this.handleClick.bind(this));

            if (templateButton && templateButton instanceof Element) {
                this.copyStyles(templateButton, button);
            }

            this.element = button;
            return button;
        } catch (error) {
            console.error('Error creating locale button:', error);
            return null;
        }
    }

    handleClick(e) {
        e.preventDefault();
        this.deactivateAll();
        this.activate();

        // 커스텀 이벤트 발생
        const event = new CustomEvent('localeChange', {
            detail: { locale: this.locale }
        });
        document.dispatchEvent(event);
    }

    activate() {
        if (this.element) {
            this.element.classList.add('-active');
            this.isActive = true;
        }
    }

    deactivate() {
        if (this.element) {
            this.element.classList.remove('-active');
            this.isActive = false;
        }
    }

    deactivateAll() {
        LocaleButton.instances.forEach(instance => instance.deactivate());
    }

    copyStyles(source, target) {
        try {
            const computedStyle = window.getComputedStyle(source);
            const importantStyles = [
                'padding', 'margin', 'width', 'height',
                'font-size', 'font-weight', 'color',
                'background-color', 'border', 'border-radius'
            ];

            importantStyles.forEach(property => {
                const value = computedStyle.getPropertyValue(property);
                if (value) target.style[property] = value;
            });
        } catch (error) {
            console.error('Error copying styles:', error);
        }
    }
}