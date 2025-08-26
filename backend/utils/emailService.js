const nodemailer = require('nodemailer');

// Create transporter with dummy configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
});

/**
 * Send email with document attachment
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {Buffer} attachment - Document buffer
 * @param {string} filename - Attachment filename
 * @returns {Promise} - Email send result
 */
const sendDocumentEmail = async (to, subject, text, attachment, filename) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@docgen.com',
      to: to,
      subject: subject,
      text: text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Document Generated - DocGen Mongo
          </h2>
          <p style="color: #555; line-height: 1.6;">
            ${text}
          </p>
          <p style="color: #555;">
            Please find your document attached to this email.
          </p>
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              This is an automated email from DocGen Mongo system. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: filename,
          content: attachment,
          contentType: filename.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      ]
    };

    // In development, just log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent:', {
        to,
        subject,
        filename,
        attachmentSize: attachment.length
      });
      return { messageId: 'dev-mode-' + Date.now() };
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', result.messageId);
    return result;

  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

/**
 * Send bulk notification email
 * @param {string} to - Recipient email
 * @param {number} count - Number of documents generated
 * @param {string} templateType - Type of template used
 * @returns {Promise} - Email send result
 */
const sendBulkNotification = async (to, count, templateType) => {
  try {
    const subject = `Bulk Document Generation Complete - ${count} ${templateType}s Generated`;
    const text = `Your bulk document generation request has been completed successfully. ${count} ${templateType} documents have been generated.`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@docgen.com',
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
            ✅ Bulk Generation Complete
          </h2>
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 10px 0;">Generation Summary</h3>
            <p style="color: #155724; margin: 5px 0;"><strong>Documents Generated:</strong> ${count}</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Template Type:</strong> ${templateType}</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Status:</strong> Completed Successfully</p>
          </div>
          <p style="color: #555; line-height: 1.6;">
            All documents have been generated and are available in your dashboard. 
            You can download them individually or as a bulk zip file.
          </p>
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              This is an automated email from DocGen Mongo system. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    // In development, just log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Bulk notification email would be sent:', {
        to,
        subject,
        count,
        templateType
      });
      return { messageId: 'dev-mode-bulk-' + Date.now() };
    }

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Bulk notification sent:', result.messageId);
    return result;

  } catch (error) {
    console.error('❌ Bulk notification failed:', error);
    throw new Error('Failed to send bulk notification: ' + error.message);
  }
};

/**
 * Verify email configuration
 * @returns {Promise<boolean>} - Configuration validity
 */
const verifyEmailConfig = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email service running in development mode');
      return true;
    }
    
    await transporter.verify();
    console.log('📧 Email service configured successfully');
    return true;
  } catch (error) {
    console.error('❌ Email configuration failed:', error.message);
    return false;
  }
};

module.exports = {
  sendDocumentEmail,
  sendBulkNotification,
  verifyEmailConfig
};
