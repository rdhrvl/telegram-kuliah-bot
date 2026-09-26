import { keyboards } from './keyboards.js';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { formatSingleSchedule, escapeHtml } from '../utils/formatter.js';

export const deleteHandler = {
  // Start delete by listing user's schedules
  async start(ctx) {
    const chatId = ctx.chat.id;
    const schedules = scheduleRepo.getAllSchedules(chatId);

    if (!schedules || schedules.length === 0) {
      const msg = `ℹ️ <b>Belum ada jadwal yang tersimpan</b> untuk dihapus.`;
      if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(msg, { parse_mode: 'HTML' });
      }
      return;
    }

    const text = `❌ <b>Pilih Jadwal yang Ingin Dihapus:</b>`;
    const keyboard = keyboards.scheduleSelection(schedules, 'delete_select');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    }
  },

  // When user clicks a specific schedule to delete
  async onScheduleSelected(ctx, scheduleId) {
    await ctx.answerCbQuery();
    const schedule = scheduleRepo.getScheduleById(scheduleId);

    if (!schedule || String(schedule.chat_id) !== String(ctx.chat.id)) {
      await ctx.reply('⚠️ Jadwal tidak ditemukan atau sudah dihapus.');
      return;
    }

    let text = `⚠️ <b>Konfirmasi Hapus Jadwal</b>\n\n`;
    text += formatSingleSchedule(schedule);
    text += `\nApakah Anda yakin ingin menghapus jadwal ini secara permanen?`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...keyboards.confirmDelete(schedule.id)
    });
  },

  // When user confirms deletion
  async onConfirmDelete(ctx, scheduleId) {
    await ctx.answerCbQuery();
    const schedule = scheduleRepo.getScheduleById(scheduleId);
    const courseName = schedule ? schedule.course_name : 'Jadwal';

    const deleted = scheduleRepo.deleteSchedule(scheduleId, ctx.chat.id);

    if (deleted) {
      await ctx.editMessageText(
        `🗑️ <b>Jadwal ${escapeHtml(courseName)} berhasil dihapus!</b>`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.editMessageText(
        `⚠️ Gagal menghapus jadwal atau jadwal sudah tidak ada.`,
        { parse_mode: 'HTML' }
      );
    }
  }
};
