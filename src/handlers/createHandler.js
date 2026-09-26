import { keyboards } from './keyboards.js';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { parseTimeRange } from '../utils/dateTime.js';
import { formatSingleSchedule } from '../utils/formatter.js';

export const createHandler = {
  // Start wizard by picking a day
  async start(ctx) {
    ctx.session = {
      action: 'create',
      step: 'CHOOSE_DAY',
      data: {}
    };

    const text = `➕ <b>Tambah Jadwal Kuliah Baru</b>\n\nSilakan pilih <b>Hari</b> pelaksanaan kuliah:`;
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...keyboards.daySelection('create_day')
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...keyboards.daySelection('create_day')
      });
    }
  },

  // Handle day button click
  async onDaySelected(ctx, day) {
    if (!ctx.session || ctx.session.action !== 'create') {
      ctx.session = { action: 'create', step: 'CHOOSE_DAY', data: {} };
    }
    ctx.session.data.day = day;
    ctx.session.step = 'INPUT_NAME';

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📅 Hari terpilih: <b>${day}</b>\n\nSekarang, ketikkan <b>Nama Mata Kuliah</b>:\n<i>(Contoh: Algoritma & Pemrograman)</i>`,
      {
        parse_mode: 'HTML',
        ...keyboards.cancelButton()
      }
    );
  },

  // Process text message in wizard
  async processStep(ctx, text) {
    const session = ctx.session;
    if (!session || session.action !== 'create') return false;

    const trimmed = text.trim();

    switch (session.step) {
      case 'INPUT_NAME': {
        if (!trimmed) {
          await ctx.reply('⚠️ Nama mata kuliah tidak boleh kosong. Silakan ketik nama mata kuliah:');
          return true;
        }
        session.data.courseName = trimmed;
        session.step = 'INPUT_TIME';

        await ctx.reply(
          `📚 Mata Kuliah: <b>${trimmed}</b>\n\nMasukkan <b>Jam Perkuliahan</b> dalam format <code>HH:mm - HH:mm</code>:\n<i>(Contoh: <code>08:00 - 10:30</code> atau <code>13:15 - 15:45</code>)</i>`,
          {
            parse_mode: 'HTML',
            ...keyboards.cancelButton()
          }
        );
        return true;
      }

      case 'INPUT_TIME': {
        const timeRange = parseTimeRange(trimmed);
        if (!timeRange) {
          await ctx.reply(
            `⚠️ Format jam tidak valid. Harap gunakan format <code>HH:mm - HH:mm</code>.\nContoh: <code>08:00 - 10:30</code> atau <code>13:00 - 15:30</code>`,
            {
              parse_mode: 'HTML',
              ...keyboards.cancelButton()
            }
          );
          return true;
        }

        session.data.startTime = timeRange.startTime;
        session.data.endTime = timeRange.endTime;
        session.step = 'INPUT_ROOM';

        await ctx.reply(
          `⏰ Jam: <code>${timeRange.startTime} - ${timeRange.endTime}</code>\n\nMasukkan <b>Ruangan / Laboratorium / Link Kuliah</b>:\n<i>(Ketik <code>-</code> jika ingin melewati/kosongkan)</i>`,
          {
            parse_mode: 'HTML',
            ...keyboards.cancelButton()
          }
        );
        return true;
      }

      case 'INPUT_ROOM': {
        session.data.room = trimmed === '-' ? '' : trimmed;
        session.step = 'INPUT_LECTURER';

        await ctx.reply(
          `📍 Ruangan: <i>${session.data.room || 'Tidak diisi'}</i>\n\nMasukkan <b>Nama Dosen Pengampu</b>:\n<i>(Ketik <code>-</code> jika ingin melewati/kosongkan)</i>`,
          {
            parse_mode: 'HTML',
            ...keyboards.cancelButton()
          }
        );
        return true;
      }

      case 'INPUT_LECTURER': {
        session.data.lecturer = trimmed === '-' ? '' : trimmed;

        // Save to database
        const newId = scheduleRepo.addSchedule({
          chatId: ctx.chat.id,
          day: session.data.day,
          courseName: session.data.courseName,
          startTime: session.data.startTime,
          endTime: session.data.endTime,
          room: session.data.room,
          lecturer: session.data.lecturer
        });

        const saved = scheduleRepo.getScheduleById(newId);

        // Reset session
        ctx.session = null;

        let successMsg = `✅ <b>Jadwal Berhasil Ditambahkan!</b>\n\n`;
        successMsg += formatSingleSchedule(saved);
        successMsg += `\n<i>Jadwal ini akan otomatis dimasukkan ke dalam pengingat harian kamu.</i>`;

        await ctx.reply(successMsg, {
          parse_mode: 'HTML',
          ...keyboards.mainMenu()
        });
        return true;
      }

      default:
        return false;
    }
  }
};
