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

const K = [[
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
]];

// provide concave decomposition support library
Common.setDecomp(decomp);
Common._seed = 4;

const style = genRender();
const background = genBackground(style);

// create an engine
const engine = Engine.create();

// create a renderer
const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    background: background,
    wireframes: false
  }
});

const ks = [];
const scaleFun = pick(SCALES);
const xVariance = VARIANCE_MIN + (Math.random() * (VARIANCE_MAX - VARIANCE_MIN));
for(let i = 0; i < 10; i++) {
  const s = Bodies.fromVertices(
    200 + (Math.random() * xVariance),
    -100 - (i * 200),
    K,
    {
      render: style
    },
    true
  );
  const scale = scaleFun(i);
  Body.scale(s, scale, scale);
  ks.push(s);
}

const ground = [
  // Base
  Bodies.rectangle(WIDTH / 2, HEIGHT + 1, WIDTH, style.lineWidth, {
    isStatic: true,
    render: {
      opacity: 0
    }
  }),
  // Left
  Bodies.rectangle(-1, 0, 1, 9999, {
    isStatic: true,
    render: {
      opacity: 0
    }
  }),
  // Right
  Bodies.rectangle(WIDTH + 1, 0, 1, 9999, {
    isStatic: true,
    render: {
      opacity: 0
    }
  }),
];

// add all of the bodies to the world
Composite.add(engine.world, ks);
Composite.add(engine.world, ground);

// run the renderer
Render.run(render);

// create runner
const runner = Runner.create();

// run the engine
Runner.run(runner, engine);
