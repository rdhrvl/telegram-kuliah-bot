import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { getTodayDayName, getTomorrowDayName } from '../utils/dateTime.js';
import { formatDayScheduleList, formatWeeklyScheduleList } from '../utils/formatter.js';

export const viewHandler = {
  // Show today's schedule
  async handleToday(ctx) {
    const chatId = ctx.chat.id;
    const settings = scheduleRepo.getUserSettings(chatId);
    const todayName = getTodayDayName(settings.timezone);
    const schedules = scheduleRepo.getSchedulesByDay(chatId, todayName);

    const message = formatDayScheduleList(todayName, schedules);
    await ctx.reply(message, { parse_mode: 'HTML' });
  },

  // Show tomorrow's schedule
  async handleTomorrow(ctx) {
    const chatId = ctx.chat.id;
    const settings = scheduleRepo.getUserSettings(chatId);
    const tomorrowName = getTomorrowDayName(settings.timezone);
    const schedules = scheduleRepo.getSchedulesByDay(chatId, tomorrowName);

    const message = formatDayScheduleList(tomorrowName, schedules);
    await ctx.reply(message, { parse_mode: 'HTML' });
  },

  // Show weekly schedule
  async handleWeekly(ctx) {
    const chatId = ctx.chat.id;
    const schedules = scheduleRepo.getAllSchedules(chatId);

    const message = formatWeeklyScheduleList(schedules);
    await ctx.reply(message, { parse_mode: 'HTML' });
  }
};
