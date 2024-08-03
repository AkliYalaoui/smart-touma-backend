const MAX_NAME_LENGTH = 100; // Maximum length for category name
const MAX_DESCRIPTION_LENGTH = 500; // Maximum length for category description

const validateCategory = (name, description) => {
  if (!name || name.trim() === '') throw new Error('Category name is required');
  if (name.length > MAX_NAME_LENGTH) throw new Error(`Category name cannot exceed ${MAX_NAME_LENGTH} characters`);
  if (description && description.length > MAX_DESCRIPTION_LENGTH) throw new Error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  return name.trim().toLowerCase(); // Return name in lowercase
};

const validateTemplate = (name, preview) => {
  if (!name || name.trim() === '') throw new Error('Template name is required');
  if (name.length > MAX_NAME_LENGTH) throw new Error(`Template name cannot exceed ${MAX_NAME_LENGTH} characters`);
  if (!preview) throw new Error('Template preview is required');
  return name.trim().toLowerCase();
};


module.exports = {validateCategory, validateTemplate}