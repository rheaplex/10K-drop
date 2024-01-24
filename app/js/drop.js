// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Common = Matter.Common,
    Bodies = Matter.Bodies,
    Body   = Matter.Body,
    Composite = Matter.Composite,
    Vertices = Matter.Vertices,
    Svg = Matter.Svg;

// provide concave decomposition support library
Common.setDecomp(decomp);

Common._seed = 4;

var k = [[
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

// create an engine
var engine = Engine.create();

// create a renderer
var render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    background: "#ffffff",
    wireframes: false
  }
});

var ks = [];
for(var i = 0; i < 10; i++) {
  var s = Bodies.fromVertices(400, 200 - (i * 200), k, {
  render: {
    fillStyle: '#ff0000',
    strokeStyle: '#ff0000',
    lineWidth: 1
  }}, true);
  var scale = 1.9;// - (i * 0.1);
  Body.scale(s, scale, scale);
  ks.push(s);
}

var ground = [
  // Base
  Bodies.rectangle(400, 610, 810, 60, {
    isStatic: true,
    render: {
      fillStyle: '#ffffff'
    }
  }),
  // Left
  Bodies.rectangle(0, 0, 1, 9999, {
    isStatic: true,
    render: {
      fillStyle: '#ffffff'
    }
  }),
  // Right
  Bodies.rectangle(804, 0, 10, 9999, {
    isStatic: true,
    render: {
      fillStyle: '#ffffff'
    }
  }),
];

// add all of the bodies to the world
Composite.add(engine.world, ks);
Composite.add(engine.world, ground);

// run the renderer
Render.run(render);

// create runner
var runner = Runner.create();

// run the engine
Runner.run(runner, engine);
