/* global decomp FONTS genStyles Matter opentype Random svgcanvas TextEncoder
   URLSearchParams XMLSerializer */

////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////

// module aliases
let Engine    = Matter.Engine,
    Common    = Matter.Common,
    Bodies    = Matter.Bodies,
    Body      = Matter.Body,
    Composite = Matter.Composite,
    Vertices  = Matter.Vertices;


////////////////////////////////////////////////////////////////////////
// Constants.
////////////////////////////////////////////////////////////////////////

const RAD2DEG = 180 / Math.PI;


////////////////////////////////////////////////////////////////////////
// Configuration constants.
////////////////////////////////////////////////////////////////////////

// The clue is in the project name.
const NUM_KS = 10;

// Canvas size. 16:9 .
const WIDTH  = 3840; //1600;
const HEIGHT = 2160; //900;

// How far from the centre along the x-axis to drop the Ks.
const VARIANCE_MIN = WIDTH / 6;
const VARIANCE_MAX = WIDTH / 3;
const VARIANCE     = VARIANCE_MAX - VARIANCE_MIN;

// The maximum size for the Ks.
// This can't be too big as we want to make sure that they
// all fall into the visible area and don't stack offscreen.
const FONT_SIZE_BASE      = HEIGHT / 3;
// How long to run the physics before stopping and saving.
const RENDER_TIME_SECONDS = 45;
const RENDER_TIME_MILLIS  = RENDER_TIME_SECONDS * 1000;


////////////////////////////////////////////////////////////////////////
// State.
////////////////////////////////////////////////////////////////////////

let background;

// The work id.
let id;
let createPreview;
let rendering;

// Our prng.
let random;
// The Matter.js engine. We manage its updates manually.
let engine;

// The opentype.js font objects representing the fonts we use.
const fonts = {};
// The Ks to drop. Includes styling, physics simulation, and
// other useful information.
const ks = [];


////////////////////////////////////////////////////////////////////////
// Load resources, create objects.
////////////////////////////////////////////////////////////////////////

const fetchFont = async (url) => {
  const response = await fetch(url);
  return opentype.parse(await response.arrayBuffer());
};

// Fetch the fonts we use, in parallel.

const fetchFonts = async () => {
  const fontNames = Object.keys(FONTS);
  let result = await Promise.all(
    fontNames.map(async fontName =>
      fetchFont(`./fonts/${FONTS[fontName]}`)
    ));
  for (let i = 0; i < fontNames.length; i++) {
    fonts[fontNames[i]] = result[i];
  }
};

// This is utility code but it's only used here so it goes here.

const sha256Hash = async plaintext =>
      "0x" + Array.from(
        new Uint8Array(
          await window.crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(plaintext)
          ))).map((item) => item.toString(16).padStart(2, "0"))
      .join("");

const createPrng = async () => {
  const hash = await sha256Hash(id);
  random = new Random(hash);
};


////////////////////////////////////////////////////////////////////////
// Render to SVG.
////////////////////////////////////////////////////////////////////////

// Transform the k gradients so they match the transformed paths,
// matching the canvas gradient appearance in svg.
// This function uses internal knowledge of svgcanvas.
const transformDefs = (ctx) => {
  const defs = ctx.__defs;
  // If we have k gradients, rather than no gradients or
  // just the bacground gradient.
  if (defs.children.length > 1) {
    for (const def of defs.children) {
      // Don't assume order, and avoid the background.
      const k = ks.find(b => b.options.fill.__root.id == def.id);
      if (k) {
        const kind = def.nodeName;
        const body = k.body;
        const x = body.position.x;
        const y = body.position.y;
        const angle = body.angle * RAD2DEG;
        def.setAttribute(
          `${kind}Transform`,
          `translate(${x}, ${y}) rotate(${angle})`);
        }
    }
  }
};

const renderSvg = (backgroundColour) => {
  const ctx = new svgcanvas.Context({ width: WIDTH, height: HEIGHT });
  ctx.fillStyle = createFill(ctx, WIDTH, HEIGHT, backgroundColour);
  ctx.beginPath();
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const k of ks) {
    ctx.save();
    const bounds = k.glyph.getBoundingBox();
    k.options  = {
      fill: createFill(
        ctx,
        (bounds.x2 - bounds.x1),
        (bounds.y2 - bounds.y1),
        k.style.fill
      )
    };
    ctx.translate(
      k.body.position.x,
      k.body.position.y
    );
    ctx.rotate(k.body.angle);
    k.glyph.draw(
      ctx,
      k.offset.x,
      k.offset.y,
      k.size,
      k.options,
      k.font
    );
    ctx.restore();
  }
  transformDefs(ctx);
  const svg = encodeURIComponent(ctx.getSerializedSvg());
  return `data:image/svg+xml;charset=utf-8,${svg}`;
};


////////////////////////////////////////////////////////////////////////
// Render to canvas.
// Render to offsceen canvas images for speed of painting them later.
////////////////////////////////////////////////////////////////////////

const createOffscreenBackground = (backgroundColour) => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const fill = createFill(ctx, WIDTH, HEIGHT, backgroundColour);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  background = canvas;
};

const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.id = "c";
  document.body.appendChild(canvas);
};

const createOffscreenK = (k) => {
  const canvas = document.createElement('canvas');
  const bounds = k.glyph.getBoundingBox();
  canvas.width = (bounds.x2 - bounds.x1) * k.glyphUnitScale;
  canvas.height = (bounds.y2 - bounds.y1) * k.glyphUnitScale;
  const ctx = canvas.getContext('2d');
  const options = {
    fill: createFill(
      ctx,
      FONT_SIZE_BASE,
      FONT_SIZE_BASE,
      k.style.fill
    )
  };
  /*if (style.strokeColour) {
    options.stroke = style.strokeColour;
    options.strokeWidth = style.strokeWidth;
  }*/
  k.glyph.draw(
    ctx,
    - k.leftOffset,
    canvas.height + bounds.y1,
    k.size,
    options,
    k.font
  );
/*  ctx.beginPath();
  ctx.fill = 'none';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);*/
  k.image = canvas;
};

const renderCanvas = () => {
  const ctx = document.getElementById("c").getContext("2d");
  ctx.drawImage(background, 0, 0);
  for (const k of ks) {
    if (! k.body.render.visible) {
      continue;
    }
    // Draw glyph for debugging
    /*ctx.save();
    ctx.translate(
      k.body.position.x,
      k.body.position.y
    );
    ctx.rotate(k.body.angle);
    k.glyph.draw(
      ctx,
      k.offset.x,
      k.offset.y,
      k.size,
      k.options,
      k.font
    );
    ctx.restore();
    // Render the parts of the physics simulation body for debugging.
    for (const part of k.body.parts.slice(1)) {
      if (!part.render.visible) {
        continue;
      }
      ctx.beginPath();
      const vertices = part.vertices;
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let j = 1; j < vertices.length; j += 1) {
        ctx.lineTo(part.vertices[j].x, part.vertices[j].y);
      }
      ctx.lineTo(vertices[0].x, vertices[0].y);
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'none';
      ctx.lineWidth = 5;
      ctx.stroke();
    }*/
    ctx.save();
    ctx.translate(
      k.body.position.x,
      k.body.position.y
    );
    ctx.rotate(k.body.angle);
    ctx.drawImage(
      k.image,
     k.offset.x  + k.leftOffset,
      -(k.image.height - k.offset.y)
    );
    ctx.restore();
  }
};

const renderCanvasLoop = () => {
  if (rendering) {
    Engine.update(engine, 16);
    renderCanvas();
    window.requestAnimationFrame(renderLoop);
  }
};


////////////////////////////////////////////////////////////////////////
// Render to PNG.
////////////////////////////////////////////////////////////////////////

const toPng = () => {
  // blah
  return document.getElementById("c").toDataURL();
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
  Bodies.rectangle(WIDTH / 2, HEIGHT + 500, WIDTH, 1000, {
    isStatic: true,
    staticFriction: 200,
    render: { visible: false }
  }),
  // Left
  Bodies.rectangle(-1, 0, 1, 9999, {
    isStatic: true,
    render: { visible: false }
  }),
  // Right
  Bodies.rectangle(WIDTH + 1, 0, 1, 9999, {
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
      density: scale * 10,
      //frictionStatic: 10,
      //restitution: 0.2,
      //slop: 0.0005,
    },
    true
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
// Fills.
////////////////////////////////////////////////////////////////////////

const createPattern = (ctx, kind, fg, bg, width, size) => {
  let canvas;
  let cctx;
  if (! ctx.__root) {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = width;
    cctx = canvas.getContext('2d');
  } else {
    cctx = new svgcanvas.Context({ width: width, height: width });
  }
  cctx.fillStyle = bg;
  cctx.beginPath();
  cctx.fillRect(0, 0, width, width);
  cctx.fillStyle = fg;
  cctx.beginPath();
  switch(kind) {
  case "spot":
    cctx.arc(width / 2, width / 2, size / 2, 0, 2 * Math.PI);
    cctx.fill();
    break;
  case "box":
    cctx.fillRect(0, 0, width / 2, width / 2);
    break;
  case "check":
    cctx.fillRect(0, 0, width / 2, width / 2);
    cctx.fillRect(width / 2, width / 2, width / 2, width / 2);
    break;
  case "stripe":
    cctx.fillRect(0, 0, width, width / 2);
    break;
  };
  if (canvas) {
    return ctx.createPattern(canvas, "repeat");
  } else {
    return ctx.createPattern(cctx, "repeat");
  }
};

const gradientCoordsForDirection = (width, height, direction) => {
  switch (direction) {
  case "n":
    return { x1: 0, y1: 0, x2: 0, y2: height};
    break;
  case "ne":
    return{ x1: 0, y1: 0, x2: width, y2: height};
    break;
  case "e":
    return{ x1: 0, y1: 0, x2: width, y2: 0};
    break;
  case "se":
    return{ x1: 0, y1: height, x2: width, y2: 0};
    break;
  case "s":
    return{ x1: 0, y1: height, x2: 0, y2: 0};
    break;
  case "sw":
    return{ x1: width, y1: height, x2: 0, y2: 0};
    break;
  case "w":
    return{ x1: width, y1: 0, x2: 0, y2: 0};
    break;
  case "nw":
  default:
    return{ x1: width, y1: height, x2: 0, y2: height};
    break;
  }
};

const createFill = (ctx, width, height, style) => {
  let fill;
  switch (style.paint) {
  case "two stripes":
    const coords1 = gradientCoordsForDirection(width, height, style.direction);
    const gradient1 = ctx.createLinearGradient(
      coords1.x1,
      coords1.y1,
      coords1.x2,
      coords1.y2
    );
    gradient1.addColorStop(0, style.with[0]);
    gradient1.addColorStop(0.5, style.with[0]);
    gradient1.addColorStop(0.5000001, style.with[1]);
    gradient1.addColorStop(1, style.with[1]);
    fill = gradient1;
    break;
  case "gradient":
    const coords2 = gradientCoordsForDirection(width, height, style.direction);
    const gradient2 = ctx.createLinearGradient(
      coords2.x1,
      coords2.y1,
      coords2.x2,
      coords2.y2
    );
    gradient2.addColorStop(0, style.with[0]);
    gradient2.addColorStop(1, style.with[1]);
    fill = gradient2;
    break;
  case "pattern":
    //const coords3 = gradientCoordsForDirection(width, height, style.direction);
    fill = createPattern(
      ctx,
      style.kind,
      style.with[0],
      style.with[1],
      width / 20,
      width / 30
    );
    break;
  case "flat":
  default:
    fill = style.with[0];
    break;
  }
  return fill;
};


////////////////////////////////////////////////////////////////////////
// Ks.
////////////////////////////////////////////////////////////////////////

const createKs = (styles) => {
  // Decide how far the Ks should vary from the horizontal centre.
  let xVariance = VARIANCE_MIN + (random.random_dec() * VARIANCE);
  let xVarianceOrigin = (WIDTH / 2) - (xVariance / 2);
  for (let i = 0; i < NUM_KS; i++) {
    const style = styles[i];
    const font = fonts[style.fontName];
    const fontSize = (FONT_SIZE_BASE * style.scale);
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
      xVarianceOrigin + (random.random_dec() * xVariance),
      //// Make sure forms don't intersect when we start the physics simulation.
      - (FONT_SIZE_BASE + (i * (FONT_SIZE_BASE * 2.1))),
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
    ks.push(k);
  }
};


////////////////////////////////////////////////////////////////////////
// Main flow of execution
////////////////////////////////////////////////////////////////////////

const processParameters = () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("payload");
  const p = JSON.parse(q ? atob(q) : "{}");
  //hash = p.hash || (Math.random() + 1).toString(16).substring(2);
  id = p.editionNumber || params.get("id") || 0;
  createPreview = params.get("machine") || false;
};

// Stop the physics simulation after it should have settled,
// then save if required and load the next id if saving in a loop.

const renderLoop = (backgroundColour) => {
  rendering = true;
  window.requestAnimationFrame(renderCanvasLoop);
  setTimeout(() => {
    rendering = false;
    if (createPreview) {
      capturePreview(backgroundColour);
    }
  }, RENDER_TIME_MILLIS);
};

const capturePreview = (backgroundColour) => {
  window.$artifact = {
    preview: renderSvg(backgroundColour) //toPng();
  };
  console.info("###verse-preview-capture");
};

const renderPreview = (backgroundColour) => {
  for (let i = 0; i < 60 * RENDER_TIME_SECONDS; i++) {
    Engine.update(engine, 16);
  }
  capturePreview(backgroundColour);
  const img = document.createElement("img");
  img.setAttribute("width", "100%");
  img.setAttribute("height", "auto");
  img.src = window.$artifact.preview;
  document.body.appendChild(img);
};

// Our main entry point.

const main = async () => {
  await fetchFonts();
  processParameters();
  await createPrng();
  const [ backgroundColour, styles ] = genStyles(random, NUM_KS);
  createEngine();
  Composite.add(engine.world, createBounds());
  createKs(styles);
  if (! createPreview) {
    createCanvas(backgroundColour);
    createOffscreenBackground(backgroundColour);
    for (const k of ks) {
      createOffscreenK(k);
    }
    renderLoop(backgroundColour);
  } else {
    renderPreview(backgroundColour);
  }
};
