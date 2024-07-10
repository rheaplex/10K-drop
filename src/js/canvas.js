////////////////////////////////////////////////////////////////////////
// Imports.
////////////////////////////////////////////////////////////////////////

const {
  textureCellSize, textureElementSize, gradientCoordsForDirection,
  engineTick, kBounds
} = require("./drop");


////////////////////////////////////////////////////////////////////////
// State
////////////////////////////////////////////////////////////////////////

let config;
let rendering;
let ticks;
let background;
let ks;
let canvas;
let ctx;


////////////////////////////////////////////////////////////////////////
// Render to canvas.
// Render to offsceen canvas images for speed of painting them later.
////////////////////////////////////////////////////////////////////////

const createCanvas = (width, height) => {
  let canvas;
  if (typeof window === "undefined") {
    const { createCanvas } = require('canvas');
    canvas = createCanvas(width, height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    //document.body.appendChild(canvas);
  }
  return canvas;
};

const createCanvasPattern = (ctx, style, fitWithin) => {
  const width = textureCellSize(fitWithin);
  const size = textureElementSize(fitWithin);
  const canvas = createCanvas(width, width);
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
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext('2d');
  const fill = createCanvasFill(
    ctx,
    0,
    0,
    config.width,
    config.height,
    backgroundColour
  );
  ctx.fillStyle = fill;
  if (backgroundColour.paint == "pattern") {
    // Align patterns to bottom left.
    // We use width here as cell sizes are square for width.
    // This is applied for gradients as well but has no effect on them.
    ctx.translate(0, config.height);
    ctx.beginPath();
    ctx.fillRect(0, -config.height, config.width, config.height);
  } else {
    ctx.beginPath();
    ctx.fillRect(0, 0, config.width, config.height);
  }
  background = canvas;
};

const createOffscreenK = (k) => {
  const [ w, h ] = kBounds(k);
  const canvas = createCanvas(w, h);
  // Line up the fill and the K to the left edge of the canvas.
  // This is so we fit the canvas properly and match the SVG fill position.
  // Note that we only need the cell offset for the pattern,
  // but we handle it (apply it to no effect) for the gradients as well.
  const bOffset = canvas.height % textureCellSize(config.fontSizeBase);
  const ctx = canvas.getContext('2d');
  const options = {
    fill: createCanvasFill(
      ctx,
      - (config.fontSizeBase - canvas.width) / 2 - k.leftOffset,
      - (config.fontSizeBase - canvas.height) / 2 - bOffset,
      config.fontSizeBase,
      config.fontSizeBase,
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
  //ctx.fillRect(w / 2 - 10, (h / 2 - 10) - bOffset, 20, 20);
  /*ctx.beginPath();
  ctx.fill = 'none';
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, bOffset, canvas.width, canvas.height);*/
  k.image = canvas;
};

const createOffscreenKs = () => {
  for (const k of ks) {
    createOffscreenK(k);
  }
};

const renderCanvas = () => {
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
    engineTick();
    renderCanvas();
    ticks++;
    if (ticks < config.numTicks) {
      window.requestAnimationFrame(renderCanvasLoop);
    } else {
      rendering = false;
    }
  }
};

const initCanvas = (theKs, backgroundStyle, _config) => {
  config = _config;
  rendering = true;
  ticks = 0;
  ks = theKs;
  createOffscreenBackground(backgroundStyle);
  createOffscreenKs();
  canvas = createCanvas(config.width, config.height);
  ctx = canvas.getContext("2d");
  return canvas;
};

module.exports = {
  initCanvas,
  renderCanvas,
  renderCanvasLoop,
};
