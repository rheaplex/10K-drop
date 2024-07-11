/* global globalThis */

const fs = require("node:fs");
const { createHash } = require("node:crypto");
const { DOMMatrix, createCanvas } = require('canvas');

globalThis.DOMMatrix = DOMMatrix;

globalThis.createCanvas = createCanvas;

globalThis.fetchUrl = async (file, prefix) => {
  return fs.readFileSync(`${prefix}/${file}`).buffer;
};

globalThis.createHash = async plaintext => {
  const buffer = new Int8Array(1);
  buffer[0] = plaintext;
  return createHash("sha256")
    .update(buffer)
    .digest("hex");
};
