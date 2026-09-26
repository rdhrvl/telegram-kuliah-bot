import cron from 'node-cron';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import {
  getTodayDayName,
  getCurrentDateStr,
  getCurrentTimeStr,
  getMinutesDifference
} from '../utils/dateTime.js';
import { formatMorningBriefing, formatPreClassAlert } from '../utils/formatter.js';

export const reminderService = {
  cronTask: null,

  start(bot) {
    console.log('⏰ Reminder service started (checking every minute)...');

    // Run every minute
    this.cronTask = cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndSendReminders(bot);
      } catch (err) {
        console.error('Error during reminder check:', err);
      }
    });

    // Cleanup old logs every day at 03:00 AM
    cron.schedule('0 3 * * *', () => {
      try {
        scheduleRepo.cleanupOldLogs();
      } catch (err) {
        console.error('Error cleaning up logs:', err);
      }
    });
  },

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('⏰ Reminder service stopped.');
    }
  },

  async checkAndSendReminders(bot) {
    const users = scheduleRepo.getAllUsersWithSettings();
    if (!users || users.length === 0) return;

    for (const user of users) {
      const tz = user.timezone || 'Asia/Jakarta';
      const todayDate = getCurrentDateStr(tz);
      const currentTime = getCurrentTimeStr(tz);
      const todayName = getTodayDayName(tz);

      // 1. Check Morning Briefing
      if (user.morning_reminder_enabled && currentTime === user.morning_reminder_time) {
        const alreadySent = scheduleRepo.hasReminderBeenSent(user.chat_id, null, 'morning', todayDate);
        if (!alreadySent) {
          try {
            const todaySchedules = scheduleRepo.getSchedulesByDay(user.chat_id, todayName);
            const msg = formatMorningBriefing(todayName, todaySchedules);
            await bot.telegram.sendMessage(user.chat_id, msg, { parse_mode: 'HTML' });
            scheduleRepo.logReminderSent(user.chat_id, null, 'morning', todayDate);
            console.log(`[Reminder] Sent morning briefing to ${user.chat_id}`);
          } catch (sendErr) {
            console.error(`Failed to send morning briefing to ${user.chat_id}:`, sendErr.message);
          }
        }
      }

      // 2. Check Pre-Class Alert
      if (user.pre_class_reminder_enabled) {
        const todaySchedules = scheduleRepo.getSchedulesByDay(user.chat_id, todayName);
        const alertThresholdMins = user.pre_class_reminder_mins || 15;

        for (const schedule of todaySchedules) {
          const diffMinutes = getMinutesDifference(currentTime, schedule.start_time);

          // Trigger if remaining time is between 1 and the configured threshold (e.g. 15 mins)
          if (diffMinutes >= 0 && diffMinutes <= alertThresholdMins) {
            const alreadySent = scheduleRepo.hasReminderBeenSent(
              user.chat_id,
              schedule.id,
              'pre_class',
              todayDate
            );

            if (!alreadySent) {
              try {
                const msg = formatPreClassAlert(schedule, diffMinutes === 0 ? 'kurang dari 1' : diffMinutes);
                await bot.telegram.sendMessage(user.chat_id, msg, { parse_mode: 'HTML' });
                scheduleRepo.logReminderSent(
                  user.chat_id,
                  schedule.id,
                  'pre_class',
                  todayDate
                );
                console.log(`[Reminder] Sent pre-class alert for ${schedule.course_name} to ${user.chat_id}`);
              } catch (sendErr) {
                console.error(`Failed to send pre-class alert for schedule ${schedule.id} to ${user.chat_id}:`, sendErr.message);
              }
            }
          }
        }
      }
    }
  }
};
