/* global id */

require("./browser");
const config = require("./config");

const { initDrop, initFonts } = require("./drop");
const { initCanvas, renderCanvasLoop } = require("./canvas");

(async function main (id) {
  await initFonts( "./fonts");
  const [ ks, backgroundStyle ] = await initDrop(id, config);
  const canvas = initCanvas(ks, backgroundStyle, config);
  document.body.appendChild(canvas);
  renderCanvasLoop();
})(id);
