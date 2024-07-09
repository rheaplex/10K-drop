require("./browser.js");

const { initDrop } = require("./drop");
const { initCanvas, renderCanvasLoop } = require("./canvas");

(async function main (hash) {
  const [ ks, backgroundStyle ] = await initDrop(hash, "./fonts");
  const canvas = await initCanvas(ks, backgroundStyle);
  document.body.appendChild(canvas);
  renderCanvasLoop();
})(HASH);
