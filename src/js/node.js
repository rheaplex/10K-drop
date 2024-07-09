/* global globalThis */

const fs = require("node:fs");
const { createCanvas } = require('canvas');

/*const createCanvas = (width, height) => {
   createCanvas(width, height);
   };*/

globalThis.createCanvas = createCanvas;

globalThis.fetchUrl = async (file, prefix) => {
  return fs.readFileSync(`${prefix}/${file}`).buffer;
};
