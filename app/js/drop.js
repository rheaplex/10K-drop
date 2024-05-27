// module aliases
let Engine    = Matter.Engine,
    Common    = Matter.Common,
    Bodies    = Matter.Bodies,
    Body      = Matter.Body,
    Bounds    = Matter.Bounds,
    Composite = Matter.Composite,
    Render    = Matter.Render,
    Svg       = Matter.Svg,
    Vector    = Matter.Vector,
    Vertices  = Matter.Vertices;

// provide concave decomposition support library
Common.setDecomp(decomp);
Common._seed = 4;

let WIDTH = 1600;
let HEIGHT = 900;

let VARIANCE_MIN = WIDTH / 50;
let VARIANCE_MAX = WIDTH / 5;
let VARIANCE = VARIANCE_MAX - VARIANCE_MIN;

let FONT_SIZE_BASE = HEIGHT / 3;

let NUM_KS = 10;

let RENDER_TIME = 1000 * 12;

let bounds = [
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

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = WIDTH;
canvas.height = HEIGHT;
document.body.appendChild(canvas);

let backgroundColour;
let rendering = true;
let id = 1;
let filename;
let hash;
let random;
let engine;
let recorder;

const fonts = {};
const ks = [];

const sha256Hash = async plaintext =>
      "0x" + Array.from(
        new Uint8Array(
          await window.crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(plaintext)
          ))).map((item) => item.toString(16).padStart(2, "0"))
      .join("");


const saveVideo = async (videoBlob) => {
  const element = document.createElement('a');
  element.setAttribute( 'href', URL.createObjectURL(videoBlob));
  element.setAttribute('download', `${filename}.webm`);

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
    saveVideo(
      new Blob(
        chunks,
        { type: "video/webm;codecs=h264" }
      )
    );
  };
  recorder.start();
};

const saveAsPng = () => {
  const element = document.createElement('a');
  element.setAttribute( 'href', canvas.toDataURL());
  element.setAttribute('download', `${filename}.png`);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

const saveSvg = (svgElement) => {
  const file = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
${encodeURIComponent(svgElement.outerHTML)}`;

  const element = document.createElement('a');
  element.setAttribute(
    'href',
    `data:image/svg+xml;charset=utf-8,${file}`);
  element.setAttribute('download', `${filename}.svg`);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

function asSvg () {
  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  );
  svg.setAttribute('width', `${WIDTH}`);
  svg.setAttribute('height', `${HEIGHT}`);
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  const background = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'rect'
  );
  background.setAttribute('width', WIDTH);
  background.setAttribute('height', HEIGHT);
  background.setAttribute('fill', backgroundColour);
  background.setAttribute('stroke', 'none');
  svg.appendChild(background);

  for (const k of ks) {
    if (! k.body.render.visible) {
      continue;
    }
    const path = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    path.setAttribute(
      'd',
      k.glyph
        .getPath(
          k.offset.x,
          k.offset.y,
          k.size,
          k.options,
          k.font)
        .toPathData({
          decimalPlaces: 2,
        }));
    path.setAttribute('fill', k.style.fillColour);
    if (k.style.strokeColour) {
      path.setAttribute('stroke', k.style.strokeColour);
      path.setAttribute('stroke-width', k.style.strokeWidth);
    }
    path.setAttribute('transform-origin', '50% 50%');
    // Convert radians to degrees, and flip the y-axis of the glyph.
    path.setAttribute(
      'transform',
`translate(${k.body.position.x} ${k.body.position.y}) rotate(${k.body.angle * (180 / Math.PI)}) scale(1 -1)`
    );
    svg.appendChild(path);
  }

  return svg;
}

const saveAsSvg = () => {
  const svg = asSvg();
  const fileName = "1.svg";
  saveSvg(svg, fileName);
};

function renderFun() {
  //FIXME: run smoother
  Engine.update(engine, 6);
  ctx.fillStyle = backgroundColour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const k of ks) {
    if (! k.body.render.visible) {
      continue;
    }
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

    /*ctx.fillStyle = "#ff00ff";
    ctx.fillRect(k.body.position.x, k.body.position.y, 10, 10);*/
  }
  if (rendering) {
    window.requestAnimationFrame(renderFun);
  } else {
  }
}

const fetchFont = async (url) => {
  const response = await fetch(url);
  return opentype.parse(await response.arrayBuffer());
};

const fetchFonts = async () => {
  for (const fontName of Object.keys(FONTS)) {
    fonts[fontName] = await fetchFont(FONTS[fontName]);
  }
};

const charGlyph = (font, char, size) => {
  return font.charToGlyph(char, 0, 0, size);
};

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
  Vertices.scale(vertices, scale, scale);
  //Vertices.clockwiseSort(vertices);
  const body = Bodies.fromVertices(
    x,
    y,
    vertices,
    {
      render: render
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


(async () => {
  await fetchFonts();
  const searchParams = new URLSearchParams(window.location.search);
  id = searchParams.get("id") || 99999999;
  filename = `${id}`;
  hash = await sha256Hash(id);
  random = new Random(hash);
  backgroundColour = genBackground(random);
  const styles = genStyles(random, backgroundColour, NUM_KS);
  engine = Engine.create({
    //constraintIterations: 4,
    //positionIterations: 12,
  });
  let xVariance = VARIANCE_MIN + (random.random_dec() * VARIANCE);
  let xVarianceOrigin = (WIDTH / 2) - (xVariance / 2);
  for (let i = 0; i < NUM_KS; i++) {
    const font = fonts["Roboto-normal-900"];
    const fontSize = (FONT_SIZE_BASE * styles[i].scale);
    const glyph = charGlyph(
      font,
      styles[i].case == "uppercase" ? "K" : "k",
      fontSize
    );
    const glyphUnitScale = 1 / font.unitsPerEm * fontSize;
    const leftOffset = glyph.getBoundingBox().x1 * glyphUnitScale;
    // FIXME: handle stroke width?
    const [ body, offset ] = createBody(
      glyph,
      xVarianceOrigin + (random.random_dec() * xVariance),
      //// Make sure forms don't intersect at the start.
      - (FONT_SIZE_BASE + (i * (FONT_SIZE_BASE * 1.2))),
      glyphUnitScale,
      styles[i]
    );
    Composite.add(engine.world, [body]);
    const options = {
      fill: styles[i].fillColour
    };
    if (styles[i].strokeColour) {
      options.stroke = styles[i].strokeColour;
      options.strokeWidth = styles[i].strokeWidth;
    }
    const k = {
      body: body,
      font: font,
      size: fontSize,
      glyph: glyph,
      style: styles[i],
      options: options,
      offset: { x: - (offset.x + leftOffset), y: offset.y }
    };
    ks.push(k);
  }
  Composite.add(engine.world, bounds);

  window.requestAnimationFrame(renderFun);
  recordVideo();
  
  setTimeout(
    () => {
      rendering = false;
      recorder.stop();
      saveAsPng();
      saveAsSvg();
    },
    RENDER_TIME
  );
})();
