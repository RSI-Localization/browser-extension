import { TranslationWorker } from './workers/translation';
import { UpdateWorker } from './workers/update'

class BackgroundService {
    constructor() {
        new TranslationWorker();
        new UpdateWorker();
    }
}

new BackgroundService();