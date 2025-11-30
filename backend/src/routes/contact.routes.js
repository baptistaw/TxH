// src/routes/contact.routes.js
const express = require('express');
const router = express.Router();
const { sendPDFReport } = require('../services/emailService');
const logger = require('../lib/logger');
const config = require('../../config');

/**
 * POST /api/contact
 * Recibe formulario de contacto y envía email
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, institution, country, message } = req.body;

    // Validación básica
    if (!name || !email || !institution) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: name, email, institution',
      });
    }

    // Email de destino (admin)
    const adminEmail = config.email?.from || 'contacto@anestrasplante.org';

    // Construir el cuerpo del email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #14b8a6; border-bottom: 2px solid #14b8a6; padding-bottom: 10px;">
          Nueva solicitud de contacto - anestrasplante.org
        </h2>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Datos del contacto:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>Nombre:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">
                <a href="mailto:${email}" style="color: #14b8a6;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Institución:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${institution}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>País:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${country || 'No especificado'}</td>
            </tr>
          </table>
        </div>

        ${message ? `
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Mensaje:</h3>
          <p style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

        <p style="color: #94a3b8; font-size: 12px;">
          Este mensaje fue enviado desde el formulario de contacto de anestrasplante.org
          <br>
          Fecha: ${new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' })}
        </p>
      </div>
    `;

    // Usar nodemailer directamente para este caso
    const nodemailer = require('nodemailer');

    // Crear transporter
    let transporter;
    if (!config.email?.host) {
      // Mock en desarrollo
      logger.info('Email de contacto (mock):', { name, email, institution, country });
      return res.json({
        success: true,
        message: 'Mensaje recibido (modo desarrollo)',
      });
    }

    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });

    // Enviar email
    const mailOptions = {
      from: config.email.from,
      to: adminEmail,
      replyTo: email,
      subject: `[Contacto] ${name} - ${institution}`,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email de contacto enviado:', {
      messageId: info.messageId,
      from: email,
      institution,
    });

    res.json({
      success: true,
      message: 'Mensaje enviado correctamente',
    });
  } catch (error) {
    logger.error('Error al enviar email de contacto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el mensaje',
    });
  }
});

module.exports = router;
