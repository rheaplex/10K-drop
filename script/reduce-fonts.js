/* global Buffer fetchUrl */

//IMPORTANT: To use me:
//    node script/reduce-fonts.js > src/js/fonts.json
// This does *not* happen during the main build!

const fs = require("node:fs");
const path = require("node:path");
const opentype = require("opentype.js");
const Matter = require("matter-js");
// module aliases
const Engine    = Matter.Engine,
      Common    = Matter.Common,
      Bodies    = Matter.Bodies,
      Body      = Matter.Body,
      Composite = Matter.Composite,
      Vertices  = Matter.Vertices;

// Support concave body decomposition.
const decomp = require("poly-decomp");
Common.setDecomp(decomp);

require("../src/js/node");

const { FONTS } = require("../src/js/style");

// We don't use the config, as we want to make sure we use the originals.
const FONTDIR = "./src/fonts";
const DESTDIR = "./dist/animation/js";

const fetchFont = async (file, prefix) => {
  let data = await fetchUrl(file, prefix);
  return opentype.parse(data);
};
const pathToVertices = (path) => {
  let vertices = [];
  let first;
  let previous;
  path.forEach(p => {
    if (! first) {
      first = p;
    }
    switch (p.type) {
    case "M":
    case "L":
      vertices.push({ x: p.x, y: p.y });
      previous = p;
      break;
      // We are out of time to fix this.
      // Getting the points from the curve at various ts
      // breaks Matter.
      // So we just ignore them for the Body vertices.
      // For the sans fonts it doesn't notice.
      // For the comic font, the resulting overlap is funny.
      // Anything else we would have to decompose by hand.
    /*case "Q":
      break;*/
      // We don't need duplicate vertices for the Body.
    //case "Z":
      //  vertices.push({ x: first.x, y: first.y });
      // break;
    }
  });
  if (previous.x == first.x && previous.y == first.y) {
    vertices.pop();
  }
  return vertices;//.slice(0, vertices.length - 2);
};

const glyphVertexLists = (font, glyph) => {
  const path = glyph.getPath(0, 0, font.unitsPerEm).commands;
  const vertices = pathToVertices(path);
  const centre = Vertices.centre(vertices);
  // Position to 0, height (top left origin).
  const body = Bodies.fromVertices(
    - centre.x,
    centre.y,
    vertices
  );
  // Ignore the first part, which is a bounding rect
  return body.parts.slice(1).map(p => ({
    vertices: p.vertices.map(v => {
      return { x: v.x, y: v.y };
    }),
    position: p.position
  }));
};

const glyphData = (font, char) => {
  const glyph = font.charToGlyph(
    char,
    0,
    0,
    font.unitsPerEm
  );
  const glyphUnitScale = 1 / font.unitsPerEm;
  const bounds = glyph.getBoundingBox();
  const w = (bounds.x2 - bounds.x1);// * glyphUnitScale;
  const h = (bounds.y2 - bounds.y1);// * glyphUnitScale;
  return {
    instructions: glyph.getPath(
      - bounds.x1,
      h,
      font.unitsPerEm,
    ).commands,
    vertexLists: glyphVertexLists(font, glyph),
    dimensions: { w, h },
    glyphUnitScale,
  };
};

const fontData = font => {
  return {
    glyphUnitScale: 1 / font.unitsPerEm,
    uppercase: glyphData(font, "K"),
    lowercase: glyphData(font, "k")
  };
};

const fonts = {};

(async () => {
  for (const fontfilename of FONTS) {
    const data = await fetchUrl(fontfilename, FONTDIR);
    const font = opentype.parse(data);
    console.error(fontfilename);
    fonts[fontfilename] = fontData(font);
  }
  console.log(JSON.stringify(fonts, null, 2));
})();
