const process = require("node:process");

const Sharp = require("sharp");

const config = require("../src/js/config");

const resize = async id => {
  process.stderr.write(`${id} `);
  const sharp = new Sharp(`./dist/image/${id}`);
  sharp.resize(
    config.thumbnailSize,
    config.thumbnailSize,
    {
      fit: "cover"
    }
  );
  await sharp.toFile(`./dist/thumbnail/${id}`);
};

(async function() {
  for (let i = 0; i < config.edition; i++) {
    const id = config.firstId + i;
    await resize(id);
  }
  for (let i = 0; i < config.ap; i++) {
    const id = config.edition + i;
    await resize(id);
  }
  process.stderr.write("\n");
 })();
