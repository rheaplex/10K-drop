require("./browser.js");

const { initDrop, initFonts } = require("./drop");
const { initCanvas, renderCanvasLoop } = require("./canvas");

(async function main (hash) {
  await initFonts( "./fonts");
  const [ ks, backgroundStyle ] = await initDrop(hash);
  const canvas = await initCanvas(ks, backgroundStyle);
  document.body.appendChild(canvas);
  renderCanvasLoop();
})(HASH);
