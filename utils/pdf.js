const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const tmp = require("tmp");
const rimraf = require("rimraf");

const generate = (latexCode) => {
  return new Promise((resolve, reject) => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const texFilePath = path.join(tmpDir.name, "document.tex");
    const pdfFilePath = path.join(tmpDir.name, "document.pdf");

    fs.writeFileSync(texFilePath, latexCode);

    exec(`pdflatex -output-directory=${tmpDir.name} ${texFilePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error("Error generating PDF:", error);
        console.error(stderr);
        rimraf(tmpDir.name, () => reject(new Error("Error generating PDF")));
      } else {
        resolve({ pdfFilePath, cleanupCallback: () => rimraf(tmpDir.name, () => {}) });
      }
    });
  });
};


module.exports = {generate}