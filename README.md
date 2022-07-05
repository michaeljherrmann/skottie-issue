# Skottie Issue

This is a demo for an issue I'm having with rendering lottie with Skia ([Skottie](https://skia.org/docs/user/modules/skottie/)).
The problem is that the WebGL backed surface only renders to the canvas once and then silently 
stops updating it. Using the SW surface doesn't have this issue.


## Try it

Check out this repo and run:

```bash
npm install && npm start
```

If using [iterm](https://iterm2.com/), the script will print images directly in the console 
otherwise a base64 dataUrl will be printed. The main thing to note is that the HW demo will only 
generate the first frame, and then any frame afterwards is blank.

Here are the expected frames

Frame 5\
![Frame 5](./frames/5.png)

Frame 55\
![Frame 55](./frames/55.png)

You can watch the full animation in the [skottie web player](https://skottie.skia.org/473c80e8f6fccc04e54c63ebad09be19?bg=%23FFFFFF&h=1080&w=1920).

## Observations

- After the first `animation.render` call, which seems to work fine, it's no longer possible to do 
other draws to the canvas (either with `animation.render` or with other draw calls directly from 
the canvas, like `drawRRect`).
- Changing the scale so the overall dimensions are smaller will result in subsequent frames 
  drawing (for me reducing the size from 1080p to about half worked).
- It doesn't seem to be correlated to a specific layer in the lottie data. However, once 
  removing enough layers it does seem to start working


## Environment
macOS 11.6.4\
node v14.17.6

also reproduced on ubuntu 20.04
