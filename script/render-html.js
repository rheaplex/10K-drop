const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");

const config = require("../src/js/config");

const template = fs.readFileSync("./src/template.html").toString();
const indexTemplate = fs.readFileSync("./src/index-template.html").toString();

const links = [];

const render = (id, title) => {
  process.stderr.write(`${id}(${title}) `);
  fs.writeFileSync(
    `./dist/animation/${id}`,
    template.replaceAll("{{ID}}", id)
      .replaceAll("{{TITLE}}", title)
  );
  links.push(
    `${title}:
 <a href="./metadata/${id}">metadata</a>&nbsp;
-&nbsp;<a href="./animation/${id}">animation</a>&nbsp;
-&nbsp;<a href="./image/${id}">image</a>&nbsp
-&nbsp;<a href="./thumbnail/${id}">thumbnail</a>&nbsp
-&nbsp;<a href="./svg/${id}">svg</a>`
  );
};

for (let i = 0; i < config.edition; i++) {
  const id = config.firstId + i;
  const title = `${config.editionPrefix}${id}`;
  render(id, title);
}

for (let i = 0; i < config.ap; i++) {
  const id = config.edition + i;
  const title = `${config.apPrefix}${i + 1}`;
  render(id, title);
}

process.stderr.write("- writing index\n");

fs.writeFileSync(
  `./dist/index.html`,
  indexTemplate.replace("{{LINKS}}", links.join("<br>\n"))
);
