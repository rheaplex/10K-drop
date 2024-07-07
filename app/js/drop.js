/* global decomp DOMMatrix DOMPoint FONTS genStyles Matter opentype
   Random Snap TextEncoder URLSearchParams XMLSerializer */

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
const FONT_SIZE_BASE      = HEIGHT / 2;
// How long to run the physics before stopping and/or saving.
const RENDER_TIME_SECONDS = 45;
const NUM_TICKS           = RENDER_TIME_SECONDS * 50;


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
// This is a let as we replace it in test.js.
let ks;

// How many frames we've rendered.
let ticks;


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
    return{ x1: x1, y1: y1, x2: x2, y2: y2 };
    break;
  case "e":
    return{ x1: x1, y1: y1, x2: x2, y2: y1 };
    break;
  case "se":
    return{ x1: x1, y1: y2, x2: x2, y2: y1 };
    break;
  case "s":
    return{ x1: x1, y1: y2, x2: x1, y2: y1 };
    break;
  case "sw":
    return{ x1: x2, y1: y2, x2: x1, y2: y1 };
    break;
  case "w":
    return{ x1: x2, y1: y1, x2: x1, y2: y1 };
    break;
  case "nw":
  default:
    return{ x1: x2, y1: y2, x2: x1, y2: y2 };
    break;
  }
};

const textureCellSize = (width) => width / 20;

const textureElementSize = (width) => width / 30;


////////////////////////////////////////////////////////////////////////
// Render to SVG.
////////////////////////////////////////////////////////////////////////

const createSVGPattern = (ctx, kind, fg, bg, width, size) => {
  const group = ctx.g(ctx.rect(0, 0, width, width).attr({
    fill: bg
  }));
  switch(kind) {
  case "spot":
    group.add(ctx.circle(size / 2, (width - size / 2), size / 2).attr({
      fill: fg
    }));
    break;
  case "box":
    group.add(ctx.rect(0, width / 2, width / 2, width / 2).attr({
      fill: fg
    }));
    break;
  case "check":
    group.add(ctx.rect(0, width/2, width / 2, width / 2).attr({
      fill: fg
    }));
    group.add(ctx.rect(width / 2, 0, width / 2, width / 2).attr({
      fill: fg
    }));
    break;
  case "stripe":
    group.add(ctx.rect(0, width / 2, width, width / 2).attr({
      fill: fg
    }));
    break;
  };
  return group.pattern(0, 0, width, width);
};

const createSVGFill = (ctx, x, y, width, height, style) => {
  const c = gradientCoordsForDirection(
    x,
    y,
    x + width,
    y + height,
    style.direction
    );
  let fill;
  switch (style.paint) {
  case "two stripes":
      fill = ctx.gradient(
        `l(${c.x1}, ${c.y1}, ${c.x2}, ${c.y2})${style.with[0]}-${style.with[0]}:50-${style.with[1]}:50.001-${style.with[1]}`
      ).attr({
        gradientUnits: "userSpaceOnUse",
      });
    break;
  case "gradient":
    fill = ctx.gradient(
      `l(${c.x1}, ${c.y1}, ${c.x2}, ${c.y2})${style.with[0]}:30%-${style.with[1]}:70%`
    ).attr({
      gradientUnits: "userSpaceOnUse",
    });
    break;
  case "pattern":
    fill = createSVGPattern(
      ctx,
      style.kind,
      style.with[1],
      style.with[0],
      textureCellSize(width),
      textureElementSize(width),
    );
    break;
  case "flat":
  default:
    fill = style.with[0];
    break;
  }
  return fill;
};

const renderSvgBackground = (ctx, backgroundColour) => {
  const bg = createSVGFill(ctx, 0, 0, WIDTH, HEIGHT, backgroundColour);
  if(backgroundColour.paint == "pattern") {
    // Align pattern to bottom left.
    bg.attr({
      patternUnits: "userSpaceOnUse",
      patternTransform: `translate(0, ${HEIGHT})`
    });
  }
  ctx.rect(0, 0, WIDTH, HEIGHT).attr({ fill: bg });
};

const renderSvgKs = (ctx) => {
  let i = 0;
  for (const k of ks) {
    const [ w, h ] = kBounds(k);
    const bOffset = h % textureCellSize(FONT_SIZE_BASE);
    const fg = createSVGFill(
      ctx,
      (- ((FONT_SIZE_BASE - w) / 2)),
      - FONT_SIZE_BASE / 2,
      FONT_SIZE_BASE,
      FONT_SIZE_BASE,
      k.style.fill
    );
    if(k.style.fill.paint == "pattern") {
    // Align pattern to bottom left.
      fg.attr({
        patternUnits: "userSpaceOnUse",
        patternTransform: `translate(${0}, ${h})`
      });
    }
    // Top left to 0, 0 to match canvas image drawing.
    const path = k.glyph.getPath(
      - k.leftOffset,
      h,
      k.size,
      {},
      k.font
    ).toPathData({ flipY: false });
    const m = new Snap.Matrix();
    m.translate(
      k.body.position.x,
      k.body.position.y
    );
    m.rotate(k.body.angle * RAD2DEG, 0, 0);
    m.translate(
      k.offset.x + k.leftOffset,
      -(h - k.offset.y)
    );
    const character = ctx.path(path).attr({
      fill: fg,
      transform: m
    });
  }
};

const renderSvg = (backgroundColour) => {
  const ctx = Snap(WIDTH, HEIGHT);
  renderSvgBackground(ctx, backgroundColour);
  renderSvgKs(ctx);
  const svg = ctx.toDataURL();
  return `data:image/svg+xml;charset=utf-8,${svg}`;
};


////////////////////////////////////////////////////////////////////////
// Render to canvas.
// Render to offsceen canvas images for speed of painting them later.
////////////////////////////////////////////////////////////////////////

const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.id = "c";
  document.body.appendChild(canvas);
};

const createCanvasPattern = (ctx, style, fitWithin) => {
  const width = textureCellSize(fitWithin);
  const size = textureElementSize(fitWithin);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const cctx = canvas.getContext('2d');
  cctx.fillStyle = style.with[0];
  cctx.beginPath();
  cctx.fillRect(0, 0, width, width);
  cctx.fillStyle = style.with[1];
  cctx.beginPath();
  switch(style.kind) {
  case "spot":
    cctx.arc(size / 2, (width - size / 2), size / 2, 0, 2 * Math.PI);
    cctx.fill();
    break;
  case "box":
    cctx.fillRect(0, width / 2, width / 2, width / 2);
    break;
  case "check":
    cctx.fillRect(0, width / 2, width / 2, width / 2);
    cctx.beginPath();
    cctx.fillRect(width / 2, 0, width / 2, width / 2);
    break;
  case "stripe":
    cctx.fillRect(0, width / 2, width, width / 2);
    break;
  };
  const fill = ctx.createPattern(canvas, "repeat");
  return fill;
};

const createCanvasGradient = (ctx, x, y, width, height, style) => {
  const c = gradientCoordsForDirection(
    x,
    y,
    width + x,
    height + y,
    style.direction
  );
  let fill;
  switch (style.paint) {
  case "two stripes":
    fill = ctx.createLinearGradient(c.x1, c.y1, c.x2, c.y2);
    fill.addColorStop(0, style.with[0]);
    fill.addColorStop(0.5, style.with[0]);
    fill.addColorStop(0.5000001, style.with[1]);
    fill.addColorStop(1, style.with[1]);
    break;
  case "gradient":
    fill = ctx.createLinearGradient(c.x1, c.y1, c.x2, c.y2);
    fill.addColorStop(0.3, style.with[0]);
    fill.addColorStop(0.7, style.with[1]);
    break;
  };
  return fill;
};

const createCanvasFill = (ctx, x, y, width, height, style) => {
  const c = gradientCoordsForDirection(
    x,
    y,
    x + width,
    y + height,
    style.direction
    );
  let fill;
  switch (style.paint) {
  case "two stripes":
  case "gradient":
    fill = createCanvasGradient(ctx, x, y, width, height, style);
    break;
  case "pattern":
    fill = createCanvasPattern(
      ctx,
      style,
      width
    );
    break;
  case "flat":
  default:
    fill = style.with[0];
    break;
  }
  return fill;
};

const createOffscreenBackground = (backgroundColour) => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const fill = createCanvasFill(
    ctx,
    0,
    0,
    WIDTH,
    HEIGHT,
     backgroundColour
  );
  ctx.fillStyle = fill;
  if (backgroundColour.paint == "pattern") {
    // Align patterns to bottom left.
    // We use width here as cell sizes are square for width.
    // This is applied for gradients as well but has no effect on them.
    ctx.translate(0, HEIGHT);
    ctx.beginPath();
    ctx.fillRect(0, -HEIGHT, WIDTH, HEIGHT);
  } else {
    ctx.beginPath();
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  background = canvas;
};

const createOffscreenK = (k) => {
  const canvas = document.createElement('canvas');
  const [ w, h ] = kBounds(k);
  canvas.width = w;
  canvas.height = h;
  // Line up the fill and the K to the left edge of the canvas.
  // This is so we fit the canvas properly and match the SVG fill position.
  // Note that we only need the cell offset for the pattern,
  // but we handle it (apply it to no effect) for the gradients as well.
  const bOffset = canvas.height % textureCellSize(FONT_SIZE_BASE);
  const ctx = canvas.getContext('2d');
  const options = {
    fill: createCanvasFill(
      ctx,
      - (FONT_SIZE_BASE - canvas.width) / 2 - k.leftOffset,
      - (FONT_SIZE_BASE - canvas.height) / 2 - bOffset,
      FONT_SIZE_BASE,
      FONT_SIZE_BASE,
      k.style.fill
    )
  };
  ctx.save();
 // Show centre of canvas to check gradient alignment.
  /*ctx.strokeStyle = "black";
  ctx.strokeWidth = 1;
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.restore();*/
  ctx.translate(0, bOffset);
  k.glyph.draw(
    ctx,
    -k.leftOffset,
    canvas.height - bOffset,
    k.size,
    options,
    k.font
  );
  ctx.fillRect(w / 2 - 10, (h / 2 - 10) - bOffset, 20, 20);
  /*ctx.beginPath();
  ctx.fill = 'none';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, bOffset, canvas.width, canvas.height);*/
  k.image = canvas;
};

const renderCanvas = () => {
  const ctx = document.getElementById("c").getContext("2d");
  ctx.drawImage(background, 0, 0);
  for (const k of ks) {
    if (! k.body.render.visible) {
      continue;
    }
    // Render the parts of the physics simulation body for debugging.
    /*for (const part of k.body.parts.slice(1)) {
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
      { fill: "orange", strokeWidth: 10 },
      k.font
    );
    ctx.restore();*/
    ctx.save();
    ctx.translate(
      k.body.position.x,
      k.body.position.y
    );
    ctx.rotate(k.body.angle, 0, 0);
    ctx.drawImage(
      k.image,
      k.offset.x + k.leftOffset,
      -(k.image.height - k.offset.y)
    );
    ctx.restore();
  }
};

const renderCanvasLoop = () => {
  if (rendering) {
    Engine.update(engine, 16);
    renderCanvas();
    ticks++;
    if (ticks < NUM_TICKS) {
      window.requestAnimationFrame(renderCanvasLoop);
    } else {
      rendering = false;
      /*if (createPreview) {
        capturePreview(backgroundColour);
      }*/
    }
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

const capturePreview = (backgroundColour) => {
  window.$artifact = {
    preview: renderSvg(backgroundColour) //toPng();
  };
  console.info("###verse-preview-capture");
};

const renderPreview = (backgroundColour) => {
  for (let i = 0; i < NUM_TICKS; i++) {
    Engine.update(engine, 16);
  }
  capturePreview(backgroundColour);
  /*const img = document.createElement("img");
  img.setAttribute("width", "100%");
  img.setAttribute("height", "auto");
  img.src = window.$artifact.preview;
  document.body.appendChild(img);*/
};

const init = async () => {
  ticks = 0;
  await createPrng();
  const [ backgroundColour, styles ] = genStyles(random, NUM_KS);
  createEngine();
  Composite.add(engine.world, createBounds());
  ks = createKs(styles);
  return backgroundColour;
};

// Our main entry point.

const main = async () => {
  await fetchFonts();
  processParameters();
  const backgroundColour = await init();
  if (! createPreview) {
    createCanvas(backgroundColour);
    createOffscreenBackground(backgroundColour);
    for (const k of ks) {
      createOffscreenK(k);
    }
    rendering = true;
    window.requestAnimationFrame(renderCanvasLoop);
  } else {
    renderPreview(backgroundColour);
  }
};
