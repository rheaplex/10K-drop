const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");
const { initDrop, runSimulationToEnd, offscreenKs } = require("../src/js/drop");

const checkEdition = async id => {
  const [ ks, backgroundStyle ] = await initDrop(id, config);
  runSimulationToEnd();
  const offscreen = offscreenKs(ks);
    if (offscreen.length > 0) {
      offscreen.length();
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
      process.stderr.write(`${id}: row detected.\n`);
    }
  return [
    (offscreen.length > 0) ? 1 : 0,
    (thisRowCount > 2) ? 1 : 0
  ];
};

(async function() {
  let offscreenCount = 0;
  let rowCount = 0;
  for (let i = 0; i < config.edition; i++) {
    const id = config.firstId + i;
    const [ offscreen, row ] = await checkEdition(id);
    offscreenCount += offscreen;
    rowCount += row;
  }
  for (let i = 0; i < config.ap; i++) {
    const id = config.edition + i;
    const [ offscreen, row ] = await checkEdition(id);
    offscreenCount += offscreen;
    rowCount += row;
  }
  if (offscreenCount == 0) {
    process.stderr.write("None offscreen.\n");
  }
  if (rowCount == 0) {
    process.stderr.write("No rows detected.\n");
  }
})();
