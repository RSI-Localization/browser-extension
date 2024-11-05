import i18next from 'i18next';

export class TextProcessor {
    constructor() {
        i18next.init({
            interpolation: {
                escapeValue: false,
                format: (value, format, lng) => {
                    if (format === 'number') {
                        return new Intl.NumberFormat(lng).format(value);
                    }
                    if (format === 'date') {
                        return new Intl.DateTimeFormat(lng).format(value);
                    }
                    return value;
                }
            }
        });
    }

    processText(originalText, tokens = {}) {
        const translatedText = i18next.t(originalText, {
            ...tokens,
            formatParams: {
                0: { format: 'number' }
            }
        });

        return {
            original: originalText,
            translated: translatedText,
            pattern: translatedText,
            tokens: tokens
        };
    }

    restoreText(translatedPattern, tokens) {
        return i18next.t(translatedPattern, tokens);
    }
}