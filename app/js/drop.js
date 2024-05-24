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

let WIDTH = 800;
let HEIGHT = 600;

let VARIANCE_MIN = WIDTH / 50;
let VARIANCE_MAX = WIDTH / 5;
let VARIANCE = VARIANCE_MAX - VARIANCE_MIN;

let FONT_SIZE_BASE = 200;

let NUM_KS = 10;

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
const fonts = {};
const ks = [];

// create an engine
const engine = Engine.create({
  //constraintIterations: 4,
  //positionIterations: 12,
});

// MONKEYPATCH OPENTYPEJS

opentype.Glyph.prototype.getPath = function(x, y, fontSize, options, font) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = Object.assign({}, font && font.defaultRenderOptions, options);
    let commands;
    let hPoints;
    let xScale = options.xScale;
    let yScale = options.yScale;
    const scale = 1 / (this.path.unitsPerEm || 1000) * fontSize;

    let useGlyph = this;

    if(font && font.variation) {
        useGlyph = font.variation.getTransform(this, options.variation);
        commands = useGlyph.path.commands;
    }

    if (options.hinting && font && font.hinting) {
        // in case of hinting, the hinting engine takes care
        // of scaling the points (not the path) before hinting.
        hPoints = useGlyph.path && font.hinting.exec(useGlyph, fontSize, options);
        // in case the hinting engine failed hPoints is undefined
        // and thus reverts to plain rending
    }

    if (hPoints) {
        // Call font.hinting.getCommands instead of `glyf.getPath(hPoints).commands` to avoid a circular dependency
        commands = font.hinting.getCommands(hPoints);
        x = Math.round(x);
        y = Math.round(y);
        // TODO in case of hinting xyScaling is not yet supported
        xScale = yScale = 1;
    } else {
        commands = useGlyph.path.commands;
        if (xScale === undefined) xScale = scale;
        if (yScale === undefined) yScale = scale;
    }

    const p = new opentype.Path();
    if ( options.drawSVG ) {
        const svgImage = this.getSvgImage(font);
        if ( svgImage ) {
            const layer = new opentype.Path();
            layer._image = {
                image: svgImage.image,
                x: x + svgImage.leftSideBearing * scale,
                y: y - svgImage.baseline * scale,
                width: svgImage.image.width * scale,
                height: svgImage.image.height * scale,
            };
            p._layers = [layer];
            return p;
        }
    }
    if ( options.drawLayers ) {
        const layers = this.getLayers(font);
        if ( layers && layers.length ) {
            p._layers = [];
            for ( let i = 0; i < layers.length; i += 1 ) {
                const layer = layers[i];
                let color = getPaletteColor(font, layer.paletteIndex, options.usePalette);

                if ( color === 'currentColor' ) {
                    color = options.fill || 'black';
                } else {
                    color = formatColor(color, options.colorFormat || 'rgba');
                }
                options = Object.assign({}, options, {fill: color});
                p._layers.push(this.getPath.call(layer.glyph, x, y, fontSize, options, font));
            }
            return p;
        }
    }

    p.fill = options.fill || this.path.fill;
    p.stroke = options.stroke || this.path.stroke;
    p.strokeWidth = options.strokeWidth || this.path.strokeWidth * scale;
    for (let i = 0; i < commands.length; i += 1) {
        const cmd = commands[i];
        if (cmd.type === 'M') {
            p.moveTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'L') {
            p.lineTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'C') {
            p.curveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                x + (cmd.x2 * xScale), y + (-cmd.y2 * yScale),
                x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Z' && p.stroke && p.strokeWidth) {
            p.closePath();
        }
    }

    return p;
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
  window.requestAnimationFrame(renderFun);
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

const createBody = (path, x, y, scale, look) => {
  const render = {
    fillStyle: look.fillColour
  };
  if (look.strokeColour) {
    render.strokeStyle = look.strokeColour;
    render.lineWidth = look.strokeWidth;
  }
  // We call pathToVertices each time as the results are consumed
  // by the next Vertices function calls..
  const vertices = Vertices.fromPath(path.toSVG());
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
  backgroundColour = genBackground();
  const styles = genStyles(backgroundColour, NUM_KS);
  let xVariance = VARIANCE_MIN + (Math.random() * VARIANCE);
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
      xVarianceOrigin + (Math.random() * xVariance),
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
})();
