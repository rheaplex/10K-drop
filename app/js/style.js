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
  /*14,
  15,
  16,
  18,
  20*/
];

const LETTER_CASE = ["uppercase", "lowercase"];
const FONTS = {
  "Roboto-normal-900": "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmYUtvAw.ttf",
  "Merriweather-regular-400": "https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5Oew.ttf"
};

const MIN_DISTANCE = 16;

const parseCssColor = (color) => {
  return [
    parseInt(color.substr(1, 2), 16),
    parseInt(color.substr(3, 2), 16),
    parseInt(color.substr(5, 2), 16)
  ];
};

const distance = (a, b) => {
  const [r1, g1, b1] = parseCssColor(a);;
  const [r2, g2, b2] = parseCssColor(b);
  return Math.hypot(r2 - r1, g2 - g1, b2 - b1);
};

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const pickDifferent = (items, excludes) => {
  const picked = pick(items); //.filter(x => ! exclude.includes(x)));
  if (typeof(excludes) == 'string') {
    excludes = [excludes];
  }
  // Not tail recursive ;-(
  for (const exclude of excludes) {
    if (distance(picked, exclude) < MIN_DISTANCE) {
      return pickDifferent(items, exclude);
    }
  }
  return picked;
};

const genBackground = () => {
  return pick(HUE);
};

const range = n => [...Array(n).keys()];

const FILL_COLOUR_STRATEGIES = {
  "same": (background, count) => {
    return Array(count).fill(pickDifferent(HUE, background));
  },
  "half & half": (background, count) => {
    const first = pickDifferent(HUE, background);
    return Array(count).fill(first, 0, count / 2)
      .fill(pickDifferent(HUE, [background, first]), count / 2);
  },
  //"alternating",
  //"gradient",
  "random": (background, count) => {
    return range(count).map(() => pickDifferent(HUE, background));
  },
  //"two each of five"
};

const SCALE_MIN = 0.5;
const SCALE_MAX = 2.0;
const SCALE_RANGE = SCALE_MAX - SCALE_MIN;

const SCALE_STRATEGIES = {
  "one": (count) => Array(count).fill(1.0),
  //"alternating",
  "half & half": (count) => Array(count).fill(SCALE_MIN + Math.random() * (SCALE_RANGE / 2), 0, count / 2)
    .fill(SCALE_MAX - Math.random() * (SCALE_RANGE / 2), count / 2),
  "random": (count) => range(count).map(() => (Math.random() * SCALE_RANGE) + SCALE_MIN),
  "little to big": (count) => range(count).map(i => SCALE_MIN + i * (SCALE_RANGE / count)),
  "big to little": (count) => range(count).map(i => SCALE_MAX - i * (SCALE_RANGE / count)),
};

const STROKE_COLOUR_STRATEGIES = {
  "none": (background, fills, count) => undefined,
  "fill colour": (background, fills, count) => fills,
  "background colour": (background, fills, count) => background,
  //"alternating":,
  //"gradient":,
  "random but not fill or bg":(background, fills, count) => range(count).map(i => pickDifferent(HUE, [background, fills[i]]))
};

const CASE_STRATEGIES = {
  "all upper": (count) => Array(count).fill("uppercase"),
  "all lower": (count) => Array(count).fill("lowercase"),
  "half and half": (count) => Array(count).fill("uppercase", count / 2)
    .fill("lowercase", count / 2),
  "alternating": (count) => Array(count).map(i => i % 2 ? "uppercase": "lowercase"),
  "random": (count) => range(count).map(i => pick(["uppercase, lowercase"]))
};

const FONT_STRATEGIES = {
  "all same": (count) => Array(count).fill(pick(Object.keys(FONTS))),
  "random": (count) => range(count).map(i => pick(Object.keys(FONTS))),
  //"alternating":,
  "half and half": (count) => {
    const first = pick(Object.keys(FONTS));
    return Array(count).fill(first, 0, count / 2)
      .fill(pickDifferent(Object.keys(FONTS), [first]), count / 2);
  }
};

const genStyles = (backgroundColour, count) => {
  const fillColourStrategy = pick(Object.keys(FILL_COLOUR_STRATEGIES));
  const fillColours = FILL_COLOUR_STRATEGIES[fillColourStrategy](backgroundColour, count);
  const strokeColourStrategy = pick(Object.keys(STROKE_COLOUR_STRATEGIES));
  const strokeColours = STROKE_COLOUR_STRATEGIES[strokeColourStrategy](backgroundColour, fillColours, count);
  const strokeWidths = Array(count).fill(pick(STROKE_WIDTH));
  const scaleStrategy = pick(Object.keys(SCALE_STRATEGIES));
  const scales = SCALE_STRATEGIES[scaleStrategy](count);
  const fontStrategy = pick(Object.keys(FONT_STRATEGIES));
  const fonts = FONT_STRATEGIES[fontStrategy](count);
  const caseStrategy = pick(Object.keys(CASE_STRATEGIES));
  const cases = CASE_STRATEGIES[caseStrategy](count);
  console.log({
    fill: fillColourStrategy,
    stroke: strokeColourStrategy,
    strokeWidth: strokeWidths[0],
    scale: scaleStrategy,
    font: fontStrategy,
    case: caseStrategy
  });
  const styles = [];
  for (let i = 0; i < count; i++) {
    const style = {
      fillColour: fillColours[i],
      scale: scales[i],
      fontName: fonts[i],
      case: cases[i]
    };
    if (strokeColourStrategy != "none") {
      style.strokeColour = strokeColours[i];
      style.strokeWidth = strokeWidths[i];
    } else {
      style.strokeColour = false;
    }
    styles.push(style);
  }
  return styles;
};
