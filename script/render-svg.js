const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");
const { initDrop, initFonts, runSimulationToEnd } = require("../src/js/drop");
const { initSvg, renderSvg, serializeSvg } = require("../src/js/svg");

(async function() {
  await initFonts(config.scriptFontDir);
  for (let i = 0; i < config.edition; i++) {
    const id = config.firstId + i;
    process.stderr.write(`${id} `);
    const [ ks, backgroundStyle ] = await initDrop(id, config);
    runSimulationToEnd();
    initSvg(config);
    let svg = renderSvg(ks, backgroundStyle);
    fs.writeFileSync(`./dist/svg/${id}`, serializeSvg(svg));
  }
  process.stderr.write("\n");
})();
