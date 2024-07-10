const Sharp = require("sharp");

const config = require("../src/js/config");

(async function() {
  for (let i = 0; i < config.edition; i++) {
    const id = config.firstId + i;
    process.stderr.write(`${id} `);
    const sharp = new Sharp(`./dist/image/${id}.png`);
    sharp.resize(
        config.thumbnailSize,
        config.thumbnailSize,
        {
            fit: "cover"
        }
    );
    await sharp.toFile(`./dist/thumbnail/${id}.png`);
  }
 })();
