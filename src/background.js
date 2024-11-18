import {TranslationWorker} from './workers/translation';
import {UpdateWorker} from './workers/update'

class BackgroundService {
    constructor() {
        this.translationWorker = new TranslationWorker();
    }
}

new BackgroundService();