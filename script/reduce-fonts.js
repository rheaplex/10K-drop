/* global Buffer fetchUrl */

const fs = require("node:fs");
const path = require("node:path");
const opentype = require("../src/js/opentype");

require("../src/js/node");

const { FONTS } = require("../src/js/style");

// We don't use the config, as we want to make sure we use the originals.
const FONTDIR = "./src/fonts";
const DESTDIR = "./dist/animation/fonts";

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

const fetchFont = async (file, prefix) => {
  let data = await fetchUrl(file, prefix);
  return opentype.parse(data);
};

FONTS.forEach(async fontfilename => {
  const data = await fetchUrl(fontfilename, FONTDIR);
  const font = opentype.parse(data);
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
  const outpath = path.join(DESTDIR, fontfilename);
  fs.writeFileSync(outpath, new Uint8Array(newFont.toArrayBuffer()));
});
