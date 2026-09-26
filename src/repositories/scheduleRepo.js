import { db } from '../database.js';
import { DAYS_OF_WEEK } from '../utils/dateTime.js';

export const scheduleRepo = {
  // Add a new schedule
  addSchedule({ chatId, day, courseName, startTime, endTime, room = '', lecturer = '' }) {
    const stmt = db.prepare(`
      INSERT INTO schedules (chat_id, day, course_name, start_time, end_time, room, lecturer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      String(chatId),
      day.trim(),
      courseName.trim(),
      startTime.trim(),
      endTime.trim(),
      room.trim(),
      lecturer.trim()
    );
    return result.lastInsertRowid;
  },

  // Get schedules for a specific day
  getSchedulesByDay(chatId, day) {
    const stmt = db.prepare(`
      SELECT * FROM schedules
      WHERE chat_id = ? AND day = ?
      ORDER BY start_time ASC
    `);
    return stmt.all(String(chatId), day);
  },

  // Get all schedules grouped / sorted
  getAllSchedules(chatId) {
    const stmt = db.prepare(`
      SELECT * FROM schedules
      WHERE chat_id = ?
      ORDER BY start_time ASC
    `);
    const all = stmt.all(String(chatId));

    // Sort by standard day order
    all.sort((a, b) => {
      const idxA = DAYS_OF_WEEK.indexOf(a.day);
      const idxB = DAYS_OF_WEEK.indexOf(b.day);
      if (idxA !== idxB) return idxA - idxB;
      return a.start_time.localeCompare(b.start_time);
    });

    return all;
  },

  // Get a single schedule by ID
  getScheduleById(id) {
    const stmt = db.prepare(`SELECT * FROM schedules WHERE id = ?`);
    return stmt.get(Number(id));
  },

  // Update schedule
  updateSchedule(id, { day, courseName, startTime, endTime, room, lecturer }) {
    const existing = this.getScheduleById(id);
    if (!existing) return false;

    const stmt = db.prepare(`
      UPDATE schedules
      SET day = ?,
          course_name = ?,
          start_time = ?,
          end_time = ?,
          room = ?,
          lecturer = ?
      WHERE id = ?
    `);

    stmt.run(
      day !== undefined ? day : existing.day,
      courseName !== undefined ? courseName : existing.course_name,
      startTime !== undefined ? startTime : existing.start_time,
      endTime !== undefined ? endTime : existing.end_time,
      room !== undefined ? room : existing.room,
      lecturer !== undefined ? lecturer : existing.lecturer,
      Number(id)
    );
    return true;
  },

  // Delete schedule
  deleteSchedule(id, chatId) {
    const stmt = db.prepare(`DELETE FROM schedules WHERE id = ? AND chat_id = ?`);
    const res = stmt.run(Number(id), String(chatId));
    return res.changes > 0;
  },

  // Get or initialize user settings
  getUserSettings(chatId) {
    const cid = String(chatId);
    let stmt = db.prepare(`SELECT * FROM user_settings WHERE chat_id = ?`);
    let settings = stmt.get(cid);

    if (!settings) {
      const insert = db.prepare(`
        INSERT INTO user_settings (chat_id, morning_reminder_enabled, morning_reminder_time, pre_class_reminder_enabled, pre_class_reminder_mins, timezone)
        VALUES (?, 1, '06:30', 1, 15, 'Asia/Jakarta')
      `);
      insert.run(cid);
      settings = stmt.get(cid);
    }
    return settings;
  },

  // Update user settings
  updateUserSettings(chatId, { morningReminderEnabled, morningReminderTime, preClassReminderEnabled, preClassReminderMins, timezone }) {
    const current = this.getUserSettings(chatId);
    const stmt = db.prepare(`
      UPDATE user_settings
      SET morning_reminder_enabled = ?,
          morning_reminder_time = ?,
          pre_class_reminder_enabled = ?,
          pre_class_reminder_mins = ?,
          timezone = ?
      WHERE chat_id = ?
    `);

    stmt.run(
      morningReminderEnabled !== undefined ? (morningReminderEnabled ? 1 : 0) : current.morning_reminder_enabled,
      morningReminderTime !== undefined ? morningReminderTime : current.morning_reminder_time,
      preClassReminderEnabled !== undefined ? (preClassReminderEnabled ? 1 : 0) : current.pre_class_reminder_enabled,
      preClassReminderMins !== undefined ? Number(preClassReminderMins) : current.pre_class_reminder_mins,
      timezone !== undefined ? timezone : current.timezone,
      String(chatId)
    );
    return this.getUserSettings(chatId);
  },

  // Get all active users
  getAllUsersWithSettings() {
    const stmt = db.prepare(`SELECT * FROM user_settings`);
    return stmt.all();
  },

  // Check if reminder was already sent today
  hasReminderBeenSent(chatId, scheduleId, reminderType, sentDate) {
    const stmt = db.prepare(`
      SELECT id FROM reminder_logs
      WHERE chat_id = ? AND (schedule_id = ? OR (schedule_id IS NULL AND ? IS NULL))
        AND reminder_type = ? AND sent_date = ?
    `);
    const row = stmt.get(String(chatId), scheduleId ?? null, scheduleId ?? null, reminderType, sentDate);
    return !!row;
  },

  // Log reminder sent
  logReminderSent(chatId, scheduleId, reminderType, sentDate) {
    const stmt = db.prepare(`
      INSERT INTO reminder_logs (chat_id, schedule_id, reminder_type, sent_date)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(String(chatId), scheduleId ?? null, reminderType, sentDate);
  },

  // Cleanup old reminder logs (older than 7 days)
  cleanupOldLogs() {
    db.exec(`DELETE FROM reminder_logs WHERE created_at < datetime('now', '-7 days')`);
  }
};
