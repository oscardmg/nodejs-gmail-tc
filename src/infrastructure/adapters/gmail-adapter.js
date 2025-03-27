import { google } from 'googleapis';
import { EmailPort } from '../../domain/ports/email-port.js';
import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { Logger } from '../logging/logger.js';
import { ExpenseRepository } from '../../domain/ports/expense-repository.js';
import { ConfigService } from '../config/config-service.js';


// add scope to mark read message
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), './token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), './credentials.json');

export class GmailAdapter extends EmailPort {
  /**
   *
   * @param {ConfigService} config
   * @param {Logger} logger
   * @param {ExpenseRepository} repository
   */
  constructor(config, logger, repository) {
    super();
    this.config = config;
    this.logger = logger;
    this.repository = repository;
  }

  async authorize() {
    let client = await this.loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await this.saveCredentials(client);
    }
    return client;
  }

  async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  }

  async fetchNewEmails() {
    try {
      this.logger.info('Iniciando conexión con Gmail');

      const auth = await this.authorize();

      const gmail = google.gmail({ version: 'v1', auth });

      let nextPageToken = null;
      const emails = [];
      // do {
        // Buscar emails con el asunto "DAVIVIENDA"
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'subject:DAVIVIENDA is:unread',
          pageToken: nextPageToken,
          maxResults: 50,
        });

        const messages = response.data.messages || [];
        this.logger.info(
          `Se encontraron ${messages.length} mensajes nuevos con asunto DAVIVIENDA`
        );

        nextPageToken = response.data.nextPageToken;

        // Obtener el contenido de cada email
        for (const message of messages) {
          // get row from expense repository by email_id
          const expense = await this.repository.getExpenseByEmailId(message.id);
          if (expense) {
            await this.markEmailAsRead(gmail, message);
            this.logger.warn(
              `El gasto con email ID: ${message.id} ya existe en la base de datos`
            );
            continue;
          }

          const emailData = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
          });

          // Extraer el contenido del email
          const payload = emailData.data.payload;
          let content = '';

          // La estructura puede ser compleja, esto es una simplificación
          if (payload.body.data) {
            // Contenido simple
            content = Buffer.from(payload.body.data, 'base64').toString(
              'utf-8'
            );
          } else if (payload.parts) {
            // Email con partes múltiples
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body.data) {
                content = Buffer.from(part.body.data, 'base64').toString(
                  'utf-8'
                );
                break;
              }
            }
          }



          emails.push({
            id: message.id,
            content: content,
          });

          // Opcional: marcar como leído después de procesarlo
          await this.markEmailAsRead(gmail, message);
        }
      // } while (nextPageToken);

      return emails;
    } catch (error) {
      this.logger.error(`Error obteniendo emails de Gmail: ${error.message}`);
      throw error;
    }
  }

  async markEmailAsRead (gmail, message) {
    this.logger.info(`Marcando email como leído: ${message.id}`);
    
    await gmail.users.messages.modify({
      userId: 'me',
      id: message.id,
      requestBody: {
        removeLabelIds: ['UNREAD', 'INBOX']
      }
    });
  }
}
