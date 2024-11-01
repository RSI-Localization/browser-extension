export class TextProcessor {
    constructor(options = {}) {
        this.patterns = {
            numbers: /\b\d+\.\d+\b|\b\d+\b(?!\w)/g,
            mixed: /\w{2,}\d+\w*|\w*\d+\w{2,}/g
        };
    }

    processText(originalText) {
        const tokens = this.extractTokens(originalText);
        const patternizedText = this.createPattern(originalText, tokens);

        return {
            original: originalText,
            pattern: patternizedText,
            tokens
        };
    }

    restoreText(translatedPattern, tokens) {
        // 번역된 패턴에 토큰 값들을 다시 삽입
        let restoredText = translatedPattern;
        tokens.forEach((token, index) => {
            restoredText = restoredText.replace(
                new RegExp(`\\{${index}\\}`, 'g'),
                token.value
            );
        });
        return restoredText;
    }

    extractTokens(text) {
        const tokens = [];
        Object.entries(this.patterns).forEach(([type, pattern]) => {
            const matches = text.match(pattern) || [];
            tokens.push(...matches.map(value => ({ type, value })));
        });
        return tokens;
    }

    createPattern(text, tokens) {
        let pattern = text;
        tokens.forEach((token, index) => {
            const regex = new RegExp(this.escapeRegExp(token.value), 'g');
            pattern = pattern.replace(regex, `{${index}}`);
        });
        return pattern;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}