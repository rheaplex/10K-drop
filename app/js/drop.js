// module aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Common = Matter.Common,
      Bodies = Matter.Bodies,
      Body   = Matter.Body,
      Composite = Matter.Composite,
      Vertices = Matter.Vertices,
      Svg = Matter.Svg;

const WIDTH = 800;
const HEIGHT = 600;
const VARIANCE_MIN = 10;
const VARIANCE_MAX = 150;

const SCALES = [
  (i) => 1.9,
  (i) => 1 + (0.1 * i),
  (i) => 2 - (0.1 * i),
  (i) => 0.5 + (Math.random() * 1.5),
  (i) => 1.0 + (Math.random() * 1.0),
  (i) => i % 2 == 0 ? 2.0 : 1.0,
  // Curves up/down.
];

const boundsAndOffset = (points) => {
  let xMin = 999999;
  let xMax = -999999;
  let yMin = 999999;
  let yMax = -999999;
  for (const p of points) {
    if (p.x < xMin) {
      xMin = p.x;
    } else if (p.x > xMax) {
      xMax = p.x;
    }
    if (p.y < yMin) {
      yMin = p.y;
    } else if (p.y > yMax) {
      yMax = p.y;
    }
  }
  const xOffset = xMin + ((xMax - xMin) / 2);
  const yOffset = yMin + ((yMax - yMin) / 2);
  return [xMin, xMax, yMin, yMax, xOffset, yOffset];
};

const centrePoints = (points) => {
  const [xMin, xMax, yMin, yMax, xOffset, yOffset] = boundsAndOffset(points);
  return points.map(p => { return {x: p.x - xOffset, y: p.y - yOffset }; });
};

const K = [centrePoints([
  {x: 133.40105, y: 105.93841},
  {x: 109.63743, y: 105.93841},
  {x: 88.137015, y: 129.32482},
  {x: 77.952608, y: 140.5151},
  {x: 77.952608, y: 105.93841},
  {x: 59.344061, y: 105.93841},
  {x: 59.344061, y: 195.4606},
  {x: 77.952608, y: 195.4606},
  {x: 77.952608, y: 162.64418},
  {x: 86.376747, y: 154.34577000000002},
  {x: 114.54102999999999, y: 195.4606},
  {x: 137.55025, y: 195.4606},
  {x: 99.453023, y: 141.89817},
  {x: 133.40105, y: 105.93841},
])];
console.log(K);

const [xMin, xMax, yMin, yMax, xOffset, yOffset] = boundsAndOffset(K[0]);

// provide concave decomposition support library
Common.setDecomp(decomp);
Common._seed = 4;

const style = genRender();
const BACKGROUND = genBackground(style);

// create an engine
const engine = Engine.create();

const ks = [];
const scales = [];
const scaleFun = pick(SCALES);
const xVariance = VARIANCE_MIN + (Math.random() * (VARIANCE_MAX - VARIANCE_MIN));
for(let i = 0; i < 10; i++) {
  const scale = scaleFun(i);
  scales[i] = scale;
  const s = Bodies.fromVertices(
    200 + (Math.random() * xVariance),
    -100 - (i * 200),
    K,
    {},
    true
  );
  Body.scale(s, scale, scale);
  ks.push(s);
}

const ground = [
  // Base
  Bodies.rectangle(WIDTH / 2, HEIGHT, WIDTH, style.lineWidth, {
    isStatic: true
  }),
  // Left
  Bodies.rectangle(-1, 0, 1, 9999, {
    isStatic: true
  }),
  // Right
  Bodies.rectangle(WIDTH + 1, 0, 1, 9999, {
    isStatic: true
  }),
];

// add all of the bodies to the world
Composite.add(engine.world, ks);
Composite.add(engine.world, ground);

// create runner
const runner = Runner.create();

// run the engine
Runner.run(runner, engine);

function setup() {
  createCanvas(WIDTH, HEIGHT);
}

function draw() {
  background(BACKGROUND);
  Engine.update(engine, deltaTime);
  const ks = engine.world.bodies;
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i];
    if (k.label == "Body") {
      stroke(style.strokeStyle);
      strokeWeight(style.lineWidth);
      fill(style.fillStyle);
      push();
      //FIXME: Allow for Bodies.fromVertices changing the centre.
      // https://brm.io/matter-js/docs/classes/Bodies.html#method_fromVertices
      translate(k.position.x, k.position.y);
      rotate(k.angle);
      scale(scales[i]);
      beginShape();
      for (const v of K[0]) {
        vertex(v.x, v.y);
      }
      endShape(CLOSE);
      pop();

      
      noFill();
      stroke(0);
      beginShape();
      for (const v of k.vertices) {
        vertex(v.x, v.y);
      }
      endShape(CLOSE);
    }
  }
}
