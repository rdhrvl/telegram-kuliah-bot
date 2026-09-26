import { Markup } from 'telegraf';
import { keyboards } from './keyboards.js';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { isValidTimeFormat } from '../utils/dateTime.js';

export const settingsHandler = {
  // Show settings menu
  async showSettings(ctx) {
    const chatId = ctx.chat.id;
    const settings = scheduleRepo.getUserSettings(chatId);

    const text = `⚙️ <b>Pengaturan Notifikasi & Pengingat</b>\n\n` +
      `🌅 <b>Pengingat Pagi:</b> ${settings.morning_reminder_enabled ? '✅ Aktif' : '❌ Nonaktif'}\n` +
      `⏰ <b>Jam Pengingat Pagi:</b> <code>${settings.morning_reminder_time}</code>\n` +
      `🔔 <b>Pengingat Sebelum Kelas:</b> ${settings.pre_class_reminder_enabled ? '✅ Aktif' : '❌ Nonaktif'}\n` +
      `⏱️ <b>Waktu Peringatan:</b> ${settings.pre_class_reminder_mins} menit sebelum kelas\n` +
      `🌍 <b>Zona Waktu:</b> <code>${settings.timezone}</code>\n\n` +
      `<i>Gunakan tombol di bawah untuk mengubah setelan:</i>`;

    const kb = keyboards.settingsMenu(settings);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...kb });
    }
  },

  // Toggle morning reminder
  async toggleMorning(ctx) {
    await ctx.answerCbQuery();
    const current = scheduleRepo.getUserSettings(ctx.chat.id);
    const newStatus = current.morning_reminder_enabled ? 0 : 1;
    scheduleRepo.updateUserSettings(ctx.chat.id, { morningReminderEnabled: newStatus });
    await this.showSettings(ctx);
  },

  // Toggle pre-class alert
  async togglePreClass(ctx) {
    await ctx.answerCbQuery();
    const current = scheduleRepo.getUserSettings(ctx.chat.id);
    const newStatus = current.pre_class_reminder_enabled ? 0 : 1;
    scheduleRepo.updateUserSettings(ctx.chat.id, { preClassReminderEnabled: newStatus });
    await this.showSettings(ctx);
  },

  // Prompt set morning time
  async promptMorningTime(ctx) {
    await ctx.answerCbQuery();
    ctx.session = { action: 'settings', step: 'SET_MORNING_TIME' };

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('06:00', 'morning_time_preset:06:00'),
        Markup.button.callback('06:30', 'morning_time_preset:06:30'),
        Markup.button.callback('07:00', 'morning_time_preset:07:00')
      ],
      [
        Markup.button.callback('07:30', 'morning_time_preset:07:30'),
        Markup.button.callback('08:00', 'morning_time_preset:08:00')
      ],
      [
        Markup.button.callback('❌ Batal', 'cancel_action')
      ]
    ]);

    await ctx.editMessageText(
      `⏰ <b>Pilih atau Ketik Jam Pengingat Pagi</b>\n\nPilih dari opsi cepat berikut atau ketik jam secara langsung (format: <code>HH:mm</code>, contoh: <code>06:45</code>):`,
      { parse_mode: 'HTML', ...buttons }
    );
  },

  // Apply morning time preset
  async applyMorningTimePreset(ctx, timeStr) {
    await ctx.answerCbQuery();
    scheduleRepo.updateUserSettings(ctx.chat.id, { morningReminderTime: timeStr });
    ctx.session = null;
    await this.showSettings(ctx);
  },

  // Prompt pre-class minutes
  async promptPreClassMins(ctx) {
    await ctx.answerCbQuery();
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('10 Menit', 'preclass_preset:10'),
        Markup.button.callback('15 Menit', 'preclass_preset:15')
      ],
      [
        Markup.button.callback('30 Menit', 'preclass_preset:30'),
        Markup.button.callback('60 Menit', 'preclass_preset:60')
      ],
      [
        Markup.button.callback('❌ Batal', 'cancel_action')
      ]
    ]);

    await ctx.editMessageText(
      `⏱️ <b>Pilih Berapa Menit Sebelum Kelas Dimulai untuk Mengirim Notifikasi:</b>`,
      { parse_mode: 'HTML', ...buttons }
    );
  },

  // Apply pre-class minutes preset
  async applyPreClassPreset(ctx, mins) {
    await ctx.answerCbQuery();
    scheduleRepo.updateUserSettings(ctx.chat.id, { preClassReminderMins: Number(mins) });
    ctx.session = null;
    await this.showSettings(ctx);
  },

  // Confirm reset to default
  async confirmResetDefault(ctx) {
    await ctx.answerCbQuery();
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('⚠️ Ya, Muat Ulang Jadwal Default', 'do_reset_default')
      ],
      [
        Markup.button.callback('❌ Batal', 'cancel_action')
      ]
    ]);

    await ctx.editMessageText(
      `⚠️ <b>Konfirmasi Muat Jadwal Default</b>\n\n` +
      `Tindakan ini akan mengganti seluruh jadwal Anda dengan <b>Jadwal Kuliah Default (Teknik Elektro)</b>:\n` +
      `• Fisika Dasar I (Senin)\n` +
      `• Material Teknik Elektro (Senin)\n` +
      `• Kimia Dasar (Selasa)\n` +
      `• Pengantar TIK & Rangkaian Listrik I (Rabu)\n` +
      `• Matematika Diskrit (Kamis)\n` +
      `• Kalkulus I & Praktikum Rangkaian Listrik (Jumat)\n\n` +
      `Apakah Anda yakin?`,
      { parse_mode: 'HTML', ...buttons }
    );
  },

  // Execute reset to default
  async executeResetDefault(ctx) {
    await ctx.answerCbQuery('Jadwal berhasil di-reset!');
    scheduleRepo.resetToDefaultSchedules(ctx.chat.id);
    await ctx.editMessageText(
      `✅ <b>Jadwal kuliah default berhasil dimuat!</b>\n\nSilakan tekan menu <b>📋 Semua Jadwal</b> untuk melihat daftar lengkapnya.`,
      { parse_mode: 'HTML' }
    );
  },

  // Handle custom text input for settings
  async processStep(ctx, text) {
    const session = ctx.session;
    if (!session || session.action !== 'settings') return false;

    const trimmed = text.trim();

    if (session.step === 'SET_MORNING_TIME') {
      let timeVal = trimmed;
      if (timeVal.length === 4 && timeVal[1] === ':') timeVal = '0' + timeVal;

      if (!isValidTimeFormat(timeVal)) {
        await ctx.reply(
          `⚠️ Format jam tidak valid. Harap gunakan format <code>HH:mm</code> (contoh: <code>06:30</code> atau <code>07:00</code>):`,
          { parse_mode: 'HTML', ...keyboards.cancelButton() }
        );
        return true;
      }

      scheduleRepo.updateUserSettings(ctx.chat.id, { morningReminderTime: timeVal });
      ctx.session = null;

      await ctx.reply(`✅ <b>Jam pengingat pagi berhasil diubah menjadi ${timeVal}!</b>`, {
        parse_mode: 'HTML'
      });
      await this.showSettings(ctx);
      return true;
    }

    return false;
  }
};
