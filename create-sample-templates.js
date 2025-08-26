const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } = require('docx');
const fs = require('fs');
const path = require('path');

// Create sample templates directory if it doesn't exist
const templatesDir = path.join(__dirname, '../sample-templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Create Offer Letter Template
const createOfferLetterTemplate = async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "{{company}}",
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: "{{company_address}}",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "OFFER LETTER",
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Date: {{date}}",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Dear {{name}},",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "We are pleased to offer you the position of {{position}} at {{company}}. We believe your skills and experience will be valuable assets to our team.",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Position Details:",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Job Title: {{position}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Department: {{department}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Reporting Manager: {{manager}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Start Date: {{joining_date}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Work Location: {{location}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Annual Salary: {{salary}}",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Please confirm your acceptance by replying to this letter before {{offer_expiry_date}}. We look forward to welcoming you to the {{company}} family.",
              size: 24,
            }),
          ],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Sincerely,",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{hr_name}}",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 50 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Human Resources",
              size: 22,
            }),
          ],
          spacing: { after: 50 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{company}}",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(templatesDir, 'offer_letter.docx');
  fs.writeFileSync(filePath, buffer);
  console.log('✅ Created offer_letter.docx template');
};

// Create Experience Certificate Template
const createCertificateTemplate = async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "{{company}}",
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{company_address}}",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "EXPERIENCE CERTIFICATE",
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "TO WHOM IT MAY CONCERN",
              bold: true,
              size: 26,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "This is to certify that {{name}} was employed with {{company}} from {{joining_date}} to {{last_working_day}}.",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Employment Details:",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Employee ID: {{employee_id}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Designation: {{position}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Department: {{department}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Reporting Manager: {{manager}}",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "During the tenure, {{name}} demonstrated excellent professional skills, dedication, and commitment to work. {{he_she}} was a valuable team member and contributed significantly to the department's objectives.",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "We wish {{name}} all the best for future endeavors.",
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "This certificate is issued upon the request of the employee.",
              size: 24,
            }),
          ],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Issued by:",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{hr_name}}",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 50 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Human Resources Manager",
              size: 22,
            }),
          ],
          spacing: { after: 50 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{company}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Date: {{date}}",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "[Official Company Seal]",
              italics: true,
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(templatesDir, 'certificate.docx');
  fs.writeFileSync(filePath, buffer);
  console.log('✅ Created certificate.docx template');
};

// Create Internship Certificate Template
const createInternshipCertificateTemplate = async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "{{company}}",
              bold: true,
              size: 32,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "INTERNSHIP COMPLETION CERTIFICATE",
              bold: true,
              size: 28,
              underline: {
                type: UnderlineType.SINGLE,
              },
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "This is to certify that",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{name}}",
              bold: true,
              size: 28,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "has successfully completed an internship program at {{company}} for a period of {{duration}} from {{start_date}} to {{end_date}}.",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Internship Details:",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Program: {{program_name}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Department: {{department}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Supervisor: {{supervisor}}",
              size: 22,
            }),
          ],
          spacing: { after: 100 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "• Performance Rating: {{performance_rating}}/5",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "We wish {{name}} success in all future endeavors.",
              size: 24,
            }),
          ],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Issued on: {{date}}",
              size: 22,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{supervisor_name}}",
              bold: true,
              size: 24,
            }),
          ],
          spacing: { after: 50 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{supervisor_title}}",
              size: 22,
            }),
          ],
          spacing: { after: 50 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "{{company}}",
              size: 22
