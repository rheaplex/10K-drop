const fs = require("node:fs");
const process = require("node:process");

require("../src/js/node");
const config = require("../src/js/config");

const template = fs.readFileSync("./src/template.html").toString();
const indexTemplate = fs.readFileSync("./src/index-template.html").toString();

const links = [];

for (let i = 0; i < config.edition; i++) {
  const id = config.firstId + i;
  process.stderr.write(`${id} `);
  fs.writeFileSync(
    `./dist/animation/${id}`,
    template.replaceAll("{{ID}}", id)
  );
  links.push(
    `${id}:
 <a href="./${id}">metadata</a>&nbsp;
-&nbsp;<a href="./animation/${id}">animation</a>&nbsp;
-&nbsp;<a href="./image/${id}">image</a>&nbsp
-&nbsp;<a href="./thumbnail/${id}">thumbnail</a>&nbsp
-&nbsp;<a href="./svg/${id}">svg</a>`
  );
}

process.stderr.write("- writing index\n");

fs.writeFileSync(
  `./dist/index.html`,
  indexTemplate.replace("{{LINKS}}", links.join("<br>\n"))
);
