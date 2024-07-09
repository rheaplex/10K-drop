////////////////////////////////////////////////////////////////////////
// Imports.
////////////////////////////////////////////////////////////////////////

const { DOMImplementation, DOMParser, XMLSerializer } = require('xmldom');

const {
  WIDTH, HEIGHT, FONT_SIZE_BASE, NUM_TICKS,
  textureCellSize, textureElementSize, gradientCoordsForDirection,
  engineTick, kBounds
} = require("./drop");


////////////////////////////////////////////////////////////////////////
// Constants.
////////////////////////////////////////////////////////////////////////

const RAD2DEG = 180 / Math.PI;


////////////////////////////////////////////////////////////////////////
// State
////////////////////////////////////////////////////////////////////////

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
  ctx.appendChild(rect);;
};

const createCircle = (document, ctx, x, y, radius, fill) => {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  rect.setAttribute("cx", x);
  rect.setAttribute("cy", y);
  rect.setAttribute("r", radius);
  rect.setAttribute("fill", fill);
  ctx.appendChild(rect);;
};

const createSVGPattern = (document, defs, kind, fg, bg, width, size) => {
  const patternId = fillId++;
  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute("width", width);
  pattern.setAttribute("height", width);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("id", `${patternId}`);
  createRect(document, pattern, 0, 0, width, width, bg);
  switch(kind) {
  case "spot":
    createCircle(document, pattern, size / 2, (width - size / 2), size / 2, fg);
    break;
  case "box":
    createRect(document, pattern, 0, width / 2, width / 2, width / 2, fg);
    break;
  case "check":
    createRect(document, pattern, 0, width/2, width / 2, width / 2, fg);
    createRect(document, pattern, width / 2, 0, width / 2, width / 2, fg);
    break;
  case "stripe":
    createRect(document, pattern, 0, width / 2, width, width / 2, fg);
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
      textureElementSize(width),
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
  const [ bg, bgstr ] = createSVGFill(document, defs, ctx, 0, 0, WIDTH, HEIGHT, backgroundColour);
  if(backgroundColour.paint == "pattern") {
    // Align pattern to bottom left.
    bg.setAttribute("patternTransform", `translate(0, ${HEIGHT})`);
  }
  createRect(document, ctx, 0, 0, WIDTH, HEIGHT, bgstr);
};

const renderSvgKs = (document, defs, ctx, ks) => {
  const parser = new DOMParser();
  let i = 0;
  for (const k of ks) {
    const [ w, h ] = kBounds(k);
    const [ fg, fgstr ] = createSVGFill(
                        document,
                        defs,
      ctx,
      (- ((FONT_SIZE_BASE - w) / 2)),
      - FONT_SIZE_BASE / 2,
      FONT_SIZE_BASE,
      FONT_SIZE_BASE,
      k.style.fill
    );
    if(k.style.fill.paint == "pattern") {
    // Align pattern to bottom left.
      fg.setAttribute("patternTransform", `translate(${0}, ${h})`);
    }
    // Top left to 0, 0 to match canvas image drawing.
    const path = k.glyph.getPath(
      - k.leftOffset,
      h,
      k.size,
      {},
      k.font
    ).toSVG({ flipY: false });
    const character = parser.parseFromString(
      path,
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
        + ` translate(${k.offset.x + k.leftOffset}, ${-(h - k.offset.y)})`
    );
    ctx.appendChild(character);
  }
};

const renderSvg = (ks, backgroundColour) => {
  const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute("height", HEIGHT);
  svg.setAttribute("width", WIDTH);
  svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.appendChild(defs);
  renderSvgBackground(document, defs, svg, backgroundColour);
  renderSvgKs(document, defs, svg, ks);
  return svg;
};

const serializeSvg = (svg) => {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
};

module.exports = {
  renderSvg,
  serializeSvg
};
