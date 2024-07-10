const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");
const config = require("../src/js/config");

const links = [];

for (let i = 0; i < config.edition; i++) {
  const id = config.firstId + i;
  process.stderr.write(`${id} `);
  fs.writeFileSync(
    `./dist/${id}`,
    JSON.stringify(
      {
        "image": `./image/${id}.png`,
        "animation_url": `./animation/${id}.html`,
        "name": `${config.projectName} (${id})`,
        "description": config.description,
        "svg_url": `./svg/${id}.svg`
      },
      null,
      2
    )
  );
}
