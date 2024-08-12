const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const { config } = require("dotenv");
config();

// Converts local file information to a GoogleGenerativeAI.Part object.
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
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

Summary: Provide a brief summary of the content of the document.

\\documentclass{${template}}
...
`;

const update_pdf_prompt = (template_name, user_prompt, title, latex_code) => `
You are an expert in LaTeX. Your task is to update the provided LaTeX code according to the user's instructions. Your updated LaTeX code must be fully functional, compile without errors, and generate a correct PDF. 

Please ensure the following:

1. **Include Necessary Packages**: Add any required LaTeX packages for the document, especially those used in the existing code (e.g., \`amsmath\` for math environments).
2. **Error-Free Code**: The updated LaTeX code must be free of syntax errors, including unmatched braces or unclosed environments.
3. **Document Structure**: Ensure the structure adheres to LaTeX conventions and is suitable for PDF generation.

**Template Name**: ${template_name}
**Document Title**: ${title}

**Existing LaTeX Code**:
\`\`\`
${latex_code}
\`\`\`

**User Instructions**:
${user_prompt}

Please provide the updated LaTeX code. Make sure to:

1. Verify the LaTeX code is valid and compiles without errors.
2. Include all necessary packages and configurations.
3. Confirm the document follows proper LaTeX conventions.

**Response Format**:
\`\`\`latex
% Updated Document Title: [Title]
\\documentclass{${template_name}}
% Include necessary packages
[Updated LaTeX Code]...
\\end{document}
\`\`\`
`;

const parseLatexResponse = (response) => {
  // Extract title
  const titleMatch = response.match(/Title: (.+)\n/);
  const title = titleMatch ? titleMatch[1] : "Untitled";

  // Extract summary
  const summaryMatch = response.match(/Summary: (.+)\n/);
  const summary = summaryMatch ? summaryMatch[1] : "No summary available";

  // Extract LaTeX code block (everything within the `latex` code block)
  const latexCodeStartIndex = response.indexOf('\\documentclass');
  const latexCodeEndIndex = response.indexOf('\\end{document}');
  const latexCode = latexCodeStartIndex !== -1 && latexCodeEndIndex !== -1 
    ? response.slice(latexCodeStartIndex, latexCodeEndIndex + '\\end{document}'.length).trim()
    : "No LaTeX code found";

  return { title, summary, latexCode };
};

const qa_prompt = (latex_code, question) => {
  const prompt = `
  You are a highly knowledgeable assistant with the ability to understand and analyze LaTeX documents as well as to use general world knowledge to answer questions.

  I will provide you with a LaTeX code snippet and a question related to the content. Your task is to answer the question based on:
  1. The content of the LaTeX code provided, focusing on the ideas, concepts, and information it represents.
  2. Your own knowledge if the answer is not directly apparent from the LaTeX code.

  Sometimes, the answer may not be directly found in the document. Use your knowledge to provide a comprehensive and accurate response. Do not get bogged down by LaTeX syntax; focus on the content and context.

  LaTeX Code:
  ${latex_code}

  Question:
  ${question}

  Answer:
  `;

  return prompt;
};

module.exports = {
  model,
  fileToGenerativePart,
  pdf_prompt,
  parseLatexResponse,
  update_pdf_prompt,
  qa_prompt,
  genAI,
};
