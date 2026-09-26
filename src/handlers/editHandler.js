import { keyboards } from './keyboards.js';
import { scheduleRepo } from '../repositories/scheduleRepo.js';
import { parseTimeRange } from '../utils/dateTime.js';
import { formatSingleSchedule } from '../utils/formatter.js';

export const editHandler = {
  // Start edit by listing user's schedules
  async start(ctx) {
    const chatId = ctx.chat.id;
    const schedules = scheduleRepo.getAllSchedules(chatId);

    if (!schedules || schedules.length === 0) {
      const msg = `ℹ️ <b>Belum ada jadwal yang tersimpan</b> untuk diedit.\nSilakan gunakan menu <b>➕ Tambah Jadwal</b> terlebih dahulu.`;
      if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(msg, { parse_mode: 'HTML' });
      }
      return;
    }

    const text = `✏️ <b>Pilih Jadwal yang Ingin Diedit:</b>`;
    const keyboard = keyboards.scheduleSelection(schedules, 'edit_select');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    }
  },

  // When user clicks a specific schedule to edit
  async onScheduleSelected(ctx, scheduleId) {
    await ctx.answerCbQuery();
    const schedule = scheduleRepo.getScheduleById(scheduleId);

    if (!schedule || String(schedule.chat_id) !== String(ctx.chat.id)) {
      await ctx.reply('⚠️ Jadwal tidak ditemukan atau sudah dihapus.');
      return;
    }

    let text = `✏️ <b>Edit Jadwal Kuliah</b>\n\n`;
    text += formatSingleSchedule(schedule);
    text += `\nPilih bagian yang ingin Anda ubah:`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...keyboards.editFields(schedule.id)
    });
  },

  // When user picks a field to edit
  async onFieldSelected(ctx, scheduleId, field) {
    await ctx.answerCbQuery();
    const schedule = scheduleRepo.getScheduleById(scheduleId);
    if (!schedule || String(schedule.chat_id) !== String(ctx.chat.id)) {
      await ctx.reply('⚠️ Jadwal tidak ditemukan.');
      return;
    }

    if (field === 'day') {
      // Pick a new day via inline keyboard
      await ctx.editMessageText(
        `📅 <b>Pilih Hari Baru</b> untuk mata kuliah <b>${schedule.course_name}</b>:`,
        {
          parse_mode: 'HTML',
          ...keyboards.daySelection(`edit_day_val:${scheduleId}`)
        }
      );
      return;
    }

    // For other fields, await user text input
    ctx.session = {
      action: 'edit',
      scheduleId,
      field
    };

    let prompt = '';
    if (field === 'course_name') {
      prompt = `Ketikkan <b>Nama Mata Kuliah Baru</b> (sebelumnya: <i>${schedule.course_name}</i>):`;
    } else if (field === 'time') {
      prompt = `Ketikkan <b>Jam Perkuliahan Baru</b> dalam format <code>HH:mm - HH:mm</code>\n(sebelumnya: <code>${schedule.start_time} - ${schedule.end_time}</code>):`;
    } else if (field === 'room') {
      prompt = `Ketikkan <b>Ruangan / Lokasi Baru</b> (sebelumnya: <i>${schedule.room || 'Kosong'}</i>):\n<i>(Ketik <code>-</code> untuk mengosongkan)</i>`;
    } else if (field === 'lecturer') {
      prompt = `Ketikkan <b>Nama Dosen Pengampu Baru</b> (sebelumnya: <i>${schedule.lecturer || 'Kosong'}</i>):\n<i>(Ketik <code>-</code> untuk mengosongkan)</i>`;
    }

    await ctx.editMessageText(prompt, {
      parse_mode: 'HTML',
      ...keyboards.cancelButton()
    });
  },

  // Handle day update from inline buttons
  async onDayValueSelected(ctx, scheduleId, newDay) {
    await ctx.answerCbQuery();
    scheduleRepo.updateSchedule(scheduleId, { day: newDay });
    const updated = scheduleRepo.getScheduleById(scheduleId);

    let text = `✅ <b>Hari berhasil diubah menjadi ${newDay}!</b>\n\n`;
    text += formatSingleSchedule(updated);
    text += `\nApakah ingin mengubah bagian lain?`;

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...keyboards.editFields(scheduleId)
    });
  },

  // Handle text reply for editing fields
  async processStep(ctx, text) {
    const session = ctx.session;
    if (!session || session.action !== 'edit') return false;

    const trimmed = text.trim();
    const { scheduleId, field } = session;
    const schedule = scheduleRepo.getScheduleById(scheduleId);

    if (!schedule) {
      ctx.session = null;
      await ctx.reply('⚠️ Jadwal tidak ditemukan.');
      return true;
    }

    const updatePayload = {};

    if (field === 'course_name') {
      if (!trimmed) {
        await ctx.reply('⚠️ Nama mata kuliah tidak boleh kosong. Silakan ketik kembali:');
        return true;
      }
      updatePayload.courseName = trimmed;
    } else if (field === 'time') {
      const timeRange = parseTimeRange(trimmed);
      if (!timeRange) {
        await ctx.reply(
          `⚠️ Format jam tidak valid. Harap gunakan format <code>HH:mm - HH:mm</code> (contoh: <code>08:00 - 10:30</code>):`,
          { parse_mode: 'HTML', ...keyboards.cancelButton() }
        );
        return true;
      }
      updatePayload.startTime = timeRange.startTime;
      updatePayload.endTime = timeRange.endTime;
    } else if (field === 'room') {
      updatePayload.room = trimmed === '-' ? '' : trimmed;
    } else if (field === 'lecturer') {
      updatePayload.lecturer = trimmed === '-' ? '' : trimmed;
    }

    scheduleRepo.updateSchedule(scheduleId, updatePayload);
    const updated = scheduleRepo.getScheduleById(scheduleId);
    ctx.session = null;

    let responseMsg = `✅ <b>Jadwal Berhasil Diperbarui!</b>\n\n`;
    responseMsg += formatSingleSchedule(updated);
    responseMsg += `\nApakah ingin mengubah bagian lain dari jadwal ini?`;

    await ctx.reply(responseMsg, {
      parse_mode: 'HTML',
      ...keyboards.editFields(scheduleId)
    });
    return true;
  }
};
