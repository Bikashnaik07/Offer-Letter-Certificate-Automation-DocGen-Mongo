const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

/**
 * Generate DOCX document from template content
 * @param {string} templateContent - Template content with placeholders
 * @param {Object} data - Data to replace placeholders
 * @returns {Buffer} - Generated DOCX buffer
 */
const generateDocx = async (templateContent, data) => {
  try {
    // Replace placeholders in template content
    let processedContent = templateContent;
    
    // Replace all placeholders with actual data
    Object.keys(data).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(placeholder, data[key] || '');
    });

    // Split content into paragraphs
    const paragraphs = processedContent.split('\n').map(line => {
      return new Paragraph({
        children: [
          new TextRun({
            text: line.trim(),
            size: 24, // 12pt font
          })
        ],
        spacing: {
          after: 200,
        }
      });
    });

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;

  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error('Failed to generate DOCX document');
  }
};

/**
 * Generate DOCX from template file
 * @param {string} templatePath - Path to template file
 * @param {Object} data - Data to replace placeholders
 * @returns {Buffer} - Generated DOCX buffer
 */
const generateFromTemplate = async (templatePath, data) => {
  try {
    // For simplicity, we'll use a basic text-based approach
    // In a real-world scenario, you might want to use docx-templates or similar
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return await generateDocx(templateContent, data);
  } catch (error) {
    console.error('Error reading template:', error);
    throw new Error('Failed to read template file');
  }
};

/**
 * Create a sample document template
 * @param {string} type - Template type (offer, certificate, etc.)
 * @param {string} title - Document title
 * @param {string} content - Document content with placeholders
 * @returns {Buffer} - Generated DOCX buffer
 */
const createSampleTemplate = async (type, title, content) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32, // 16pt font
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            }
          }),
          ...content.split('\n').map(line => 
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  size: 24, // 12pt font
                })
              ],
              spacing: {
                after: 200,
              }
            })
          )
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error('Error creating sample template:', error);
    throw new Error('Failed to create sample template');
  }
};

module.exports = {
  generateDocx,
  generateFromTemplate,
  createSampleTemplate
};
