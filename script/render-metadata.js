const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const { spawnSync } = require("node:child_process");

require("../src/js/node");

const config = require("../src/js/config");

const ipfs = extraArgs => {
  const sub = spawnSync(
    "ipfs",
    [ "add", "--offline", "--only-hash", "--quieter" ]
      .concat(extraArgs),
    {
      cwd: path.dirname(__dirname),
      shell: true
    }
  );
  if (sub.status != 0) {
    throw sub.stderr.toString();
  }
  return `ipfs://${sub.stdout.toString().trimEnd()}`;
};

const links = [];

const animationPath = "dist/animation";

const animationDirHash = ipfs(
  [
    // We need to be able to use relative paths in the html,
    // so we have to add this wrapped in a directory.
    "--wrap-with-directory",
    // We will need the cid for the dir containing the js/css,
    // as this is how it will be uploaded, to allow for relative
    // paths to them in the html.
    "--recursive"
  ].concat(
    fs.readdirSync(animationPath)
      .map(fileName => path.join(animationPath, fileName))
  )
);

console.log(
  `HTML5 canvas animation files directory hash: ${animationDirHash}\n`
);

for (let i = 0; i < config.edition; i++) {
  const id = config.firstId + i;
  process.stderr.write(`${id} `);
  fs.writeFileSync(
    `./dist/metadata/${id}`,
    JSON.stringify(
      {
        "name": `${config.projectName} ${id}`,
        "description": config.projectDescription,
        "image": ipfs(`./dist/image/${id}`),
        "animation_url": `${animationDirHash}/${id}`,
        "svg_url": ipfs(`./dist/svg/${id}`)
      },
      null,
      2
    )
  );
}

process.stderr.write("\n");
