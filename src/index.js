import { Telegraf, session } from 'telegraf';
import { config } from './config.js';
import { keyboards } from './handlers/keyboards.js';
import { viewHandler } from './handlers/viewHandler.js';
import { createHandler } from './handlers/createHandler.js';
import { editHandler } from './handlers/editHandler.js';
import { deleteHandler } from './handlers/deleteHandler.js';
import { settingsHandler } from './handlers/settingsHandler.js';
import { syncHandler } from './handlers/syncHandler.js';
import { reminderService } from './services/reminderService.js';
import { scheduleRepo } from './repositories/scheduleRepo.js';

if (!config.botToken || config.botToken === 'your_telegram_bot_token_here') {
  console.error('\n❌ ERROR: BOT_TOKEN belum disetel di file .env!');
  console.error('Silakan buka file .env dan masukkan token bot dari @BotFather di Telegram.');
  console.error('Contoh di .env: BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ\n');
  process.exit(1);
}

const bot = new Telegraf(config.botToken);

// Session middleware for managing multi-step wizard state
bot.use(session());

// Middleware to initialize user settings
bot.use((ctx, next) => {
  if (ctx.chat) {
    scheduleRepo.getUserSettings(ctx.chat.id);
  }
  return next();
});

// Command: /start
bot.start(async (ctx) => {
  ctx.session = null;
  const name = ctx.from?.first_name || 'Teman';

  // Automatically seed default schedules if user has none
  const existingSchedules = scheduleRepo.getAllSchedules(ctx.chat.id);
  let seededNote = '';
  if (existingSchedules.length === 0) {
    scheduleRepo.seedDefaultSchedules(ctx.chat.id);
    seededNote = `\n\n📌 <i>Jadwal perkuliahan default Anda telah otomatis dimuat ke akun ini! Tekan tombol "📋 Semua Jadwal" untuk melihatnya.</i>`;
  }

  const welcomeText = `👋 <b>Halo, ${name}!</b>\n\n` +
    `Selamat datang di <b>Bot Pengingat Jadwal Kuliah</b> 🎓\n\n` +
    `Bot ini siap membantu kamu:\n` +
    `• Mengingatkan jadwal kuliah setiap pagi secara otomatis 🌅\n` +
    `• Memberikan alarm 15 menit sebelum kelas dimulai 🔔\n` +
    `• Mengelola jadwal kuliah (Tambah, Edit, Hapus, Lihat) 📋\n` +
    seededNote + `\n\n` +
    `Silakan gunakan tombol menu di bawah atau ketik /help untuk melihat panduan!`;

  await ctx.reply(welcomeText, {
    parse_mode: 'HTML',
    ...keyboards.mainMenu()
  });
});

// Command: /reset_default
bot.command('reset_default', async (ctx) => {
  ctx.session = null;
  scheduleRepo.resetToDefaultSchedules(ctx.chat.id);
  await ctx.reply(
    `🔄 <b>Jadwal perkuliahan Anda berhasil di-reset ke jadwal default!</b>\n\n` +
    `Gunakan menu <b>📋 Semua Jadwal</b> atau ketik /jadwal untuk melihatnya.`,
    { parse_mode: 'HTML', ...keyboards.mainMenu() }
  );
});

// Command: /help
bot.help(async (ctx) => {
  const helpText = `📖 <b>Panduan Penggunaan Bot Kuliah:</b>\n\n` +
    `<b>Perintah Utama:</b>\n` +
    `• /hariini - Lihat jadwal kuliah hari ini\n` +
    `• /besok - Lihat jadwal kuliah besok\n` +
    `• /jadwal - Lihat seluruh jadwal mingguan\n` +
    `• /tarik_jadwal - Tarik jadwal otomatis dari portalmhs.unas.ac.id\n` +
    `• /tambah - Tambah jadwal kuliah baru manual\n` +
    `• /edit - Ubah data jadwal yang sudah ada\n` +
    `• /hapus - Hapus jadwal kuliah\n` +
    `• /pengaturan - Atur alarm & pengingat harian\n` +
    `• /reset_default - Muat ulang / reset ke jadwal perkuliahan default\n` +
    `• /batal - Batalkan operasi input yang sedang berjalan\n\n` +
    `💡 <i>Tips: Kamu juga bisa langsung menekan tombol menu di keyboard bawah!</i>`;

  await ctx.reply(helpText, {
    parse_mode: 'HTML',
    ...keyboards.mainMenu()
  });
});

// Command: /batal
bot.command('batal', async (ctx) => {
  ctx.session = null;
  await ctx.reply('🚫 <b>Operasi berhasil dibatalkan.</b>', {
    parse_mode: 'HTML',
    ...keyboards.mainMenu()
  });
});

// Schedule view commands
bot.hears('📅 Jadwal Hari Ini', viewHandler.handleToday);
bot.command('hariini', viewHandler.handleToday);

bot.hears('📆 Jadwal Besok', viewHandler.handleTomorrow);
bot.command('besok', viewHandler.handleTomorrow);

bot.hears('📋 Semua Jadwal', viewHandler.handleWeekly);
bot.command(['jadwal', 'semua'], viewHandler.handleWeekly);

// Portal sync commands
bot.hears('🌐 Tarik Portal UNAS', syncHandler.start);
bot.command(['tarik_jadwal', 'sync_portal'], syncHandler.start);
bot.action('sync_portal_action', syncHandler.start);

// Schedule CRUD commands
bot.hears('➕ Tambah Jadwal', createHandler.start);
bot.command('tambah', createHandler.start);

bot.hears('✏️ Edit Jadwal', editHandler.start);
bot.command('edit', editHandler.start);

bot.hears('❌ Hapus Jadwal', deleteHandler.start);
bot.command('hapus', deleteHandler.start);

// Settings commands
bot.hears('⚙️ Pengaturan Notifikasi', settingsHandler.showSettings);
bot.command('pengaturan', settingsHandler.showSettings);

bot.hears('ℹ️ Bantuan', (ctx) => ctx.handleUpdate({ ...ctx.update, message: { ...ctx.message, text: '/help' } }));

// Callback queries: Cancel action
bot.action('cancel_action', async (ctx) => {
  ctx.session = null;
  await ctx.answerCbQuery('Aksi dibatalkan');
  try {
    await ctx.deleteMessage();
  } catch {
    await ctx.editMessageText('🚫 <i>Aksi dibatalkan.</i>', { parse_mode: 'HTML' });
  }
  await ctx.reply('Kembali ke menu utama.', keyboards.mainMenu());
});

// Callback queries: Add schedule
bot.action(/^create_day:(.+)$/, async (ctx) => {
  const day = ctx.match[1];
  await createHandler.onDaySelected(ctx, day);
});

// Callback queries: Edit schedule
bot.action(/^edit_select:(\d+)$/, async (ctx) => {
  const id = ctx.match[1];
  await editHandler.onScheduleSelected(ctx, id);
});

bot.action(/^edit_field:(\d+):([a-z_]+)$/, async (ctx) => {
  const [, id, field] = ctx.match;
  await editHandler.onFieldSelected(ctx, id, field);
});

bot.action(/^edit_day_val:(\d+):(.+)$/, async (ctx) => {
  const [, id, day] = ctx.match;
  await editHandler.onDayValueSelected(ctx, id, day);
});

// Callback queries: Delete schedule
bot.action(/^delete_select:(\d+)$/, async (ctx) => {
  const id = ctx.match[1];
  await deleteHandler.onScheduleSelected(ctx, id);
});

bot.action(/^confirm_delete:(\d+)$/, async (ctx) => {
  const id = ctx.match[1];
  await deleteHandler.onConfirmDelete(ctx, id);
});

// Callback queries: Settings
bot.action('toggle_morning', (ctx) => settingsHandler.toggleMorning(ctx));
bot.action('toggle_preclass', (ctx) => settingsHandler.togglePreClass(ctx));
bot.action('set_morning_time', (ctx) => settingsHandler.promptMorningTime(ctx));
bot.action(/^morning_time_preset:(.+)$/, (ctx) => settingsHandler.applyMorningTimePreset(ctx, ctx.match[1]));
bot.action('set_preclass_mins', (ctx) => settingsHandler.promptPreClassMins(ctx));
bot.action(/^preclass_preset:(\d+)$/, (ctx) => settingsHandler.applyPreClassPreset(ctx, ctx.match[1]));
bot.action('confirm_reset_default', (ctx) => settingsHandler.confirmResetDefault(ctx));
bot.action('do_reset_default', (ctx) => settingsHandler.executeResetDefault(ctx));
bot.action('close_settings', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.deleteMessage();
  } catch {
    await ctx.editMessageText('✅ <i>Pengaturan disimpan.</i>', { parse_mode: 'HTML' });
  }
});

// Handle incoming text for active wizards (create / edit / settings / sync)
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;

  // Let main menu / commands pass through
  if (text.startsWith('/') || [
    '📅 Jadwal Hari Ini',
    '📆 Jadwal Besok',
    '📋 Semua Jadwal',
    '🌐 Tarik Portal UNAS',
    '➕ Tambah Jadwal',
    '✏️ Edit Jadwal',
    '❌ Hapus Jadwal',
    '⚙️ Pengaturan Notifikasi',
    'ℹ️ Bantuan'
  ].includes(text)) {
    return next();
  }

  // Check sync portal wizard
  const handledSync = await syncHandler.processStep(ctx, text);
  if (handledSync) return;

  // Check create wizard
  const handledCreate = await createHandler.processStep(ctx, text);
  if (handledCreate) return;

  // Check edit wizard
  const handledEdit = await editHandler.processStep(ctx, text);
  if (handledEdit) return;

  // Check settings
  const handledSettings = await settingsHandler.processStep(ctx, text);
  if (handledSettings) return;

  // Check if text is direct HTML table from portal
  if (text.includes('<table') || text.includes('id="example"') || (text.includes('<td>') && text.includes('Senin'))) {
    const handledHtml = await syncHandler.handleDirectHtml(ctx, text);
    if (handledHtml) return;
  }

  // Default fallback
  await ctx.reply(
    `Perintah tidak dikenali. Silakan gunakan menu tombol di bawah atau ketik /help.`,
    keyboards.mainMenu()
  );
});

// Handle document / file upload (e.g. user sends exported .html file from portal)
bot.on('document', async (ctx) => {
  const doc = ctx.message.document;
  if (!doc) return;

  const fileName = doc.file_name || '';
  const mimeType = doc.mime_type || '';

  if (fileName.endsWith('.html') || fileName.endsWith('.htm') || mimeType.includes('html') || fileName.endsWith('.txt')) {
    try {
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const res = await fetch(fileLink.href);
      const content = await res.text();

      const handled = await syncHandler.handleDirectHtml(ctx, content);
      if (!handled) {
        await ctx.reply(
          '⚠️ File HTML berhasil dibaca, namun tabel jadwal perkuliahan tidak ditemukan.\n' +
          'Pastikan file HTML yang Anda simpan berasal dari halaman <code>jadwal-pribadi</code> portal mahasiswa.',
          { parse_mode: 'HTML' }
        );
      }
    } catch (err) {
      console.error('Error reading uploaded HTML file:', err);
      await ctx.reply(`⚠️ Gagal memproses file: ${err.message}`);
    }
  }
});

// Launch bot and start reminder scheduler
try {
  const me = await bot.telegram.getMe();
  console.log(`🚀 Bot Telegram @${me.username} berhasil berjalan!`);
  bot.launch();
  reminderService.start(bot);
  console.log('⏰ Reminder service aktif.');
} catch (err) {
  console.error('Gagal menjalankan bot Telegram:', err);
}

// Graceful stop
process.once('SIGINT', () => {
  reminderService.stop();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  reminderService.stop();
  bot.stop('SIGTERM');
});
