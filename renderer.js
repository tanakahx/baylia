const SCALE_MAX = 64;
const SCALE_MIN = 1/64;
let scale = 1

let canvasIdMap = new Map();
const origin = new Object();
origin.x = 0;
origin.y = 0;
const dragStart = new Object();
let dragCanvas = null;

const NO_MOUSE_BUTTON = 0;
const PRIMARY_MOUSE_BUTTON = 1;
const SECONDARY_MOUSE_BUTTON = 2;
let mouseState1d = NO_MOUSE_BUTTON;
let mouseState0d = NO_MOUSE_BUTTON;

const info = document.getElementById('info');

let canvasId = 0;
let isShiftPressed = false;
let isControlPressed = false;
let isContextMenuRequested = true;

let mouseDownTimer = null;
let mouseDownTime = 0;
const MOUSE_DOWN_TIME_LIMIT = 250; // ms

const roi = new Object();
roi.x0 = 0;
roi.y0 = 0;
roi.x1 = 0;
roi.y1 = 0;

class ImageFrame {
    constructor() {
        this.frame = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.canvasId = null;
        this.filePath = null;
    }
    get width() {
        return this.frame.width;
    }
    get height() {
        return this.frame.height;
    }
    get type() {
        return this.frame.type;
    }
    get numColorType() {
        return this.frame.numColorType;
    }
    get isValid() {
        return this.frame != null;
    }
    at(x, y) {
        return this.frame.at(x, y);
    }
    async readFile(file) {
        this.frame = frameFactory.createFrame(file);
        return await this.frame.readFile(file);
    }
}

function reset() {
    canvasIdMap.forEach((canvas, key) => {
        canvas.imageFrame.offsetX = 0;
        canvas.imageFrame.offsetY = 0;
    })
    scale = 1;
    origin.x = 0;
    origin.y = 0;
    dragCanvas = null;
    isShiftPressed = false;
    isControlPressed = false;
    info.innerHTML = '';
}

function quantizeWithScale(x, scale) {
    return Math.round(x / scale) * scale;
}

function drawFilePath(canvas, filePath) {
    function measureFontWidth(ctx) {
        const metrics = ctx.measureText('X');
        return metrics.width;
    }
    function measureFontHeight(ctx) {
        const metrics = ctx.measureText('X');
        return metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    }
    const ctx = canvas.getContext('2d');
    ctx.font = '13px monospace';
    const fontWidth = measureFontWidth(ctx);
    const fontHeight = measureFontHeight(ctx);
    const numCharsPerLine = Math.floor(canvas.width / fontWidth);
    const text = filePath;
    const numLines = Math.ceil(text.length / numCharsPerLine);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, fontHeight * numLines);
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'black';
    for (let i = 0; i < numLines; i++) {
        ctx.fillText(text.substr(i * numCharsPerLine, numCharsPerLine), 0, i * (fontHeight));
    }
}

function drawRoi() {
    if (roi.x0 == roi.x1 && roi.y0 == roi.y1) {
        return;
    }
    canvasIdMap.forEach((canvas, canvasId) => {
        const boundingClientRect = canvas.getBoundingClientRect();
        if (boundingClientRect.x <= roi.x0 && roi.x0 < boundingClientRect.x + boundingClientRect.width && 
            boundingClientRect.y <= roi.y0 && roi.y0 < boundingClientRect.y + boundingClientRect.height) {
            const roiX0 = roi.x0 - boundingClientRect.x;
            const roiY0 = roi.y0 - boundingClientRect.y;
            const roiX1 = roi.x1 - boundingClientRect.x;
            const roiY1 = roi.y1 - boundingClientRect.y;
            const roiWidth = roiX1 - roiX0;
            const roiHeight = roiY1 - roiY0;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#ff0000';
            ctx.fillStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.strokeRect(roiX0, roiY0, roiWidth, roiHeight);
            // draw line
            ctx.beginPath();
            ctx.moveTo(roiX0, roiY0);
            ctx.lineTo(roiX1, roiY1);
            ctx.closePath();
            ctx.stroke();
            // draw arrow
            ctx.beginPath();
            const arrowSize = 10; // pixel
            const arrowAngle = 40 * Math.PI / 180; // rad
            const theta = Math.atan2(-(roiY1 - roiY0), roiX1 - roiX0);
            const arrowLength = arrowSize / Math.cos(arrowAngle / 2);
            const dxLeft = arrowLength * Math.cos(theta - arrowAngle / 2);
            const dyLeft = arrowLength * Math.sin(theta - arrowAngle / 2);
            const dxRight = arrowLength * Math.sin(Math.PI / 2 - theta - arrowAngle / 2);
            const dyRight = arrowLength * Math.cos(Math.PI / 2 - theta - arrowAngle / 2);
            ctx.moveTo(roiX1, roiY1);
            ctx.lineTo(roiX1 - dxLeft, roiY1 + dyLeft);
            ctx.lineTo(roiX1 - dxRight, roiY1 + dyRight);
            ctx.closePath();
            ctx.fill();
        }
    });
}

function draw() {
    canvasIdMap.forEach((canvas, canvasId) => {
        const imageFrame = canvas.imageFrame;
        if (imageFrame.isValid) {
            const fb = canvas.frameBuffer;
            const drawX = quantizeWithScale(origin.x + imageFrame.offsetX, scale);
            const drawY = quantizeWithScale(origin.y + imageFrame.offsetY, scale);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(fb, 0, 0, imageFrame.width, imageFrame.height, drawX, drawY, imageFrame.width * scale, imageFrame.height * scale);
            if (scale >= SCALE_MAX) {
                drawPixelValues(canvas, canvas);
            }
            drawFilePath(canvas, imageFrame.filePath); 
        }
    });
    drawRoi();
}

function drawAllWith(canvasId) {
    const srcCanvas = canvasIdMap.get(canvasId);
    const srcImageFrame = srcCanvas.imageFrame;
    const srcFrameBuffer = srcCanvas.frameBuffer;
    const drawX = quantizeWithScale(origin.x + srcImageFrame.offsetX, scale);
    const drawY = quantizeWithScale(origin.y + srcImageFrame.offsetY, scale);
    canvasIdMap.forEach((canvas, canvasId) => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(srcFrameBuffer, 0, 0, srcImageFrame.width, srcImageFrame.height, drawX, drawY, srcImageFrame.width * scale, srcImageFrame.height * scale);
        if (scale >= SCALE_MAX) {
            drawPixelValues(srcCanvas, canvas);
        }
        drawFilePath(canvas, srcImageFrame.filePath);
    })
    drawRoi();
}

function drawPixelValues(srcCanvas, dstCanvas) {
    const marginX = 1;
    const marginY = 1;
    const srcImageFrame = srcCanvas.imageFrame;
    if (srcImageFrame.isValid) {
        const ctx = dstCanvas.getContext('2d');
        ctx.font = '14px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const drawX = quantizeWithScale(origin.x + srcImageFrame.offsetX, scale);
        const drawY = quantizeWithScale(origin.y + srcImageFrame.offsetY, scale);
        for (let y = 0; y < dstCanvas.height; y += scale) {
            for (let x = 0; x < dstCanvas.width; x += scale) {
                const pixX = Math.floor((x - drawX) / scale);
                const pixY = Math.floor((y - drawY) / scale);
                if (pixX >= 0 && pixX < srcImageFrame.width && pixY >= 0 && pixY < srcImageFrame.height) {
                    const pixelVal = srcCanvas.imageFrame.at(pixX, pixY);
                    const numChannelPerPixel = srcImageFrame.type == 'rgb' ? 3 : 1;
                    for (let i = 0; i < numChannelPerPixel; i++) {
                        ctx.fillText(pixelVal[i], x + marginX, y + (marginY + 12) * i);
                    }
                }
            }
        }
    }
}

function rearrangeCanvas() {
    for (const [key, canvas] of canvasIdMap) {
        canvas.width = Math.floor(document.documentElement.clientWidth / canvasIdMap.size);
        canvas.height = document.documentElement.clientHeight - info.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
    }
}

function getMousePosition(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
}

window.onresize = function() {
    rearrangeCanvas();
    draw();
}

document.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
});

document.addEventListener('drop', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    for (const f of e.dataTransfer.files) {
        const imageFrame = new ImageFrame();
        const frameBuffer = await imageFrame.readFile(f);

        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        imageFrame.canvasId = canvas.id;
        imageFrame.filePath = f.path;
        canvasId++;
        canvas.imageFrame = imageFrame;
        canvas.frameBuffer = frameBuffer;
        canvas.addEventListener('dragstart', (e) => {
            if (isShiftPressed) {
                e.dataTransfer.setData('text/plain', e.target.id);
            }
        });
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            if (isShiftPressed) {
                const id = e.dataTransfer.getData('text/plain');
                const src = document.getElementById(id);
                canvas.parentNode.insertBefore(src, canvas);
                document.querySelectorAll('#view canvas').forEach(elm => {
                    elm.draggable = false;
                });
                isShiftPressed = false;
                mouseState0d = NO_MOUSE_BUTTON;
                draw();
            }
        });
        canvas.addEventListener('mousemove', (e) => {
            const pos = getMousePosition(canvas, e);
            const drawX = Math.floor((origin.x + canvas.imageFrame.offsetX) / scale) * scale;
            const drawY = Math.floor((origin.y + canvas.imageFrame.offsetY) / scale) * scale;
            const pixX = Math.floor((pos.x - drawX) / scale);
            const pixY = Math.floor((pos.y - drawY) / scale);
            if (pixX < 0 || pixX >= canvas.imageFrame.width || pixY < 0 || pixY >= canvas.imageFrame.height) {
                info.innerText = '';
            } else {
                const pixelVal = canvas.imageFrame.at(pixX, pixY);
                const pixelInfo = `scale=${scale} pos=${pixX},${pixY} pixel=(` + pixelVal.join() + ')';
                info.innerText = pixelInfo;
            }
            clearInterval(mouseDownTimer);
        });
        canvas.addEventListener('mousedown', (e) => {
            if (isShiftPressed) {
                return;
            }
            dragStart.x = e.clientX;
            dragStart.y = e.clientY;
            mouseState1d = mouseState0d;
            mouseState0d = e.buttons;
            dragCanvas = e.target;
            if (mouseDownTimer) {
                clearInterval(mouseDownTimer);
                mouseDownTime = 0;
                draw();
            }
            if (!(mouseState1d & PRIMARY_MOUSE_BUTTON) && (mouseState0d & PRIMARY_MOUSE_BUTTON)) {
                if (isControlPressed) {
                    roi.x0 = e.clientX;
                    roi.y0 = e.clientY;
                    roi.x1 = roi.x0;
                    roi.y1 = roi.y0;
                    return;
                }
                mouseDownTime = 0;
                mouseDownTimer = setInterval(() => {
                    mouseDownTime += 100;
                    if (mouseDownTime >= MOUSE_DOWN_TIME_LIMIT) {
                        clearInterval(mouseDownTimer);
                        drawAllWith(canvas.id);
                    }
                }, 100);
            } else if (!(mouseState1d & SECONDARY_MOUSE_BUTTON) && (mouseState0d & SECONDARY_MOUSE_BUTTON)) {
                isContextMenuRequested = true;
            }
        });
        canvas.addEventListener('mouseup', (e) => {
            if (isShiftPressed) {
                return;
            }
            mouseState1d = mouseState0d;
            mouseState0d = e.buttons;
            if ((mouseState1d & PRIMARY_MOUSE_BUTTON) && !(mouseState0d & PRIMARY_MOUSE_BUTTON)) {
                if (isControlPressed) {
                    roi.x1 = e.clientX;
                    roi.y1 = e.clientY;
                    draw();
                }
            } else if ((mouseState1d & SECONDARY_MOUSE_BUTTON) && !(mouseState0d & SECONDARY_MOUSE_BUTTON) && isContextMenuRequested) {
                // This variable is forced to false here because the keyup event is not fired
                // when the control key is released while the context menu is displayed.
                isControlPressed = false;

                window.api.send('context-menu-show', canvas.imageFrame);
            }
        });
        canvas.addEventListener('wheel', (e) => {
            const pos = getMousePosition(canvas, e);
            if (e.deltaY < 0 && scale < SCALE_MAX) {
                scale *= 2
                origin.x -= pos.x - origin.x;
                origin.y -= pos.y - origin.y;
                origin.x = quantizeWithScale(origin.x, scale);
                origin.y = quantizeWithScale(origin.y, scale);
                canvasIdMap.forEach((canvas, canvasId) => {
                    canvas.imageFrame.offsetX = quantizeWithScale(canvas.imageFrame.offsetX * 2, scale);
                    canvas.imageFrame.offsetY = quantizeWithScale(canvas.imageFrame.offsetY * 2, scale);
                });
                draw()
            } else if (e.deltaY > 0 && scale > SCALE_MIN) {
                scale /= 2
                origin.x += (pos.x - origin.x) / 2;
                origin.y += (pos.y - origin.y) / 2;
                origin.x = quantizeWithScale(origin.x, scale);
                origin.y = quantizeWithScale(origin.y, scale);
                canvasIdMap.forEach((canvas, canvasId) => {
                    canvas.imageFrame.offsetX = quantizeWithScale(canvas.imageFrame.offsetX / 2, scale);
                    canvas.imageFrame.offsetY = quantizeWithScale(canvas.imageFrame.offsetY / 2, scale);
                });
                draw()
            }
            document.getElementById('info').innerText = `scale=${scale}`;
        });
        canvasIdMap.set(canvas.id, canvas);
        rearrangeCanvas();
        document.getElementById('view').appendChild(canvas);
        draw();
    }
});

document.addEventListener('mousemove', (e) => {
    if (isShiftPressed) {
        return;
    }
    if (mouseState0d & PRIMARY_MOUSE_BUTTON) {
        const mouseDelta = Object();
        mouseDelta.x = e.clientX - dragStart.x;
        mouseDelta.y = e.clientY - dragStart.y;
        if (isControlPressed) {
            roi.x1 += mouseDelta.x;
            roi.y1 += mouseDelta.y;
        } else {
            origin.x += mouseDelta.x;
            origin.y += mouseDelta.y;
        }
        draw();
    } else if (mouseState0d & SECONDARY_MOUSE_BUTTON) {
        const mouseDelta = Object();
        mouseDelta.x = e.clientX - dragStart.x;
        mouseDelta.y = e.clientY - dragStart.y;
        dragCanvas.imageFrame.offsetX += mouseDelta.x;
        dragCanvas.imageFrame.offsetY += mouseDelta.y;
        if (mouseDelta.x != 0 || mouseDelta.y != 0) {
            isContextMenuRequested = false;
        }
        draw();
    }
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
});

document.addEventListener('mouseup', (e) => {
    if ((mouseState1d & PRIMARY_MOUSE_BUTTON) && !(mouseState0d & PRIMARY_MOUSE_BUTTON)) {
        origin.x = quantizeWithScale(origin.x, scale);
        origin.y = quantizeWithScale(origin.y, scale);
    }
    if ((mouseState1d & SECONDARY_MOUSE_BUTTON) && !(mouseState0d & SECONDARY_MOUSE_BUTTON) && dragCanvas) {
        dragCanvas.imageFrame.offsetX = quantizeWithScale(dragCanvas.imageFrame.offsetX, scale);
        dragCanvas.imageFrame.offsetY = quantizeWithScale(dragCanvas.imageFrame.offsetY, scale);
        dragCanvas = null;
    }
    clearInterval(mouseDownTimer);
    if (mouseDownTime >= MOUSE_DOWN_TIME_LIMIT) {
        mouseDownTime = 0;
        draw();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key == 'f') {
        const view = document.getElementById('view');
        const canvas = view.firstChild;
        view.appendChild(canvas);
        draw();
    } else if (e.key == 'g') {
        const view = document.getElementById('view');
        const canvas = view.lastChild;
        view.insertBefore(canvas, view.firstChild);
        draw();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == 'c') {
        canvasIdMap = new Map();
        reset();
        document.getElementById('view').innerHTML = '';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == 'q') {
        window.close();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == 'z') {
        scale *= 2;
        canvasIdMap.forEach((canvas, canvasId) => {
            canvas.imageFrame.offsetX = quantizeWithScale(canvas.imageFrame.offsetX * 2, scale);
            canvas.imageFrame.offsetY = quantizeWithScale(canvas.imageFrame.offsetY * 2, scale);
        });
        draw();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == 'x') {
        scale /= 2;
        canvasIdMap.forEach((canvas, canvasId) => {
            canvas.imageFrame.offsetX = quantizeWithScale(canvas.imageFrame.offsetX / 2, scale);
            canvas.imageFrame.offsetY = quantizeWithScale(canvas.imageFrame.offsetY / 2, scale);
        });
        draw();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == 'Shift') {
        document.querySelectorAll('#view canvas').forEach(elm => {
            elm.draggable = true;
        });
        isShiftPressed = true;
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key == 'Control') {
        isControlPressed = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key == 'Shift') {
        document.querySelectorAll('#view canvas').forEach(elm => {
            elm.draggable = false;
        });
        isShiftPressed = false;
        mouseState0d = NO_MOUSE_BUTTON;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key == 'Control') {
        isControlPressed = false;
        mouseState0d = NO_MOUSE_BUTTON;
    }
});

// IPC
window.api.receive('reset', () => {
    reset();
    draw();
});

window.api.receive('close', (canvasId) => {
    const canvas = document.getElementById(canvasId);
    canvasIdMap.delete(canvasId);
    canvas.remove();
    if (canvasIdMap.size == 0) {
        reset();
    } else {
        rearrangeCanvas();
        draw();
    }
});
