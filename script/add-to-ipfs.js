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
    [
      "add",
      "--quieter",
      "--recursive",
      // For ease of pinning
      "--wrap-with-directory",
    ]
      .concat(extraArgs),
    {
      stdio: 'inherit',
      maxBuffer: 99999,
      cwd: path.dirname(__dirname),
      shell: true
    }
  );
};

console.log("animation");
ipfs("./dist/animation/*");

console.log("image");
ipfs(`./dist/image/*`);

console.log("svg");
ipfs(`./dist/svg/*`);

console.log("metadata");
ipfs(`./dist/metadata/*`);

console.log("thumbnail");
ipfs(`./dist/thumbnail/*`);

console.log("DONE.");
