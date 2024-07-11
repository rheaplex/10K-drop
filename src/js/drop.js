/* global fetchUrl createHash */

////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////

const decomp = require("poly-decomp");
const opentype= require("./opentype");
const Matter = require("matter-js");

const Random = require("./random");
const { FONTS, genStyles } = require("./style");

// module aliases
const Engine    = Matter.Engine,
      Common    = Matter.Common,
      Bodies    = Matter.Bodies,
      Body      = Matter.Body,
      Composite = Matter.Composite,
      Vertices  = Matter.Vertices;


////////////////////////////////////////////////////////////////////////
// State.
////////////////////////////////////////////////////////////////////////

let config;

// Our prng.
let rnd;
// The Matter.js engine. We manage its updates manually.
let engine;

// The opentype.js font objects representing the fonts we use.
const fonts = {};
// The Ks to drop. Includes styling, physics simulation, and
// other useful information.
// This is a let as we replace it in test.js.
let ks;

////////////////////////////////////////////////////////////////////////
// Load resources, create objects.
////////////////////////////////////////////////////////////////////////

const fetchFont = async (file, prefix) => {
  let data = await fetchUrl(file, prefix);
  return opentype.parse(data);
};

// Fetch the fonts we use, in parallel.

const initFonts = async (prefix) => {
  const fontNames = Object.keys(FONTS);
  let result = await Promise.all(
    fontNames.map(async fontName =>
      fetchFont(FONTS[fontName], prefix)
    ));
  for (let i = 0; i < fontNames.length; i++) {
    fonts[fontNames[i]] = result[i];
  }
};

////////////////////////////////////////////////////////////////////////
// The physics simulation.
////////////////////////////////////////////////////////////////////////

const createEngine = () => {
  // Support concave body decomposition.
  Common.setDecomp(decomp);
  engine = Engine.create({
    //constraintIterations: 4,
    //positionIterations: 12,
    gravity: { x: 0.0, y: 1.1, scale: 0.002 }
  });
};

// Generate the edges of the canvas for the physics sim.
const createBounds = () => [
  // Base
  Bodies.rectangle(config.width / 2, config.height + 500, config.width, 1000, {
    isStatic: true,
    staticFriction: 200,
    restitution: 0,
    render: { visible: false }
  }),
  // Left
  Bodies.rectangle(-1, 0, 1, 9999, {
    isStatic: true,
    render: { visible: false }
  }),
  // Right
  Bodies.rectangle(config.width + 1, 0, 1, 9999, {
    isStatic: true,
    render: { visible: false }
  }),
];

const createBody = (glyph, x, y, scale, look) => {
  // We call pathToVertices each time as the results are consumed
  // by the next Vertices function calls..
  const vertices = Vertices.fromPath(glyph.toSVG());
  // Scale from truetype glyph space to font pixel size.
  Vertices.scale(vertices, scale, scale);
  const body = Bodies.fromVertices(
    x,
    y,
    vertices,
    {
      // Make sure the physics simulations isn't too bouncy/slidey.
      friction: 0.7,
      //mass: scale * 0.1,
      restitution: 0.1,
      //slop: 0.05,
    }
  );
  //Allow for Bodies.fromVertices changing the centre.
  // https://brm.io/matter-js/docs/classes/Bodies.html#method_fromVertices
  const offset = {
    x: body.position.x - body.bounds.min.x,
    y: body.bounds.max.y - body.position.y
  };
  return [ body, offset ];
};


////////////////////////////////////////////////////////////////////////
// Ks.
////////////////////////////////////////////////////////////////////////

const kBounds = (k) => {
  const bounds = k.glyph.getBoundingBox();
  return [
    (bounds.x2 - bounds.x1) * k.glyphUnitScale,
    (bounds.y2 - bounds.y1) * k.glyphUnitScale
  ];
};

const createKs = (styles) => {
  const createdKs = [];
  // Decide how far the Ks should vary from the horizontal centre.
  let xVariance = config.varianceMin + (rnd.random_dec() * config.variance);
  let xVarianceOrigin = (config.width / 2) - (xVariance / 2);
  for (let i = 0; i < config.numKs; i++) {
    const style = styles[i];
    const font = fonts[style.fontName];
    const fontSize = (config.fontSizeBase * style.scale);
    const glyph = font.charToGlyph(
      style.case == "uppercase" ? "K" : "k",
      0,
      0,
      fontSize
    );
    // The formula for scaling from truetype units (e.g 0..2048) to
    // font size units (e.g. 0..72).
    const glyphUnitScale = 1 / font.unitsPerEm * fontSize;
    // Characters may have left padding. We need to remove this to
    // ensure that the outline origin is 0, 0 .
    // Characters are drawn aligned to their baseline and we are not
    // using characters with descenders, so we don't have to modify
    // the bottom alignment.
    const leftOffset = glyph.getBoundingBox().x1 * glyphUnitScale;
    const [ body, offset ] = createBody(
      glyph,
      xVarianceOrigin + (rnd.random_dec() * xVariance),
      //// Make sure forms don't intersect when we start the physics simulation.
      - (config.fontSizeBase + (i * (config.fontSizeBase * 2.1))),
      glyphUnitScale,
      style
    );
    Composite.add(engine.world, [body]);
    const k = {
      body: body,
      font: font,
      size: fontSize,
      glyph: glyph,
      style: style,
      leftOffset: leftOffset,
      glyphUnitScale: glyphUnitScale,
      // The offsets to draw the glyph outlines correctly after all
      // other transformations have been applied.
      // See the comments in this function and in createBody(), above.
      offset: { x: - (offset.x + leftOffset), y: offset.y }
    };
    createdKs.push(k);
  }
  return createdKs;
};


////////////////////////////////////////////////////////////////////////
// Shared rendering code.
////////////////////////////////////////////////////////////////////////

const gradientCoordsForDirection = (x1, y1, x2, y2, direction) => {
  switch (direction) {
  case "n":
    return { x1: x1, y1: y1, x2: x1, y2: y2 };
    break;
  case "ne":
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
    break;
  case "e":
    return { x1: x1, y1: y1, x2: x2, y2: y1 };
    break;
  case "se":
    return { x1: x1, y1: y2, x2: x2, y2: y1 };
    break;
  case "s":
    return { x1: x1, y1: y2, x2: x1, y2: y1 };
    break;
  case "sw":
    return { x1: x2, y1: y2, x2: x1, y2: y1 };
    break;
  case "w":
    return { x1: x2, y1: y1, x2: x1, y2: y1 };
    break;
  case "nw":
  default:
    return { x1: x2, y1: y2, x2: x1, y2: y2 };
    break;
  }
};

const directionToAngle = (direction) => {
  switch (direction) {
    case "n":
    return 0;
    break;
  case "ne":
    return 45;
    break;
  case "e":
    return 90;
    break;
  case "se":
    return 135;
    break;
  case "s":
    return 180;
    break;
  case "sw":
    return 225;
    break;
  case "w":
    return 270;
    break;
  case "nw":
  default:
    return 315;
    break;
  }
};

const textureCellSize = (width) => width / 16;

const textureElementSize = (width) => width / 25;


////////////////////////////////////////////////////////////////////////
// Main API.
////////////////////////////////////////////////////////////////////////

const engineTick = () => {
  Engine.update(engine, 16);
};

const runSimulationToEnd = () => {
  for (let i = 0; i < config.numTicks; i++) {
    engineTick();
  }
};

const initDrop = async (id, _config) => {
  config = _config;
  rnd = new Random(await createHash(id));
  const [ backgroundColour, styles ] = genStyles(rnd, config);
  createEngine();
  Composite.add(engine.world, createBounds());
  ks = createKs(styles);
  return [ ks, backgroundColour ];
};

module.exports = {
  textureCellSize, textureElementSize, gradientCoordsForDirection,
  initFonts, initDrop, engineTick, kBounds, runSimulationToEnd,
  directionToAngle, fonts
};
