// src/services/googleDrive.js - Servicio para acceder a archivos en Google Drive
const { google } = require('googleapis');
const path = require('path');
const config = require('../../config');
const logger = require('../lib/logger');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
  }

  /**
   * Inicializa el cliente de Google Drive
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const credentialsPath = path.resolve(
        process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './google-credentials.json'
      );

      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      logger.info('Google Drive service initialized');
    } catch (error) {
      logger.error('Failed to initialize Google Drive service:', error);
      throw new Error('Google Drive not configured');
    }
  }

  /**
   * Obtiene metadata de un archivo
   * @param {string} fileId - ID del archivo en Google Drive
   * @returns {Promise<Object>} Metadata del archivo
   */
  async getFileMetadata(fileId) {
    await this.initialize();

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink'
      });

      return response.data;
    } catch (error) {
      logger.error(`Error getting file metadata for ${fileId}:`, error.message);

      if (error.code === 404) {
        throw new Error('File not found in Google Drive');
      } else if (error.code === 403) {
        throw new Error('No permission to access file');
      }

      throw error;
    }
  }

  /**
   * Descarga un archivo como stream
   * @param {string} fileId - ID del archivo en Google Drive
   * @returns {Promise<ReadableStream>} Stream del archivo
   */
  async getFileStream(fileId) {
    await this.initialize();

    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return response.data;
    } catch (error) {
      logger.error(`Error downloading file ${fileId}:`, error.message);

      if (error.code === 404) {
        throw new Error('File not found in Google Drive');
      } else if (error.code === 403) {
        throw new Error('No permission to access file');
      }

      throw error;
    }
  }

  /**
   * Genera URL pública temporal (requiere que el archivo sea público)
   * @param {string} fileId - ID del archivo
   * @returns {string} URL pública
   */
  getPublicUrl(fileId) {
    // URL directa para descargar (requiere que el archivo sea público)
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
  }

  /**
   * Genera URL de visualización
   * @param {string} fileId - ID del archivo
   * @returns {string} URL de visualización
   */
  getViewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  /**
   * Extrae el fileId de una URL gdrive://
   * @param {string} url - URL en formato gdrive://FILE_ID
   * @returns {string|null} File ID o null si no es válido
   */
  extractFileId(url) {
    if (!url) return null;

    // Formato: gdrive://FILE_ID
    if (url.startsWith('gdrive://')) {
      return url.replace('gdrive://', '');
    }

    // También acepta URLs directas de Drive
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  }
}

// Singleton
const googleDriveService = new GoogleDriveService();

module.exports = googleDriveService;
