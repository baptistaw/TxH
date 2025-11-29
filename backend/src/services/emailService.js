// backend/src/services/emailService.js
/**
 * Email Service
 * Handles email sending for PDF distribution
 */

const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../lib/logger');

/**
 * Create email transporter
 */
function createTransporter() {
  // If no email config, return mock transporter for development
  if (!config.email?.host) {
    logger.warn('No email configuration found, using mock transporter');
    return {
      sendMail: async (mailOptions) => {
        logger.info('Mock email sent:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
        });
        return { messageId: 'mock-' + Date.now() };
      },
    };
  }

  return nodemailer.createTransporter({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
}

/**
 * Send PDF report via email
 * @param {Object} options - Email options
 * @param {string[]} options.recipients - Email addresses
 * @param {string} options.subject - Email subject
 * @param {Buffer} options.pdfBuffer - PDF file buffer
 * @param {string} options.filename - PDF filename
 * @param {Object} options.caseInfo - Case information for email body
 */
async function sendPDFReport({ recipients, subject, pdfBuffer, filename, caseInfo }) {
  try {
    const transporter = createTransporter();

    // Build email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Reporte de Trasplante Hepático</h2>

        <p>Se adjunta el reporte completo del trasplante hepático:</p>

        <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #4299e1; margin: 20px 0;">
          <p><strong>Paciente:</strong> ${caseInfo.patientName}</p>
          <p><strong>CI:</strong> ${caseInfo.patientCI}</p>
          <p><strong>Fecha Trasplante:</strong> ${caseInfo.transplantDate}</p>
          ${caseInfo.duration ? `<p><strong>Duración:</strong> ${caseInfo.duration}</p>` : ''}
        </div>

        <p style="color: #718096; font-size: 14px; margin-top: 30px;">
          Este reporte ha sido generado automáticamente por el Sistema de Registro de Trasplante Hepático.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

        <p style="color: #a0aec0; font-size: 12px;">
          <strong>Programa Nacional de Trasplante Hepático</strong><br>
          Unidad Bi-Institucional
        </p>
      </div>
    `;

    const mailOptions = {
      from: config.email?.from || 'noreply@txh-registro.uy',
      to: recipients.join(', '),
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully:', {
      messageId: info.messageId,
      recipients: recipients.length,
      filename: filename,
    });

    return {
      success: true,
      messageId: info.messageId,
      recipients: recipients.length,
    };
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Get default distribution list for transplant reports
 */
function getDefaultDistributionList() {
  // This can be configured in environment variables or database
  return config.email?.distributionList || [
    // Default recipients - should be configured via environment
    'anestesia@txh.uy',
  ];
}

module.exports = {
  sendPDFReport,
  getDefaultDistributionList,
};
