class RgbFrame {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.type = 'rgb';
        this.frameData = null;
        this.colorMap = new Map([
            [0, {name:'R', colorCode:"#cc0000"}],
            [1, {name:'G', colorCode:"#00cc00"}],
            [2, {name:'B', colorCode:"#0000cc"}],
        ]);
    }
    get numColorType() {
        return 3;
    }
    get propertiesUrl() {
        return null;
    }
    get properties() {
        return null;
    }
    at(x, y) {
        const r = this.frameData.data[(y * this.width + x) * 4 + 0];
        const g = this.frameData.data[(y * this.width + x) * 4 + 1];
        const b = this.frameData.data[(y * this.width + x) * 4 + 2];
        const a = this.frameData.data[(y * this.width + x) * 4 + 3];
        return [r, g, b, a];
    }
    valuesAt(x, y, _ = false) {
        const [r, g, b, a] = this.at(x, y);
        return [[0, r], [1, g], [2, b]];
    }
    readFile(file) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                this.width = image.width;
                this.height = image.height;
                const frameBuffer = document.createElement('canvas');
                frameBuffer.width = this.width;
                frameBuffer.height = this.height;
                frameBuffer.getContext('2d').drawImage(image, 0, 0);
                this.frameData = frameBuffer.getContext('2d').getImageData(0, 0, this.width, this.height)
                return resolve(frameBuffer);
            };
            image.src = file.path;
        });
    }
    setProperties(properties) {
    }
    updateFrameBuffer(frameBuffer) {
    }
}

frameFactory.install('bmp', RgbFrame);
frameFactory.install('png', RgbFrame);
frameFactory.install('jpg', RgbFrame);
frameFactory.install('jpeg', RgbFrame);
