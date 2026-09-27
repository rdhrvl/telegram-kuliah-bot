import { keyboards } from './keyboards.js';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { fetchJadwalFromPortal, parseScheduleTable } from '../services/portalService.js';
import { formatWeeklyScheduleList } from '../utils/formatter.js';

export const syncHandler = {
  // Start the portal sync wizard
  async start(ctx) {
    ctx.session = {
      action: 'sync_portal',
      step: 'INPUT_NPM',
      data: {}
    };

    const text = `🌐 <b>Tarik Jadwal dari Portal Mahasiswa UNAS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Bot ini akan menyinkronkan jadwal kuliah Anda langsung dari <code>portalmhs.unas.ac.id</code>.\n\n` +
      `Silakan masukkan <b>NPM</b> Anda:\n` +
      `<i>(Contoh: 247006516001)</i>`;

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboards.cancelButton() });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...keyboards.cancelButton() });
    }
  },

  // Process text step
  async processStep(ctx, text) {
    const session = ctx.session;
    if (!session || session.action !== 'sync_portal') return false;

    const trimmed = text.trim();

    if (session.step === 'INPUT_NPM') {
      if (!trimmed || trimmed.length < 5) {
        await ctx.reply('⚠️ Format NPM tidak valid. Silakan masukkan NPM Anda dengan benar:');
        return true;
      }

      session.data.npm = trimmed;
      session.step = 'INPUT_PASSWORD';

      await ctx.reply(
        `NPM: <code>${trimmed}</code>\n\n` +
        `Sekarang masukkan <b>Password</b> portal mahasiswa Anda:\n\n` +
        `🔒 <i>Catatan Keamanan: Demi menjaga privasi Anda, pesan yang berisi password ini akan segera dihapus otomatis dari riwayat obrolan setelah login diproses.</i>`,
        { parse_mode: 'HTML', ...keyboards.cancelButton() }
      );
      return true;
    }

    if (session.step === 'INPUT_PASSWORD') {
      const npm = session.data.npm;
      const password = trimmed;

      // Immediately delete user's message containing password for privacy
      try {
        await ctx.deleteMessage();
      } catch (delErr) {
        // Silently continue if bot doesn't have delete permission
      }

      // Clear session immediately
      ctx.session = null;

      // Send loading status
      const statusMsg = await ctx.reply(
        `⏳ <b>Sedang menghubungkan ke portalmhs.unas.ac.id...</b>\n` +
        `<i>Memverifikasi login dan menarik tabel jadwal kuliah...</i>`,
        { parse_mode: 'HTML' }
      );

      // Perform login and scraping
      const result = await fetchJadwalFromPortal(npm, password);

      if (!result.success) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          null,
          `❌ <b>Gagal Menarik Jadwal dari Portal:</b>\n\n` +
          `${result.error}\n\n` +
          `💡 <i>Tips: Pastikan NPM dan Password yang Anda masukkan sesuai dengan akun di portalmhs.unas.ac.id. Ketik /tarik_jadwal untuk mencoba lagi.</i>`,
          { parse_mode: 'HTML' }
        );
        return true;
      }

      if (!result.schedules || result.schedules.length === 0) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          null,
          `ℹ️ <b>Login Berhasil</b>, namun tidak ditemukan data jadwal perkuliahan pada akun Anda di portal.`,
          { parse_mode: 'HTML' }
        );
        return true;
      }

      // Save schedules to database
      scheduleRepo.replaceAllSchedules(ctx.chat.id, result.schedules);
      const saved = scheduleRepo.getAllSchedules(ctx.chat.id);

      const summaryText = `🎉 <b>Berhasil Menarik ${saved.length} Jadwal Perkuliahan dari Portal!</b>\n\n` +
        formatWeeklyScheduleList(saved) +
        `\n\n✅ <i>Seluruh jadwal di atas sudah aktif di pengingat harian & alarm sebelum kelas.</i>`;

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        null,
        summaryText,
        { parse_mode: 'HTML' }
      );

      return true;
    }

    return false;
  },

  // Handle direct HTML input (e.g. user sends HTML snippet or file)
  async handleDirectHtml(ctx, htmlContent) {
    const schedules = parseScheduleTable(htmlContent);
    if (!schedules || schedules.length === 0) {
      return false;
    }

    scheduleRepo.replaceAllSchedules(ctx.chat.id, schedules);
    const saved = scheduleRepo.getAllSchedules(ctx.chat.id);

    const summaryText = `📥 <b>Berhasil Mengimpor ${saved.length} Jadwal Perkuliahan dari HTML!</b>\n\n` +
      formatWeeklyScheduleList(saved) +
      `\n\n✅ <i>Jadwal sudah disimpan dan aktif di pengingat otomatis Anda.</i>`;

    await ctx.reply(summaryText, { parse_mode: 'HTML', ...keyboards.mainMenu() });
    return true;
  }
};
