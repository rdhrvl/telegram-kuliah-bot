import { keyboards } from './keyboards.js';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { credentialRepo } from '../repositories/credentialRepo.js';
import { fetchJadwalFromPortal, parseScheduleTable } from '../services/portalService.js';
import { formatWeeklyScheduleList } from '../utils/formatter.js';

// Login to portal, scrape schedule and save it. Saves credentials on success.
async function runSync(ctx, npm, password, { fromSaved = false } = {}) {
  const statusMsg = await ctx.reply(
    `⏳ <b>Sedang menghubungkan ke portalmhs.unas.ac.id...</b>\n` +
    (fromSaved ? `👤 Menggunakan akun tersimpan: <code>${npm}</code>\n` : '') +
    `<i>Memverifikasi login dan menarik tabel jadwal kuliah...</i>`,
    { parse_mode: 'HTML' }
  );

  const edit = (text) => ctx.telegram.editMessageText(
    ctx.chat.id, statusMsg.message_id, null, text, { parse_mode: 'HTML' }
  );

  const result = await fetchJadwalFromPortal(npm, password);

  if (!result.success) {
    const tips = fromSaved
      ? `💡 <i>Login dengan akun tersimpan gagal. Jika password portal Anda sudah berubah, ketik /ganti_akun untuk memasukkan NPM & password baru.</i>`
      : `💡 <i>Tips: Pastikan NPM dan Password yang Anda masukkan sesuai dengan akun di portalmhs.unas.ac.id. Ketik /tarik_jadwal untuk mencoba lagi.</i>`;
    await edit(`❌ <b>Gagal Menarik Jadwal dari Portal:</b>\n\n${result.error}\n\n${tips}`);
    return;
  }

  // Login succeeded -> remember credentials so user doesn't need to re-enter them
  const isNewSave = !fromSaved;
  if (isNewSave) {
    credentialRepo.save(ctx.chat.id, npm, password);
  }
  const savedNote = isNewSave
    ? `\n\n🔐 <i>NPM & password Anda telah disimpan (terenkripsi). Selanjutnya cukup ketik /tarik_jadwal tanpa login ulang. Ketik /hapus_akun untuk menghapusnya.</i>`
    : '';

  if (!result.schedules || result.schedules.length === 0) {
    await edit(`ℹ️ <b>Login Berhasil</b>, namun tidak ditemukan data jadwal perkuliahan pada akun Anda di portal.` + savedNote);
    return;
  }

  scheduleRepo.replaceAllSchedules(ctx.chat.id, result.schedules);
  const saved = scheduleRepo.getAllSchedules(ctx.chat.id);

  await edit(
    `🎉 <b>Berhasil Menarik ${saved.length} Jadwal Perkuliahan dari Portal!</b>\n\n` +
    formatWeeklyScheduleList(saved) +
    `\n\n✅ <i>Seluruh jadwal di atas sudah aktif di pengingat harian & alarm sebelum kelas.</i>` +
    savedNote
  );
}

export const syncHandler = {
  // Start the portal sync: use saved credentials if available, otherwise ask for them
  async start(ctx) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }

    const creds = credentialRepo.get(ctx.chat.id);
    if (creds) {
      ctx.session = null;
      await runSync(ctx, creds.npm, creds.password, { fromSaved: true });
      return;
    }

    await syncHandler.askCredentials(ctx);
  },

  // Force re-entering credentials (/ganti_akun)
  async changeAccount(ctx) {
    await syncHandler.askCredentials(ctx);
  },

  // Delete saved credentials (/hapus_akun)
  async deleteAccount(ctx) {
    ctx.session = null;
    const removed = credentialRepo.remove(ctx.chat.id);
    await ctx.reply(
      removed
        ? '🗑️ <b>Akun portal tersimpan berhasil dihapus.</b>\nAnda perlu memasukkan NPM & password lagi saat /tarik_jadwal berikutnya.'
        : 'ℹ️ Tidak ada akun portal yang tersimpan.',
      { parse_mode: 'HTML', ...keyboards.mainMenu() }
    );
  },

  // Start the NPM/password input wizard
  async askCredentials(ctx) {
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

      // Perform login, scraping and save credentials on success
      await runSync(ctx, npm, password);
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
