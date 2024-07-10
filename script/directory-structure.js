const fs = require("node:fs");

const distdir = "./dist";

const dirs = [
  distdir,
  `${distdir}/animation`,
  `${distdir}/animation/js`,
  `${distdir}/animation/css`,
  `${distdir}/animation/fonts`,
  `${distdir}/image`,
  `${distdir}/thumbnail`,
  `${distdir}/svg`,
];

const maybeCreate = dir => {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
};

dirs.forEach(dir => maybeCreate(dir));

fs.copyFileSync("./src/css/drop.css", `./${distdir}/animation/css/drop.css`);

fs.cpSync("./src/fonts", `./${distdir}/animation/fonts`, { recursive: true });
