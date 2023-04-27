const sharp = require('sharp');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');

const webgl = require('webgl-raub');
const { Document } = require('glfw-raub');
console.log('start programm');
Document.setWebgl(webgl);

const doc = new Document();
global.document = global.window = doc;

// node 18 fetch used by canvaskit-wasm, without this line it tries to download the wasm file using fetch
global.fetch = undefined;

console.log(global.WebGLRenderingContext);
console.log('webgl2', typeof WebGL2RenderingContext !== 'undefined')


const lottieData = require('./data.json');

const SCALE = 1; // change this to something smaller like 0.5 and then HW works
const FRAMES = [5, 3, 55]; // HW stops working after the first frame

demoHW();


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
        locateFile: (file) => './node_modules/canvaskit-wasm/bin/full/canvaskit.wasm'
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

    // create cairo backed canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl');

    const customContext = canvas.getContext('webgl', {
        'alpha': 1,
          'depth': 1,
          'stencil': 8,
          'antialias': 0,
          'premultipliedAlpha': 1,
          'preserveDrawingBuffer': 0,
          'preferLowPowerToHighPerformance':  0,
          'failIfMajorPerformanceCaveat':0,
          'enableExtensionsByDefault':1,
          'explicitSwapControl':  0,
          'renderViaOffscreenBackBuffer':  0,
          'majorVersion':  1,
    });

    console.log('customContext', customContext);
    
    const surface = CanvasKit.MakeWebGLCanvasSurface(canvas);
    const imageInfo = surface.imageInfo();
    const skCanvas = surface.getCanvas();
    const bounds = CanvasKit.XYWHRect(0, 0, width, height);

    for (const frame of FRAMES) {
        console.group(`HW Frame ${frame}:`);
        skCanvas.clear(CanvasKit.TRANSPARENT);
        drawFrame(animation, skCanvas, surface, bounds, frame);
        await logCanvas(skCanvas, imageInfo);
        console.groupEnd();
    }

    animation.delete();
    surface.delete();
}
