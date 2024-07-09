////////////////////////////////////////////////////////////////////////
// Imports.
////////////////////////////////////////////////////////////////////////

const fs = require("node:fs");

require("../src/js/node");

const { initDrop, runSimulationToEnd } = require("../src/js/drop");
const { initCanvas, renderCanvas } = require("../src/js/canvas");

const renderPng = async (hash) => {
  const [ ks, backgroundStyle ] = await initDrop(hash, "./src/fonts");
  let canvas = await initCanvas(ks, backgroundStyle);
  runSimulationToEnd();
  renderCanvas();
  const buffer = canvas.toBuffer();
  fs.writeFileSync(`${hash}.png`, buffer);
};

(async function () {
  await renderPng("0da7883a44a3de97134015120b541c1b12f6ffc313c9dbd95e9edb12551a5e2f");
})();
