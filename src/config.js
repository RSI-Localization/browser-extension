export const CONFIG = {
    //LOCALE_SERVER: 'https://rsi.laeng.co',
    LOCALE_SERVER: 'https://rsi-localization.test',
    UPDATE_INTERVAL_HOURS: 24,
    LOCALES_TO_MONITOR: ['ko'],
    SUPPORTED_LANGUAGES: {
        'en': 'English',
        'ko': '한국어'
    },
    PATHS: {
        COMMON: {
            base: '/base',
        },
        STANDALONE: [
            '/spectrum',
            '/roadmap',
            '/community-hub',
            '/starmap'
        ]
    },
    SERVICE_ID: 'website'
};
