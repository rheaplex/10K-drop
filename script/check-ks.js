const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");
const { initDrop, runSimulationToEnd, offscreenKs } = require("../src/js/drop");

(async function() {
  let offscreenCount = 0;
  let rowCount = 0;
  for (let i = 0; i < config.edition; i++) {
    const id = config.firstId + i;
    const [ ks, backgroundStyle ] = await initDrop(id, config);
    runSimulationToEnd();
    const offscreen = offscreenKs(ks);
    if (offscreen.length > 0) {
      offscreenCount = offscreenCount + offscreen.length();
      process.stderr.write(
        `${id}: ${offscreen.length} offscreen `
          + `at ${offscreen.map(o =>`${o.body.bounds.max.y}`).join(", ")}\n`
      );
    }
    let thisRowCount = 0;
    for (const k of ks) {
      if ((k.body.bounds.max.y >= config.height)
          && (Math.abs(k.body.angle) < 0.01)) {
        thisRowCount++;
      }
    }
    if (thisRowCount > 2) {
      rowCount++;
      process.stderr.write(`${id}: row detected.\n`);
    }
  }
  if (offscreenCount == 0) {
    process.stderr.write("None offscreen.\n");
  }
  if (rowCount == 0) {
    process.stderr.write("No rows detected.\n");
  }
})();
