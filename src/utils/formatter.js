import { DAYS_OF_WEEK } from './dateTime.js';

export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format a single schedule item
 */
export function formatSingleSchedule(s, index = null) {
  const prefix = index !== null ? `<b>${index}. </b>` : '';
  let text = `${prefix}📚 <b>${escapeHtml(s.course_name)}</b>\n`;
  text += `   ⏰ <code>${escapeHtml(s.start_time)} - ${escapeHtml(s.end_time)}</code>\n`;
  if (s.room) {
    text += `   📍 Ruang: <i>${escapeHtml(s.room)}</i>\n`;
  }
  if (s.lecturer) {
    text += `   👨‍🏫 Dosen: <i>${escapeHtml(s.lecturer)}</i>\n`;
  }
  return text;
}

/**
 * Format schedule list for a day
 */
export function formatDayScheduleList(dayName, schedules) {
  let message = `📅 <b>Jadwal Kuliah Hari ${escapeHtml(dayName)}</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━\n`;

  if (!schedules || schedules.length === 0) {
    message += `<i>🎉 Tidak ada jadwal kuliah untuk hari ini. Waktunya istirahat / belajar mandiri!</i>\n`;
    return message;
  }

  schedules.forEach((item, idx) => {
    message += `${formatSingleSchedule(item, idx + 1)}\n`;
  });

  message += `<i>Total: ${schedules.length} mata kuliah</i>`;
  return message;
}

/**
 * Format weekly schedule list
 */
export function formatWeeklyScheduleList(allSchedules) {
  let message = `📋 <b>Rangkuman Jadwal Kuliah Mingguan</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━\n\n`;

  if (!allSchedules || allSchedules.length === 0) {
    message += `<i>Belum ada jadwal kuliah yang tersimpan. Gunakan tombol /tambah untuk menambahkan.</i>`;
    return message;
  }

  let totalCourses = 0;
  for (const day of DAYS_OF_WEEK) {
    const dayCourses = allSchedules.filter(s => s.day.toLowerCase() === day.toLowerCase());
    if (dayCourses.length > 0) {
      message += `📌 <b>Hari ${day}</b> (${dayCourses.length} matkul):\n`;
      dayCourses.forEach(c => {
        message += `  • <code>${escapeHtml(c.start_time)}-${escapeHtml(c.end_time)}</code> | <b>${escapeHtml(c.course_name)}</b>`;
        if (c.room) message += ` (📍 ${escapeHtml(c.room)})`;
        message += `\n`;
      });
      message += `\n`;
      totalCourses += dayCourses.length;
    }
  }

  message += `━━━━━━━━━━━━━━━━━━━\n`;
  message += `<i>Total keseluruhan: ${totalCourses} jadwal mata kuliah.</i>`;
  return message;
}

/**
 * Format daily morning briefing message
 */
export function formatMorningBriefing(dayName, schedules) {
  let msg = `🌅 <b>Selamat Pagi! Rangkuman Kuliah Hari Ini (${escapeHtml(dayName)})</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

  if (!schedules || schedules.length === 0) {
    msg += `Hari ini kamu <b>tidak ada jadwal kuliah</b>! Semangat beraktivitas & istirahat yang cukup ya! ✨`;
    return msg;
  }

  msg += `Berikut daftar kelas kamu hari ini:\n\n`;
  schedules.forEach((s, idx) => {
    msg += `${formatSingleSchedule(s, idx + 1)}\n`;
  });

  msg += `💡 <i>Pastikan tugas dan perlengkapan kuliah sudah siap ya!</i>`;
  return msg;
}

/**
 * Format pre-class reminder message
 */
export function formatPreClassAlert(schedule, minutesLeft) {
  let msg = `🔔 <b>PENGINGAT KULIAH AKAN DIMULAI!</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Mata kuliah <b>${escapeHtml(schedule.course_name)}</b> akan dimulai dalam <b>${minutesLeft} menit</b> lagi!\n\n`;
  msg += `⏰ Jam: <code>${escapeHtml(schedule.start_time)} - ${escapeHtml(schedule.end_time)}</code>\n`;
  if (schedule.room) msg += `📍 Lokasi / Ruang: <b>${escapeHtml(schedule.room)}</b>\n`;
  if (schedule.lecturer) msg += `👨‍🏫 Dosen: <b>${escapeHtml(schedule.lecturer)}</b>\n`;
  msg += `\n🚀 <i>Yuk segera bersiap menuju kelas / bergabung ke tautan kuliah!</i>`;
  return msg;
}
