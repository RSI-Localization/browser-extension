export const CONFIG = {
    LOCALE_SERVER: 'https://raw.githubusercontent.com',
    UPDATE_INTERVAL_HOURS: 24,
    LOCALES_TO_MONITOR: ['ko'],
    SUPPORTED_LANGUAGES: {
        'en': 'English',
        'ko': '한국어'
    },
    CACHE: {
        SIZE: 1000,
        BATCH_SIZE: 200,
        PROCESS_INTERVAL: 16
    },
    PATHS: {
        COMMON: {
            base: '/base',
        },
        PAGES: {
            home: '/',
            game: '/game',
            pledge: '/pledge',
            // ... 기타 일반 페이지
        },
        EXTERNAL: {
            commlink: '/api/comm-link',
            orgs: '/api/orgs',
            citizens: '/api/citizens'
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
