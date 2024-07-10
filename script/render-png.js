const fs = require("node:fs");
const process = require("node:process");

const { parse } = require("csv-parse");

require("../src/js/node");

const { initDrop, initFonts, fonts, runSimulationToEnd } = require("../src/js/drop");
const { initCanvas, renderCanvas } = require("../src/js/canvas");

(async function () {
  await initFonts("./src/fonts");
  fs.createReadStream("./src/hashes.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
      if(row[1].length != 64) {
        console.error(`Invalid row: ${row}`);
      }
      const [ ks, backgroundStyle ] = initDrop(row[1]);
      let canvas = initCanvas(ks, backgroundStyle);
      runSimulationToEnd();
      renderCanvas();
      const buffer = canvas.toBuffer();
      fs.writeFileSync(`./dist/${row[0]}.png`, buffer);
    });
})();
