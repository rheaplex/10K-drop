const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");
const { initDrop, initFonts, runSimulationToEnd } = require("../src/js/drop");
const { initCanvas, renderCanvas } = require("../src/js/canvas");

(async function () {
  await initFonts(config.scriptFontDir);
  //for (let i = 0; i < config.edition; i++) {
  const id = 139;// config.firstId + i;
    process.stderr.write(`${id} `);
    const [ ks, backgroundStyle ] = await initDrop(id, config);
    const canvas = initCanvas(ks, backgroundStyle, config);
    runSimulationToEnd();
    renderCanvas();
    const buffer = canvas.toBuffer();
    fs.writeFileSync(`./dist/image/${id}`, buffer);
  //}
  process.stderr.write("\n");
})();
