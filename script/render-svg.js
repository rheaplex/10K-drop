const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");
const { initDrop, runSimulationToEnd } = require("../src/js/drop");
const { initSvg, renderSvg, serializeSvg } = require("../src/js/svg");

const render = async id => {

    process.stderr.write(`${id} `);
    const [ ks, backgroundStyle ] = await initDrop(id, config);
    runSimulationToEnd();
    initSvg(config);
    let svg = renderSvg(ks, backgroundStyle);
    fs.writeFileSync(`./dist/svg/${id}`, serializeSvg(svg));
};

(async function() {
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
