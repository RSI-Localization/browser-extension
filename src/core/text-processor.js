export class TextProcessor {
    constructor(options = {}) {
        this.patterns = {
            numbers: /(?<!\w)\d+(\.\d+)?(?!\w)/g,      // 독립된 숫자: "123", "45.67"
            mixed: /\w*\d+\w*/g,                       // 문자+숫자: "abc123", "123def"
            brackets: /\[\d+\]/g,                       // 대괄호 숫자: "[1]", "[42]"
            words: /\b\w+\b/g                          // 단어: "today", "weather"
        };

        this.batchSize = options.batchSize || 100;
        this.processDelay = options.processDelay || 16;
        this.ignoreWords = new Set(['is', 'the', 'a', 'an']);
    }

    processText(text) {
        const tokens = this.extractTokens(text);
        const pattern = this.createPattern(text, tokens);

        return {
            original: text,
            tokens,
            pattern,
            hasDynamicContent: tokens.length > 0
        };
    }

    extractTokens(text) {
        let tokens = [];
        let processedText = text;

        Object.entries(this.patterns).forEach(([type, pattern]) => {
            const matches = processedText.match(pattern) || [];
            if (matches.length > 0) {
                tokens.push(...matches.map(value => ({ type, value })));
            }
        });

        return tokens.filter(token =>
            token.type !== 'words' || !this.ignoreWords.has(token.value.toLowerCase())
        );
    }

    createPattern(text, tokens) {
        let processedText = text;
        const tokenMap = new Map();

        tokens.forEach((token, index) => {
            if (!tokenMap.has(token.value)) {
                tokenMap.set(token.value, index);
                const regex = new RegExp(this.escapeRegExp(token.value), 'g');
                processedText = processedText.replace(regex, `{${index}}`);
            }
        });

        return processedText;
    }

    insertTokens(pattern, tokens) {
        let result = pattern;
        tokens.forEach((token, index) => {
            result = result.replace(
                new RegExp(`\\{${index}}`, 'g'),
                token.value
            );
        });
        return result;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}