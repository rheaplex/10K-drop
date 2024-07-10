const fs = require("node:fs");
const process = require("node:process");
const { parse } = require("csv-parse");

const template = fs.readFileSync("./src/template.html").toString();

fs.createReadStream("./src/hashes.csv")
  .pipe(parse({ delimiter: ",", from_line: 2 }))
  .on("data", function (row) {
    if(row[1].length != 64) {
      console.error(`Invalid row: ${row}`);
    }
    fs.writeFileSync(
      `./dist/${row[0]}.html`,
      template
          .replace("{{ID}}", row[0])
          .replace("{{HASH}}", row[1])
    );
  });
