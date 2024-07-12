/* global Buffer */

const fs = require("node:fs");
const path = require("node:path");

const opentype = require("../src/js/opentype");

const { FONTS } = require("../src/js/style");

const FONTDIR = "src/fonts";

const PROPS = [
  "designer",
  "designerUrl",
  "manufacturer",
  "manufacturerUrl",
  "license",
  "licenseUrl",
  "copyright",
  "trademark",
];

const maybeAppendProp = (src, dest, prop) => {
  if (src[prop]) {
    dest[prop] = src[prop].en;
  }
};

const maybeAppendProps = (src, dest) => {
  for (const prop of PROPS) {
    maybeAppendProp(src, dest, prop);
  }
};

FONTS.forEach(fontfilename => {
  const fontpath = path.join(FONTDIR, fontfilename);
  console.log(fontpath);
  const font = opentype.parse(fs.readFileSync(fontpath));
  const names = font.names.windows;
  const props = {
    familyName: names.fontFamily.en,
    styleName: names.fontSubfamily.en,
    fullName: names.fullName.en,
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    description: "Truncated version, just K and k.",
    glyphs: Object
      .values(font.glyphs.glyphs)
      .filter(g => [ "k", "K" ].includes( g.name)),
  };
  maybeAppendProps(font, props);
  const newFont = new opentype.Font(props);
  fs.writeFileSync(fontpath, Buffer.from(newFont.toArrayBuffer()));
});
