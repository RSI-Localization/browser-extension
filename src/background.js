import {TranslationWorker} from './workers/translation';
import {UpdateWorker} from './workers/update'

class BackgroundService {
    constructor() {
        this.updateWorker = new UpdateWorker();
        this.translationWorker = new TranslationWorker();

        this.updateWorker.checkForUpdates().then(() => {
            console.log('Initial update check completed');
        });
    }
}

new BackgroundService();