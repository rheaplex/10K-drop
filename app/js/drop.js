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
// Configuration.
////////////////////////////////////////////////////////////////////////

// The clue is in the project name.
const NUM_KS = 10;

// Canvas size. 16:9 .
const WIDTH  = 3840; //1600;
const HEIGHT = 2160; //900;

// How far from the centre along the x-axis to drop the Ks.
const VARIANCE_MIN = WIDTH / 50;
const VARIANCE_MAX = WIDTH / 5;
const VARIANCE     = VARIANCE_MAX - VARIANCE_MIN;

// The maximum size for the Ks.
// This can't be too big as we want to make sure that they
// all fall into the visible area and don't stack offscreen.
const FONT_SIZE_BASE = HEIGHT / 3;
// How long to run the physics before stopping and saving.
const RENDER_TIME    = 20 * 1000;


////////////////////////////////////////////////////////////////////////
// State.
////////////////////////////////////////////////////////////////////////

let canvas;
let canvasCtx;
let backgroundColour;
let rendering = true;
// Are we saving the results to file(s)?
let saving;
// Are we saving the results to file(s) in a loop?
// If so, how many are we saving?
let generateCount;
// The work id.
let id;
// Our prng.
let random;
// The Matter.js engine. We manage its updates manually.
let engine;
// The video recorder for when we generate.
let recorder;
// The opentype.js font objects representing the fonts we use.
const fonts = {};
// The Ks to drop. Includes styling, physics simulation, and
// other useful information.
const ks = [];


////////////////////////////////////////////////////////////////////////
// Recording and saving the scene in various formats.
////////////////////////////////////////////////////////////////////////

const saveData = (data, fileExtension) => {
  const element = document.createElement('a');
  element.setAttribute( 'href', data);
  element.setAttribute('download', `${id}.${fileExtension}`);
  element.style.display = 'none';

  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

const recordVideo = () => {
  const chunks = [];
  const stream = canvas.captureStream(30);
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = (e) => {
    saveData(
      URL.createObjectURL(
        new Blob(
          chunks,
          { type: "video/webm;codecs=h264" }
        )),
      "webm"
    );
  };
  recorder.start();
};

const saveAsPng = () => {
  const element = document.createElement('a');
  element.setAttribute( 'href', canvas.toDataURL());
  element.setAttribute('download', `${id}.png`);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

const saveAsSvg = () => {
  const ctx = new svgcanvas.Context(WIDTH, HEIGHT);
  render(ctx);
const svg = encodeURIComponent(ctx.getSerializedSvg());
  saveData(
    `data:image/svg+xml;charset=utf-8,${svg}`,
    "svg"
  );
};


////////////////////////////////////////////////////////////////////////
// Main rendering loop
////////////////////////////////////////////////////////////////////////

const render = (ctx) => {
  ctx.fillStyle = backgroundColour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      ctx.strokeStyle = part.render.strokeStyle;
      ctx.fillStyle = 'green';//part.render.fillStyle;
      ctx.lineWidth = part.render.lineWidth;

      ctx.fill();
      //ctx.stroke();
    }*/

    ctx.save();
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

    // Render the centre of the physics simulation body for debugging.
    /*ctx.fillStyle = "#ff00ff";
    ctx.fillRect(k.body.position.x, k.body.position.y, 10, 10);*/
  }
};

const loop = () => {
  if (rendering) {
    Engine.update(engine, 16);
    render(canvasCtx);
    window.requestAnimationFrame(loop);
  }
};


////////////////////////////////////////////////////////////////////////
// Load configuration and resources, create objects.
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
      await fetchFont(FONTS[fontName])
    ));
  for (let i = 0; i < fontNames.length; i++) {
    fonts[fontNames[i]] = result[i];
  }
};

const processSearchParams = () => {
  const searchParams = new URLSearchParams(window.location.search);
  id = parseInt(searchParams.get("id"), 10) || 1;
  saving = searchParams.get("save") || false;
  generateCount = parseInt(searchParams.get("editionSize"), 10) || 0;
};

const createCanvas = () => {
  canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  document.body.appendChild(canvas);
  canvasCtx = canvas.getContext('2d');
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
// The physics simulation
////////////////////////////////////////////////////////////////////////

const createEngine = () => {
  // Support concave body decomposition.
  Common.setDecomp(decomp);
  engine = Engine.create({
    //constraintIterations: 4,
    //positionIterations: 12,
  });
};

// Generate the edges of the canvas for the physics sim.
const createBounds = () => [
  // Base
  Bodies.rectangle(WIDTH / 2, HEIGHT + 500, WIDTH, 1000, {
    isStatic: true,
    staticFriction: 20,
    render: {
      visible: false
    }
  }),
  // Left
  Bodies.rectangle(-1, 0, 1, 9999, {
    isStatic: true,
    staticFriction: 20,
    render: {
      visible: false
    }
  }),
  // Right
  Bodies.rectangle(WIDTH + 1, 0, 1, 9999, {
    isStatic: true,
    staticFriction: 20,
    render: {
      visible: false
    }
  }),
];

const createBody = (glyph, x, y, scale, look) => {
  const render = {
    fillStyle: look.fillColour
  };
  if (look.strokeColour) {
    render.strokeStyle = look.strokeColour;
    render.lineWidth = look.strokeWidth;
  }
  // We call pathToVertices each time as the results are consumed
  // by the next Vertices function calls..
  const vertices = Vertices.fromPath(glyph.toSVG());
  // Scale from truetype glyph space to font pixel size.
  Vertices.scale(vertices, scale, scale);
  //Vertices.clockwiseSort(vertices);
  const body = Bodies.fromVertices(
    x,
    y,
    vertices,
    {
      render: render,
      // Make sure the physics simulations isn't too bouncy/slidey.
      //friction: 0.7,
      frictionStatic: 10,
      //restitution: 0.2,
      //slop: 0.2
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
// Create the scene.
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
    // FIXME: handle stroke width? Sometimes, based on style?
    const [ body, offset ] = createBody(
      glyph,
      xVarianceOrigin + (random.random_dec() * xVariance),
      //// Make sure forms don't intersect when we start the physics simulation.
      - (FONT_SIZE_BASE + (i * (FONT_SIZE_BASE * 1.2))),
      glyphUnitScale,
      style
    );
    Composite.add(engine.world, [body]);
    const options = {
      fill: style.fillColour
    };
    if (style.strokeColour) {
      options.stroke = styles.strokeColour;
      options.strokeWidth = style.strokeWidth;
    }
    const k = {
      body: body,
      font: font,
      size: fontSize,
      glyph: glyph,
      style: style,
      options: options,
      // The offsets to draw the glyph outlines correctly after all
      // other transformations have been applied.
      // See the comments in this function and in createBody(), above.
      offset: { x: - (offset.x + leftOffset), y: offset.y }
    };
    ks.push(k);
  }
};

const createScene = () => {
  let styles;
  [backgroundColour, styles] = genStyles(random, NUM_KS);
  createKs(styles);
};


////////////////////////////////////////////////////////////////////////
// Main flow of execution
////////////////////////////////////////////////////////////////////////

// When we are generating each work by reloading the page with an
// increased ID in a loop, this is the function that reloads the page
// with its new state.

const reloadForNextId = () => {
  const queryData = new URLSearchParams(window.location.search.slice(1));
  queryData.set("id", id + 1);
  queryData.set("save", true);
  queryData.set("editionSize", generateCount);
  const newUrl = new URL(window.location.href);
  newUrl.search = queryData;
  window.location.href = newUrl;
};

// Stop the physics simulation after it should have settled,
// then save if required and load the next id if saving in a loop.

// The outer function curlies are just for indentation formatting.

const setRenderFinishTimeout = () => {
  setTimeout(() => {
    rendering = false;
    if (saving) {
      recorder.stop();
      saveAsPng();
      saveAsSvg();
    }
    if (generateCount && id < generateCount) {
      reloadForNextId();
    }
  }, RENDER_TIME);
};

// Our main entry point.

(async () => {
  await fetchFonts();
  processSearchParams();
  await createPrng();
  createCanvas();
  createEngine();
  createScene();
  Composite.add(engine.world, createBounds());
  if (saving) {
    recordVideo();
  }
  setRenderFinishTimeout();
  // Go!
  window.requestAnimationFrame(loop);
})();
