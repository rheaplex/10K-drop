const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const { spawnSync } = require("node:child_process");

require("../src/js/node");

const config = require("../src/js/config");

const animationPath = "dist/animation";

const ipfs = extraArgs => {
  const sub = spawnSync(
    "ipfs",
    [ "add" ]
      .concat(extraArgs),
    {
      stdio: 'inherit',
      maxBuffer: 99999,
      cwd: path.dirname(__dirname),
      shell: true
    }
  );
  /*if (sub.status != 0) {
    throw sub.stderr.toString();
  }
  console.log(sub.stdout.toString().trimEnd());*/
};

console.log("animation.");
ipfs(
  [
    "--quieter",
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

console.log("image");
ipfs(`./dist/image/*`);

console.log("svg");
ipfs(`./dist/svg/*`);

console.log("metadata");
ipfs(`./dist/metadata/*`);

console.log("thumbnail");
ipfs(`./dist/thumbnail/*`);

console.log("DONE.");
