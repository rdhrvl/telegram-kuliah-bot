import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

// Ensure data folder exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    day TEXT NOT NULL,
    course_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT DEFAULT '',
    lecturer TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    chat_id TEXT PRIMARY KEY,
    morning_reminder_enabled INTEGER DEFAULT 1,
    morning_reminder_time TEXT DEFAULT '06:30',
    pre_class_reminder_enabled INTEGER DEFAULT 1,
    pre_class_reminder_mins INTEGER DEFAULT 15,
    timezone TEXT DEFAULT 'Asia/Jakarta'
  );

  CREATE TABLE IF NOT EXISTS reminder_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER,
    chat_id TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    sent_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_schedules_chat_day ON schedules(chat_id, day);
  CREATE INDEX IF NOT EXISTS idx_reminder_logs ON reminder_logs(chat_id, reminder_type, sent_date);
`);
