const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");
const { initDrop, runSimulationToEnd } = require("../src/js/drop");
const { initCanvas, renderCanvas } = require("../src/js/canvas");

const render = async id => {
  process.stderr.write(`${id} `);
  const [ ks, backgroundStyle ] = await initDrop(id, config);
  const canvas = initCanvas(ks, backgroundStyle, config);
  runSimulationToEnd();
  renderCanvas();
  const buffer = canvas.toBuffer();
  fs.writeFileSync(`./dist/image/${id}`, buffer);
};

(async function () {
  for (let i = 0; i < config.edition; i++) {
    const id = config.firstId + i;
    await render(id);
  }
  for (let i = 0; i < config.ap; i++) {
    const id = config.edition + i;
    await render(id);
  }
  process.stderr.write("\n");
})();
