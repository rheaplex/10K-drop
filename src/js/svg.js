////////////////////////////////////////////////////////////////////////
// Imports.
////////////////////////////////////////////////////////////////////////

const { DOMImplementation, DOMParser, XMLSerializer } = require('xmldom');

const {
  textureCellSize, textureElementSize, gradientCoordsForDirection,
  directionToAngle, engineTick, kBounds
} = require("./drop");


////////////////////////////////////////////////////////////////////////
// Constants.
////////////////////////////////////////////////////////////////////////

const RAD2DEG = 180 / Math.PI;


////////////////////////////////////////////////////////////////////////
// State
////////////////////////////////////////////////////////////////////////

let config;

let fillId = 1;


////////////////////////////////////////////////////////////////////////
// Render to SVG.
////////////////////////////////////////////////////////////////////////

const createRect = (document, ctx, x, y, width, height, fill) => {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("fill", fill);
  ctx.appendChild(rect);
  return rect;
};

const createCircle = (document, ctx, x, y, radius, fill) => {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute("cx", x);
  circle.setAttribute("cy", y);
  circle.setAttribute("r", radius);
  circle.setAttribute("fill", fill);
  ctx.appendChild(circle);
  return circle;
};

const createSVGPattern = (document, defs, kind, fg, bg, width, size) => {
  const patternId = fillId++;
  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute("width", width);
  pattern.setAttribute("height", width);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("id", `${patternId}`);
  createRect(document, pattern, 0, 0, width, width, bg);
  const centre = width / 2;
  const edge = (width - size) / 2;
  switch(kind) {
  case "spot":
    createCircle(document, pattern, centre, centre, size / 2, fg);
    break;
  case "box":
    createRect(document, pattern, edge, edge, size, size, fg);
    break;
  case "check":
    // We fill the cell, by definition.
    createRect(document, pattern, 0, width/2, width / 2, width / 2, fg);
    createRect(document, pattern, width / 2, 0, width / 2, width / 2, fg);
    break;
  case "stripe":
    createRect(document, pattern, 0, edge, width, size, fg);
    break;
  };
  defs.appendChild(pattern);
  return [ pattern, `url(#${patternId})` ];
};

const createSVGGradient = (document, defs, coords, stops) => {
  const gradientId = fillId++;
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute("x1", coords.x1);
  gradient.setAttribute("y1", coords.y1);
  gradient.setAttribute("x2", coords.x2);
  gradient.setAttribute("y2", coords.y2);
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("id", `${gradientId}`);
  for (const spec of stops) {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop.setAttribute("offset", spec[0]);
    stop.setAttribute("stop-color", spec[1]);
    gradient.appendChild(stop);
  }
  defs.appendChild(gradient);
  return [ gradient, `url(#${gradientId})` ];
};

const createSVGFill = (document, defs, ctx, x, y, width, height, style) => {
  const c = gradientCoordsForDirection(
    x,
    y,
    x + width,
    y + height,
    style.direction
  );
  let fill;
  let reference;
  switch (style.paint) {
  case "two stripes":
    [ fill, reference ] = createSVGGradient(
      document,
      defs,
      c,
      [ ["0%", style.with[0]],
        ["50%", style.with[0]],
        ["50,00001%", style.with[1]],
        ["100%", style.with[1]]
      ]
    );
    break;
  case "gradient":
    [ fill, reference ] = createSVGGradient(
      document,
      defs,
      c,
      [ ["30%", style.with[0]],
        ["70%", style.with[1]]
      ]
    );
    break;
  case "pattern":
    [ fill, reference ] = createSVGPattern(
      document,
      defs,
      style.kind,
      style.with[1],
      style.with[0],
      textureCellSize(width),
      textureElementSize(width)
    );
    break;
  case "flat":
  default:
    reference = fill = style.with[0];
    break;
  }
  return [ fill, reference ];
};

const renderSvgBackground = (document, defs, ctx, backgroundColour) => {
  const [ bg, bgstr ] = createSVGFill(
    document,
    defs,
    ctx,
    0,
    0,
    config.width,
    config.height,
    backgroundColour
  );
  if(backgroundColour.paint == "pattern") {
    // Align pattern to bottom left.
    bg.setAttribute(
      "patternTransform",
      `translate(0, ${config.height})`
        + ` rotate(${directionToAngle(backgroundColour.direction)})`
    );
  }
  createRect(document, ctx, 0, 0, config.width, config.height, bgstr);
};

const toSvgPath = (k) => {
  const scale = k.vertexScale;
  const path = [ `<path d="` ];
  k.char.instructions.forEach(i => {
    switch (i.type) {
    case "M":
      path.push(`M${i.x * scale} ${i.y * scale}`);
      break;
    case "L":
      path.push(`L${i.x * scale} ${i.y * scale}`);
      break;
    case "Q":
      path.push(
        `Q ${i.x1 * scale} ${i.y1 * scale} ${i.x * scale} ${i.y * scale}`
      );
      break;
    case "Z":
      path.push("Z");
      break;
    }
  });
  path.push(`" />`);
  return path.join('');
};

const renderSvgKs = (document, defs, ctx, ks) => {
  const parser = new DOMParser();
  let i = 0;
  for (const k of ks) {
    const w = k.char.dimensions.w * k.vertexScale;
    const h = k.char.dimensions.h * k.vertexScale;
    const [ fg, fgstr ] = createSVGFill(
      document,
      defs,
      ctx,
      - (config.fontSizeBase - w) / 2 - k.leftOffset,
      - (config.fontSizeBase - h) / 2,
      config.fontSizeBase,
      config.fontSizeBase,
      k.style.fill
    );
    if(k.style.fill.paint == "pattern") {
    // Align pattern to bottom left.
      fg.setAttribute(
        "patternTransform",
        `translate(${0}, ${h})`
          + `rotate(${directionToAngle(k.style.fill.direction)})`
      );
    }
    const character = parser.parseFromString(
      toSvgPath(k),
      "image/svg+xml"
    ).firstChild;
    /*
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
    */
    character.setAttribute("fill", fgstr);
    character.setAttribute(
      "transform",
      `translate(${k.body.position.x}, ${k.body.position.y})`
        + ` rotate(${k.body.angle * RAD2DEG})`
        + ` translate(${- ((w / 2) -k.offset.x)}, ${-((h / 2) - k.offset.y)})`
    );
    ctx.appendChild(character);
  }
};

const renderSvg = (ks, backgroundColour) => {
  const document = new DOMImplementation().createDocument(
    'http://www.w3.org/1999/xhtml',
    'html',
    null
  );
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute("height", config.height);
  svg.setAttribute("width", config.width);
  svg.setAttribute("viewBox", `0 0 ${config.width} ${config.height}`);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.appendChild(defs);
  renderSvgBackground(document, defs, svg, backgroundColour);
  renderSvgKs(document, defs, svg, ks);
  return svg;
};

const serializeSvg = (svg) => {
  const serializer = new XMLSerializer();
  return `<?xml version="1.0" encoding="utf-8"?>\n` + serializer.serializeToString(svg);
};

const initSvg = (_config) => {
  config = _config;
};

module.exports = {
  initSvg,
  renderSvg,
  serializeSvg
};
