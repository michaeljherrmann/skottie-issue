const sharp = require('sharp');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');
const { WebGLRenderingContext } = require('gl/src/javascript/webgl-rendering-context');

const Canvas = require('./canvas');
const lottieData = require('./data.json');

const SCALE = 1; // change this to something smaller like 0.5 and then HW works
const FRAMES = [5, 35, 34, 435, 55 ]; // HW stops working after the first frame

demoSW().then(demoHW);

function setupNodePolyfills() {
    global.HTMLCanvasElement = Canvas;
    global.WebGLRenderingContext = WebGLRenderingContext;
}

function logImage(dataUrl, options = { width: 100 }) {
    if (!process.env.ITERM_SESSION_ID) {
        // only try logging an inline image if using iterm, otherwise just output the dataUrl url
        console.log(dataUrl);
        return;
    }
    let optionStr = 'inline=1';
    if (options.width) {
        optionStr += `;width=${options.width}`;
    }
    const base64 = dataUrl.replace('data:image/png;base64,', '');
    console.log(`\x1B]1337;File=${optionStr}:${base64}\x07`);
}

function drawFrame(animation, skCanvas, surface, bounds, frame) {
    animation.seekFrame(frame);
    animation.render(skCanvas, bounds);
    surface.flush();
}

async function logCanvas(skCanvas, imageInfo) {
    const pixels = skCanvas.readPixels(0, 0, imageInfo);
    const buffer = await sharp(
        pixels,
        {
            raw: {
                width: imageInfo.width,
                height: imageInfo.height,
                channels: 4,
                premultiplied: false,
            },
        }
    ).png().toBuffer();
    logImage(buffer.toString('base64'));
}

async function demoSW() {
    const CanvasKit = await CanvasKitInit({
        locateFile: () => {
            return './node_modules/canvaskit-wasm/bin/full/canvaskit.wasm';
        },
    });
    const json = JSON.stringify(lottieData);
    const animation = CanvasKit.MakeAnimation(json);
    let [width, height] = animation.size();

    // apply scale
    width *= SCALE;
    height *= SCALE;

    const surface = CanvasKit.MakeSurface(width, height);
    const imageInfo = surface.imageInfo();
    const skCanvas = surface.getCanvas();
    const bounds = CanvasKit.XYWHRect(0, 0, width, height);

    for (const frame of FRAMES) {
        console.group(`SW Frame ${frame}:`);
        skCanvas.clear(CanvasKit.TRANSPARENT);
        drawFrame(animation, skCanvas, surface, bounds, frame);
        await logCanvas(skCanvas, imageInfo);
        console.groupEnd();
    }

    animation.delete();
    surface.delete();
}

async function demoHW() {
    setupNodePolyfills();
    const CanvasKit = await CanvasKitInit({
        locateFile: () => {
            return './node_modules/canvaskit-wasm/bin/full/canvaskit.wasm';
        },
        wasmMemory: new WebAssembly.Memory({
            initial: 32767,
            maximum: 65536,
            shared: false,
        }),
    });
    const json = JSON.stringify(lottieData);
    const animation = CanvasKit.MakeAnimation(json);
    let [width, height] = animation.size();

    // apply scale
    width *= SCALE;
    height *= SCALE;

    // create cairo backed canvas
    const canvas = new Canvas(width, height);
    canvas.tagName = "CANVAS";
    
    const bounds = CanvasKit.XYWHRect(0, 0, width, height);

    for (const frame of FRAMES) {
        
        console.time()
        const surface = CanvasKit.MakeWebGLCanvasSurface(canvas);
        console.timeEnd()
        const imageInfo = surface.imageInfo();
        const skCanvas = surface.getCanvas();
        console.group(`HW Frame ${frame}:`);
        skCanvas.clear(CanvasKit.TRANSPARENT);

        drawFrame(animation, skCanvas, surface, bounds, frame);
        await logCanvas(skCanvas, imageInfo);
        console.groupEnd();
        surface.delete();
    }

    animation.delete();   
}
