import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

 export class ConfigService {
  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Cargar variables de entorno desde .env
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  }
  
  getGmailConfig() {
    return {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      redirectUri: process.env.GMAIL_REDIRECT_URI,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN
    };
  }
  
  getDatabaseConfig() {
    return {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10)
    };
  }
}


