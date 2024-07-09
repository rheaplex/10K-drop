////////////////////////////////////////////////////////////////////////
// Imports.
////////////////////////////////////////////////////////////////////////

const fs = require("node:fs");

require("../src/js/node");

const { initDrop, runSimulationToEnd } = require("../src/js/drop");
const { renderSvg, serializeSvg } = require("../src/js/svg");

const renderSvgToFile = async (hash) => {
  const [ ks, backgroundStyle ] = await initDrop(hash, "./src/fonts");
  runSimulationToEnd();
  let svg = await renderSvg(ks, backgroundStyle);
  fs.writeFileSync(`${hash}.svg`, serializeSvg(svg));
};

(async function () {
  await renderSvgToFile("0da7883a44a3de97134015120b541c1b12f6ffc313c9dbd95e9edb12551a5e2f");
})();
