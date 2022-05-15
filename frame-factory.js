class FrameFactory {
    constructor() {
        this.frameClassMap = new Map();
    }
    install(ext, className) {
        this.frameClassMap.set(ext, className);
    }
    createFrame(file) {
        const splits = file.path.split('.');
        if (splits.length > 1) {
            const ext = splits.pop();
            if (this.frameClassMap.has(ext)) {
                const klass = this.frameClassMap.get(ext);
                return new klass();
            }
        }
        return null;
    }
}

const frameFactory = new FrameFactory();
