////////////////////////////////////////////////////////////////////////
// Basic properties: colour, stroke width, font, letter case.
////////////////////////////////////////////////////////////////////////

const HUE = [
  // Black and white
  '#000000',
  '#ff0000',
  // Primaries
  '#ffff00',
  '#ffffff',
  '#ff00ff',
  '#ffff00',
  '#0000ff',
  '#00ffff',
  // Pastels
  '#ffffaa',
  '#ffffff',
  '#ffaaff',
  '#ffffaa',
  '#aaaaff',
  '#aaffff',
  // Greys
  '#111111',
  '#444444',
  '#888888',
  '#cccccc',
  '#eeeeee',

  // CSS colours
  "#000000",
  "#000080",
  "#00008b",
  "#0000cd",
  "#0000ff",
  "#006400",
  "#008000",
  "#008080",
  "#008b8b",
  "#00bfff",
  "#00ced1",
  "#00fa9a",
  "#00ff00",
  "#00ff7f",
  "#00ffff",
  "#191970",
  "#1e90ff",
  "#20b2aa",
  "#228b22",
  "#2e8b57",
  "#2f4f4f",
  "#32cd32",
  "#3cb371",
  "#40e0d0",
  "#4169e1",
  "#4682b4",
  "#483d8b",
  "#48d1cc",
  "#4b0082",
  "#556b2f",
  "#5f9ea0",
  "#6495ed",
  "#663399",
  "#66cdaa",
  "#696969",
  "#6a5acd",
  "#6b8e23",
  "#708090",
  "#778899",
  "#7b68ee",
  "#7cfc00",
  "#7fff00",
  "#7fffd4",
  "#800000",
  "#800080",
  "#808000",
  "#808080",
  "#87ceeb",
  "#87cefa",
  "#8a2be2",
  "#8b0000",
  "#8b008b",
  "#8b4513",
  "#8fbc8f",
  "#90ee90",
  "#9370db",
  "#9400d3",
  "#98fb98",
  "#9932cc",
  "#9acd32",
  "#a0522d",
  "#a52a2a",
  "#a9a9a9",
  "#add8e6",
  "#adff2f",
  "#afeeee",
  "#b0c4de",
  "#b0e0e6",
  "#b22222",
  "#b8860b",
  "#ba55d3",
  "#bc8f8f",
  "#bdb76b",
  "#c0c0c0",
  "#c71585",
  "#cd5c5c",
  "#cd853f",
  "#d2691e",
  "#d2b48c",
  "#d3d3d3",
  "#d8bfd8",
  "#da70d6",
  "#daa520",
  "#db7093",
  "#dc143c",
  "#dcdcdc",
  "#dda0dd",
  "#deb887",
  "#e0ffff",
  "#e6e6fa",
  "#e9967a",
  "#ee82ee",
  "#eee8aa",
  "#f08080",
  "#f0e68c",
  "#f0f8ff",
  "#f0fff0",
  "#f0ffff",
  "#f4a460",
  "#f5deb3",
  "#f5f5dc",
  "#f5f5f5",
  "#f5fffa",
  "#f8f8ff",
  "#fa8072",
  "#faebd7",
  "#faf0e6",
  "#fafad2",
  "#fdf5e6",
  "#ff0000",
  "#ff00ff",
  "#ff1493",
  "#ff4500",
  "#ff6347",
  "#ff69b4",
  "#ff7f50",
  "#ff8c00",
  "#ffa07a",
  "#ffa500",
  "#ffb6c1",
  "#ffc0cb",
  "#ffd700",
  "#ffdab9",
  "#ffdead",
  "#ffe4b5",
  "#ffe4c4",
  "#ffe4e1",
  "#ffebcd",
  "#ffefd5",
  "#fff0f5",
  "#fff5ee",
  "#fff8dc",
  "#fffacd",
  "#fffaf0",
  "#fffafa",
  "#ffff00",
  "#ffffe0",
  "#fffff0",
  "#ffffff",
];

const STROKE_WIDTH = [
  // No 0, we need to cover internal edges
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  12,
];

// We don't use the font names in CSS so they don't have to be accurate here.
const FONTS = {
  "Alfa-Slab-One-regular-400": "AlfaSlabOne-Regular.ttf",
  "Merriweather-regular-400": "u-440qyriQwlOrhSvowK_l5Oew.ttf",
  "Noto-Serif-Black": "NotoSerif-Black.ttf",
  "Roboto-normal-900": "KFOlCnqEu92Fr1MmYUtvAw.ttf",
  "Roboto-mono-regular-400": "RobotoMono-Regular.ttf",
  "Orbitron-Medium-regular-400": "Orbitron-Medium.ttf",
  "Montserrat-SemiBold-600": "Montserrat-SemiBold.ttf",
};

const LETTER_CASE = ["uppercase", "lowercase"];


////////////////////////////////////////////////////////////////////////
// Colour values and distance.
////////////////////////////////////////////////////////////////////////

// The minimum euclidean distance between two colours we accept as "different".
const MIN_DISTANCE = 24;

const parseCssColor = (color) => {
  return [
    parseInt(color.substr(1, 2), 16),
    parseInt(color.substr(3, 2), 16),
    parseInt(color.substr(5, 2), 16)
  ];
};

const distance = (a, b) => {
  const [r1, g1, b1] = parseCssColor(a);
  const [r2, g2, b2] = parseCssColor(b);
  return Math.hypot(r2 - r1, g2 - g1, b2 - b1);
};


////////////////////////////////////////////////////////////////////////
// Random choices
////////////////////////////////////////////////////////////////////////

const pick = (random, items) => items[random.random_int(0, items.length - 1)];

// Make sure we pick an item that we do not wish to exclude.

const pickDifferent = (random, items, excludes) => {
  const picked = pick(random, items); //.filter(x => ! exclude.includes(x)));
  if (typeof(excludes) == 'string') {
    excludes = [excludes];
  }
  // Not tail recursive ;-(
  for (const exclude of excludes) {
    if (distance(picked, exclude) < MIN_DISTANCE) {
      return pickDifferent(random, items, exclude);
    }
  }
  return picked;
};


////////////////////////////////////////////////////////////////////////
// Main flow of execution
////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////
// Generate ranges of values, particularly alternating values.
////////////////////////////////////////////////////////////////////////

const range = n => [...Array(n).keys()];

// Alternate two known values in an array of size count.

const alternate = (count, a, b) => range(count).map(i => i % 2 ? a : b);

// Pick two different values that we do not wish to exclude,
// then alternate them in an array of size count.

const alternateChoices = (random, count, options, exclude) => {
  const a = pickDifferent(random, options, exclude);
  const b = pickDifferent(random, options, exclude.concat([a]));
  return alternate(count, a, b);
};


////////////////////////////////////////////////////////////////////////
// Generator strategies.
////////////////////////////////////////////////////////////////////////

const FILL_COLOUR_STRATEGIES = {
  "same": (random, background, count) => Array(count)
    .fill(pickDifferent(random, HUE, background)),

  "half & half": (random, background, count) => {
    const first = pickDifferent(random, HUE, background);
    return Array(count).fill(first, 0, count / 2)
      .fill(pickDifferent(random, HUE, [background, first]), count / 2);
  },

  //"alternating",

  //"gradient",

  "random": (random, background, count) => range(count)
    .map(() => pickDifferent(random, HUE, background)),

  //"two each of five"
};

const STROKE_COLOUR_STRATEGIES = {
  "none": (random, background, fills, count) => false,

  "fill colour": (random, background, fills, count) => fills,

  "background colour": (random, background, fills, count) => Array(count)
    .fill(background),

  "alternating": (random, background, fills, count) => alternateChoices(
    random,
    count,
    HUE,
    fills.concat([background])
  ),

  //"gradient":,
  "random but not fill or bg":(random, background, fills, count) => range(count)
    .map(i => pickDifferent(random, HUE, [background, fills[i]]))
};

const SCALE_MIN = 1.0;
const SCALE_MAX = 1.75;
const SCALE_RANGE = SCALE_MAX - SCALE_MIN;

const SCALE_STRATEGIES = {
  "one": (random, count) => Array(count)
    .fill(1.0),

  "alternating": (random, count) => alternate(
    count,
    (random.random_dec() * SCALE_RANGE) + SCALE_MIN,
    (random.random_dec() * SCALE_RANGE) + SCALE_MIN
  ),

  "half & half": (random, count) => Array(count)
    .fill(SCALE_MIN + random.random_dec() * (SCALE_RANGE / 2), 0, count / 2)
    .fill(SCALE_MAX - random.random_dec() * (SCALE_RANGE / 2), count / 2),

  "random": (random, count) => range(count)
    .map(() => (random.random_dec() * SCALE_RANGE) + SCALE_MIN),

  "little to big": (random, count) => range(count)
    .map(i => SCALE_MIN + i * (SCALE_RANGE / count)),

  "big to little": (random, count) => range(count)
    .map(i => SCALE_MAX - i * (SCALE_RANGE / count)),
};

const CASE_STRATEGIES = {
  "all upper": (random, count) => Array(count).fill("uppercase"),

  "all lower": (random, count) => Array(count).fill("lowercase"),

  "half and half": (random, count) => Array(count)
    .fill("uppercase", count / 2)
    .fill("lowercase", count / 2),

  "alternating": (random, count) => alternate(count, "uppercase", "lowercase"),

  "random": (random, count) => range(count).map(i => pick(random, LETTER_CASE))
};

const FONT_STRATEGIES = {
  "all same": (random, count) => Array(count)
    .fill(pick(random, Object.keys(FONTS))),

  "random": (random, count) => range(count)
    .map(i => pick(random, Object.keys(FONTS))),

  "alternating": (random, count) => alternateChoices(
    random,
    count,
    Object.keys(FONTS),
    []
  ),

  "half and half": (random, count) => {
    const first = pick(random, Object.keys(FONTS));
    return Array(count).fill(first, 0, count / 2)
      .fill(pickDifferent(random, Object.keys(FONTS), [first]), count / 2);
  }
};


////////////////////////////////////////////////////////////////////////
// Main flow of execution
////////////////////////////////////////////////////////////////////////

// The image background colour.

const genBackground = (random) => {
  return pick(random, HUE);
};

// The style for each K .

const generateProperties = (random, backgroundColour, count) => {
  const fillColourStrategy = pick(random, Object.keys(FILL_COLOUR_STRATEGIES));
  const fillColours = FILL_COLOUR_STRATEGIES[fillColourStrategy](
    random,
    backgroundColour,
    count
  );
  const strokeColourStrategy = pick(
    random,
    Object.keys(STROKE_COLOUR_STRATEGIES)
  );
  const strokeColours = STROKE_COLOUR_STRATEGIES[strokeColourStrategy](
    random,
    backgroundColour,
    fillColours,
    count
  );
  const strokeWidths = Array(count).fill(pick(random, STROKE_WIDTH));
  const scaleStrategy = pick(random, Object.keys(SCALE_STRATEGIES));
  const scales = SCALE_STRATEGIES[scaleStrategy](random, count);
  const fontStrategy = pick(random, Object.keys(FONT_STRATEGIES));
  const fonts = FONT_STRATEGIES[fontStrategy](random, count);
  const caseStrategy = pick(random, Object.keys(CASE_STRATEGIES));
  const cases = CASE_STRATEGIES[caseStrategy](random, count);
  return [fillColours, strokeColours, strokeWidths, scales, fonts, cases];
};

const genStyles = (random, count) => {
  const backgroundColour = genBackground(random);
  const [fillColours, strokeColours, strokeWidths, scales, fonts, cases]
        = generateProperties(random, backgroundColour, count);
  const styles = [];
  for (let i = 0; i < count; i++) {
    const style = {
      fillColour: fillColours[i],
      scale: scales[i],
      fontName: fonts[i],
      case: cases[i]
    };
    if (strokeColours) {
      style.strokeColour = strokeColours[i];
      style.strokeWidth = strokeWidths[i];
    } else {
      style.strokeColour = false;
    }
    styles.push(style);
  }
  return [backgroundColour, styles];
};
