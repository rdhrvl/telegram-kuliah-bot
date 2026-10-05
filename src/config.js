import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  dbPath: process.env.DATABASE_PATH || path.resolve(__dirname, '../data/schedule.db'),
  // Secret used to encrypt saved portal passwords (falls back to BOT_TOKEN)
  credentialSecret: process.env.CREDENTIAL_SECRET || process.env.BOT_TOKEN || ''
};
