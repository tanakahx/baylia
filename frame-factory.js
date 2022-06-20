class FrameFactory {
    constructor() {
        this.frameClassMap = new Map();
    }
    install(ext, className) {
        this.frameClassMap.set(ext, className);
    }
    createFrame(filePath) {
        const splits = filePath.split('.');
        if (splits.length > 1) {
            const ext = splits.pop().toLowerCase();
            if (this.frameClassMap.has(ext)) {
                const klass = this.frameClassMap.get(ext);
                return new klass();
            }
        }
        return null;
    }
}

const frameFactory = new FrameFactory();
