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

const PDFprompt = `
You are a LaTeX expert. Your task is to convert a set of images into LaTeX code, combining them into a single document. Please ensure to maintain the same structure and accurately reconstruct any tables, charts, and equations present in the images.
Key Requirements:
- Structure: Preserve the overall layout and organization as seen in the images. Each image's content should be clearly delineated as separate sections in the final document.
- Tables: Reconstruct tables with precise formatting, including rows, columns, borders, and any specific styling (e.g., bold headers, cell shading).
- Charts and Graphs: Accurately recreate charts and graphs using LaTeX-compatible packages (such as pgfplots or tikz). Include all axes, labels, legends, data points, and any annotations or shaded areas.
- Equations: Convert all mathematical expressions and equations into proper LaTeX syntax, ensuring correct alignment and formatting. Use appropriate environments (e.g., align, equation, gather) for multi-line equations and matrices.
- Text Formatting: Maintain the same font styles, sizes, and any special text formatting (e.g., bold, italics, underlined text).
- Non-Text Elements: Ensure that any diagrams, drawings, or other non-text elements are accurately represented using LaTeX drawing packages (e.g., tikz). Reproduce any specific details such as arrows, labels, and annotations.
- Missing Content: For any elements that are difficult to reconstruct or have missing details, include the relevant parts of the images directly in the document.
`;

module.exports = {model, fileToGenerativePart, PDFprompt}