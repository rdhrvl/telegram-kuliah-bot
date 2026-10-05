import crypto from 'crypto';
import { db } from '../database.js';
import { config } from '../config.js';

const ALGO = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(String(config.credentialSecret)).digest();

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join(':');
}

function decrypt(payload) {
  const [iv, tag, enc] = payload.split(':').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export const credentialRepo = {
  // Save (or update) portal credentials for a chat
  save(chatId, npm, password) {
    db.prepare(`
      INSERT INTO portal_credentials (chat_id, npm, password_enc, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(chat_id) DO UPDATE SET
        npm = excluded.npm,
        password_enc = excluded.password_enc,
        updated_at = CURRENT_TIMESTAMP
    `).run(String(chatId), npm, encrypt(password));
  },

  // Returns { npm, password } or null (also null if decryption fails, e.g. secret changed)
  get(chatId) {
    const row = db.prepare(`SELECT npm, password_enc FROM portal_credentials WHERE chat_id = ?`).get(String(chatId));
    if (!row) return null;
    try {
      return { npm: row.npm, password: decrypt(row.password_enc) };
    } catch {
      this.remove(chatId);
      return null;
    }
  },

  remove(chatId) {
    const res = db.prepare(`DELETE FROM portal_credentials WHERE chat_id = ?`).run(String(chatId));
    return res.changes > 0;
  }
};
