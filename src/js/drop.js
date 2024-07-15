/* global fetchUrl createHash */

////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////

const Matter = require("matter-js");

const Random = require("./random");
const { genStyles } = require("./style");

// module aliases
const Engine    = Matter.Engine,
      Common    = Matter.Common,
      Bodies    = Matter.Bodies,
      Body      = Matter.Body,
      Composite = Matter.Composite,
      Vertices  = Matter.Vertices;

const fonts = require("./fonts");


////////////////////////////////////////////////////////////////////////
// Useful constants.
////////////////////////////////////////////////////////////////////////

const DEG2RAD = Math.PI / 180;


////////////////////////////////////////////////////////////////////////
// State.
////////////////////////////////////////////////////////////////////////

let config;

// Our prng.
let rnd;
// The Matter.js engine. We manage its updates manually.
let engine;

// The Ks to drop. Includes styling, physics simulation, and
// other useful information.
// This is a let as we replace it in test.js.
let ks;

let currentTick;


////////////////////////////////////////////////////////////////////////
// The physics simulation.
////////////////////////////////////////////////////////////////////////

const createEngine = () => {
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

const createBody = (vertexLists, scale) => {
  const body = Body.create({
    // Make sure the physics simulations isn't too bouncy/slidey.
    friction: 0.7,
    //mass: scale * 0.1,
    restitution: 0.1,
    //slop: 0.05,
  });
  Body.setParts(
    body,
    vertexLists.map(spec => {
      const part = Body.create();
      Body.setVertices(part, spec.vertices);
      Body.setPosition(part, spec.position);
      return part;
    })
  );
  Body.scale(body, scale, scale);
  return body;
};


////////////////////////////////////////////////////////////////////////
// Ks.
////////////////////////////////////////////////////////////////////////

const createKs = (styles) => {
  const createdKs = [];
  // Decide how far the Ks should vary from the horizontal centre.
  const xVariance = config.varianceMin + (rnd.random_dec() * config.variance);
  const xVarianceOrigin = (config.width / 2) - (xVariance / 2);
  for (let i = 0; i < config.numKs; i++) {
    const style = styles[i];
    const char = fonts[style.fontName][style.case];
    const fontSize = Math.floor(config.fontSizeBase * style.scale);
    const vertexScale = fontSize * char.glyphUnitScale;
    const body = createBody(
      char.vertexLists,
      vertexScale,
    );
    const offset = {
      x:
      // Geometric centre.
      ((body.bounds.max.x - body.bounds.min.x) / 2)
      // Minus centre of mass to give difference between them.
        - (body.position.x - body.bounds.min.x),
      y: ((body.bounds.max.y - body.bounds.min.y) / 2)
        - (body.position.y - body.bounds.min.y),
    };
    Body.setPosition(
      body,
      {
        x: xVarianceOrigin + (rnd.random_dec() * xVariance),
        //// Make sure forms don't intersect when we start the physics.
        y: - (config.fontSizeBase + (i * (config.fontSizeBase * 2.1)))
      }
    );
    Body.rotate(body, i);
    Body.setAngle(body, style.rotation * DEG2RAD);
    Composite.add(engine.world, [ body ]);
    const xOffset = 0;
    const k = {
      body,
      char,
      style,
      vertexScale,
      offset
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
  currentTick++;
  if (currentTick == Math.floor(config.numTicks * 0.45)) {
    redropOffscreenKs();
  }
};

const runSimulationToEnd = () => {
  for (let i = 0; i < config.numTicks; i++) {
    engineTick();
  }
};

const initDrop = async (id, _config) => {
  config = _config;
  console.assert(
    id <= 255,
    "id must be a uint8 with current hashing code!"
  );
  rnd = new Random(await createHash(id));
  const [ backgroundColour, styles ] = genStyles(rnd, config);
  createEngine();
  Composite.add(engine.world, createBounds());
  ks = createKs(styles);
  currentTick = 0;
  return [ ks, backgroundColour ];
};

const offscreenKs = () => {
  const offscreen = [];
  ks.forEach(k => {
    if (k.body.bounds.max.y < 0) {
      offscreen.push(k);
    }
  });
  return offscreen;
};

// If we have any ks offscreen at this point, move them and drop them again
// in a different position in the hope that they will make their way
// onscreen before the end of the simulation.

const redropOffscreenKs = () => {
  let i = 1;
  offscreenKs().forEach(k => {
    Body.setPosition(
    k.body,
      {
        x: config.width - k.body.position.x,
        y: - config.fontSizeBase * i++
      },
      false
    );
  });
};

module.exports = {
  textureCellSize, textureElementSize, gradientCoordsForDirection,
  initDrop, engineTick, runSimulationToEnd,
  directionToAngle, offscreenKs
};
