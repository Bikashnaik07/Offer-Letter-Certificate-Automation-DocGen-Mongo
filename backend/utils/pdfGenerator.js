const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF document from template and data
 * @param {Object} template - Template object from database
 * @param {Object} data - Data to replace placeholders
 * @param {string} documentId - Unique document identifier
 * @returns {Object} Generated file information
 */
async function generatePDF(template, data, documentId) {
    let browser = null;
    
    try {
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '../generated/pdf');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${template.type}_${documentId}_${timestamp}.pdf`;
        const filePath = path.join(outputDir, fileName);
        
        // Replace placeholders in template content
        const processedContent = template.replacePlaceholders(data);
        
        // Create HTML content with styling
        const htmlContent = createStyledHTML(processedContent, template, data);
        
        // Launch puppeteer
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set content
        await page.setContent(htmlContent, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Generate PDF
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1in',
                right: '1in',
                bottom: '1in',
                left: '1in'
            },
            displayHeaderFooter: true,
            headerTemplate: getHeaderTemplate(template, data),
            footerTemplate: getFooterTemplate(template, data)
        });
        
        await browser.close();
        browser = null;
        
        // Get file size
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        
        return {
            filePath: `generated/pdf/${fileName}`,
            fileName,
            fileSize,
            success: true
        };
        
    } catch (error) {
        console.error('PDF generation error:', error);
        
        // Clean up browser if it's still running
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
        
        throw new Error(`PDF generation failed: ${error.message}`);
    }
}

/**
 * Create styled HTML content for PDF generation
 * @param {string} content - Processed template content
 * @param {Object} template - Template object
 * @param {Object} data - User data
 * @returns {string} Styled HTML content
 */
function createStyledHTML(content, template, data) {
    // Convert line breaks to HTML
    const htmlContent = content.replace(/\n/g, '<br>');
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.name}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 0;
                margin: 0;
            }
            
            .document {
                max-width: 100%;
                margin: 0;
                padding: 0;
                background: white;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            
            .company-logo {
                font-size: 24pt;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            
            .document-title {
                font-size: 18pt;
                font-weight: bold;
                color: #34495e;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .document-subtitle {
                font-size: 12pt;
                color: #7f8c8d;
                font-style: italic;
            }
            
            .content {
                text-align: justify;
                margin-bottom: 40px;
                white-space: pre-wrap;
            }
            
            .content p {
                margin-bottom: 15px;
            }
            
            .signature-section {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .signature-block {
                text-align: center;
                width: 200px;
            }
            
            .signature-line {
                border-top: 1px solid #333;
                margin-bottom: 5px;
                height: 50px;
            }
            
            .signature-label {
                font-size: 10pt;
                color: #666;
            }
            
            .document-id {
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 8pt;
                color: #999;
            }
            
            .letterhead {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px 0;
                background: #f8f9fa;
                border: 1px solid #dee2e6;
            }
            
            .date-section {
                text-align: right;
                margin-bottom: 30px;
                font-size: 11pt;
            }
            
            .recipient-section {
                margin-bottom: 30px;
                font-size: 11pt;
            }
            
            .subject-line {
                font-weight: bold;
                margin: 20px 0;
                text-decoration: underline;
            }
            
            .table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            
            .table th,
            .table td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            
            .table th {
                background-color: #f2f2f2;
                font-weight: bold;
            }
            
            .highlight {
                background-color: #ffffcc;
                padding: 2px 4px;
            }
            
            .important {
                font-weight: bold;
                color: #d63384;
            }
            
            @media print {
                body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                }
                
                .page-break {
                    page-break-after: always;
                }
            }
        </style>
    </head>
    <body>
        <div class="document">
            <div class="document-id">Doc ID: ${data.documentId || 'N/A'}</div>
            
            <div class="letterhead">
                <div class="company-logo">DocGen-Mongo</div>
                <div style="font-size: 10pt; color: #666;">
                    Document Automation System
                </div>
            </div>
            
            <div class="header">
                <div class="document-title">${template.name}</div>
                <div class="document-subtitle">${template.type.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
            
            <div class="date-section">
                <strong>Date:</strong> ${data.date || new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </div>
            
            <div class="content">
                ${htmlContent}
            </div>
            
            <div class="signature-section">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-label">Authorized Signatory</div>
                    <div style="font-size: 9pt; margin-top: 5px;">
                        ${data.company || 'Organization Name'}
                    </div>
                </div>
                
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-label">Recipient</div>
                    <div style="font-size: 9pt; margin-top: 5px;">
                        ${data.name || 'Recipient Name'}
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Get header template for PDF
 * @param {Object} template - Template object
 * @param {Object} data - User data
 * @returns {string} Header HTML
 */
function getHeaderTemplate(template, data) {
    return `
        <div style="font-size: 8pt; color: #666; width: 100%; text-align: center; margin: 0 1in;">
            <span style="float: left;">${data.company || 'DocGen-Mongo'}</span>
            <span style="float: right;">${template.name}</span>
        </div>
    `;
}

/**
 * Get footer template for PDF
 * @param {Object} template - Template object
 * @param {Object} data - User data
 * @returns {string} Footer HTML
 */
function getFooterTemplate(template, data) {
    return `
        <div style="font-size: 8pt; color: #666; width: 100%; text-align: center; margin: 0 1in;">
            <span style="float: left;">Generated on ${new Date().toLocaleDateString()}</span>
            <span style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
    `;
}

/**
 * Generate PDF from HTML string (utility function)
 * @param {string} htmlContent - HTML content to convert
 * @param {string} fileName - Output file name
 * @returns {Object} Generated file information
 */
async function generatePDFFromHTML(htmlContent, fileName) {
    let browser = null;
    
    try {
        const outputDir = path.join(__dirname, '../generated/pdf');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filePath = path.join(outputDir, fileName);
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1in',
                right: '1in',
                bottom: '1in',
                left: '1in'
            }
        });
        
        await browser.close();
        
        const stats = fs.statSync(filePath);
        
        return {
            filePath: `generated/pdf/${fileName}`,
            fileName,
            fileSize: stats.size,
            success: true
        };
        
    } catch (error) {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError);
            }
        }
        
        throw new Error(`PDF generation failed: ${error.message}`);
    }
}

module.exports = {
    generatePDF,
    generatePDFFromHTML
};
