const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const {config} = require('dotenv');
config();

// Converts local file information to a GoogleGenerativeAI.Part object.
function fileToGenerativePart(path, mimeType) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
        mimeType
      },
    };
  }

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const pdf_prompt = (template) => `
You are a LaTeX expert. Your task is to convert a set of images into LaTeX code, combining them into a single document while preserving the structure and accurately reconstructing tables, charts, and equations.

Key Requirements:
- **Structure:** Maintain the overall layout and organization as seen in the images. Clearly delineate each image's content as separate sections in the final document.
- **Tables:** Reconstruct tables with precise formatting, including rows, columns, borders, and specific styling (e.g., bold headers, cell shading).
- **Charts and Graphs:** Accurately recreate charts and graphs using LaTeX-compatible packages (e.g., pgfplots, tikz). Include all axes, labels, legends, data points, and annotations or shaded areas.
- **Equations:** Convert all mathematical expressions and equations into proper LaTeX syntax, ensuring correct alignment and formatting. Use appropriate environments (e.g., align, equation, gather) for multi-line equations and matrices.
- **Text Formatting:** Maintain the same font styles, sizes, and special text formatting (e.g., bold, italics, underlined text).
- **Non-Text Elements:** Accurately represent diagrams, drawings, or other non-text elements using LaTeX drawing packages (e.g., tikz). Reproduce specific details such as arrows, labels, and annotations.
- **Missing Content:** For elements that are difficult to reconstruct or have missing details, include the relevant parts of the images directly in the document.

Please use the ${template} template and respond in the following format:
Title: Your Document Title

\\documentclass{${template}}
...
`;

const parseLatexResponse = (response) => {
  // Extract title
  const titleMatch = response.match(/Title: (.+)\n/);
  const title = titleMatch ? titleMatch[1] : 'Untitled';

  // Extract LaTeX code (everything after the first blank line)
  const latexCode = response.split('\n\n').slice(1).join('\n\n');

  return { title, latexCode };
};

module.exports = {model, fileToGenerativePart, pdf_prompt, parseLatexResponse}