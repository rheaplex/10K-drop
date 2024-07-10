const fs = require("node:fs");
const process = require("node:process");

const { parse } = require("csv-parse");

require("../src/js/node");

const { initDrop, initFonts, runSimulationToEnd } = require("../src/js/drop");
const { renderSvg, serializeSvg } = require("../src/js/svg");

(async function() {
  await initFonts("./src/fonts");
  fs.createReadStream("./src/hashes.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
      if(row[1].length != 64) {
        console.error(`Invalid row: ${row}`);
      }
      const [ ks, backgroundStyle ] = initDrop(row[1]);
      runSimulationToEnd();
      let svg = renderSvg(ks, backgroundStyle);
      fs.writeFileSync(`./dist/${row[0]}.svg`, serializeSvg(svg));
    });
})();
