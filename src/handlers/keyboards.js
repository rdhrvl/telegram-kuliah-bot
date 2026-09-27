import { Markup } from 'telegraf';
import { DAYS_OF_WEEK } from '../utils/dateTime.js';

export const keyboards = {
  // Main persistent reply keyboard
  mainMenu() {
    return Markup.keyboard([
      ['📅 Jadwal Hari Ini', '📆 Jadwal Besok'],
      ['📋 Semua Jadwal', '🌐 Tarik Portal UNAS'],
      ['➕ Tambah Jadwal', '✏️ Edit Jadwal'],
      ['❌ Hapus Jadwal', '⚙️ Pengaturan Notifikasi']
    ]).resize();
  },

  // Inline keyboard for selecting days
  daySelection(actionPrefix) {
    const rows = [
      [
        Markup.button.callback('Senin', `${actionPrefix}:Senin`),
        Markup.button.callback('Selasa', `${actionPrefix}:Selasa`),
        Markup.button.callback('Rabu', `${actionPrefix}:Rabu`)
      ],
      [
        Markup.button.callback('Kamis', `${actionPrefix}:Kamis`),
        Markup.button.callback('Jumat', `${actionPrefix}:Jumat`),
        Markup.button.callback('Sabtu', `${actionPrefix}:Sabtu`)
      ],
      [
        Markup.button.callback('Minggu', `${actionPrefix}:Minggu`),
        Markup.button.callback('❌ Batal', 'cancel_action')
      ]
    ];
    return Markup.inlineKeyboard(rows);
  },

  // Inline keyboard to select a schedule item (for edit or delete)
  scheduleSelection(schedules, actionPrefix) {
    const buttons = schedules.map(s => {
      const label = `${s.day} ${s.start_time} - ${s.course_name.length > 20 ? s.course_name.substring(0, 18) + '...' : s.course_name}`;
      return [Markup.button.callback(label, `${actionPrefix}:${s.id}`)];
    });

    buttons.push([Markup.button.callback('❌ Batal', 'cancel_action')]);
    return Markup.inlineKeyboard(buttons);
  },

  // Inline keyboard for selecting which field to edit
  editFields(scheduleId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📚 Nama Matkul', `edit_field:${scheduleId}:course_name`),
        Markup.button.callback('📅 Hari', `edit_field:${scheduleId}:day`)
      ],
      [
        Markup.button.callback('⏰ Jam Mulai & Selesai', `edit_field:${scheduleId}:time`),
        Markup.button.callback('📍 Ruangan/Link', `edit_field:${scheduleId}:room`)
      ],
      [
        Markup.button.callback('👨‍🏫 Dosen Pengampu', `edit_field:${scheduleId}:lecturer`)
      ],
      [
        Markup.button.callback('⬅️ Selesai / Kembali', 'cancel_action')
      ]
    ]);
  },

  // Confirmation keyboard for delete
  confirmDelete(scheduleId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🗑️ Ya, Hapus Jadwal Ini', `confirm_delete:${scheduleId}`),
        Markup.button.callback('❌ Batal', 'cancel_action')
      ]
    ]);
  },

  // Settings menu keyboard
  settingsMenu(settings) {
    const morningStatus = settings.morning_reminder_enabled ? '✅ Aktif' : '❌ Nonaktif';
    const preClassStatus = settings.pre_class_reminder_enabled ? '✅ Aktif' : '❌ Nonaktif';

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`Pagi: ${morningStatus}`, 'toggle_morning'),
        Markup.button.callback(`Ubah Jam Pagi (${settings.morning_reminder_time})`, 'set_morning_time')
      ],
      [
        Markup.button.callback(`Sebelum Kelas: ${preClassStatus}`, 'toggle_preclass'),
        Markup.button.callback(`Waktu Peringatan (${settings.pre_class_reminder_mins}m)`, 'set_preclass_mins')
      ],
      [
        Markup.button.callback('🔄 Muat/Reset Jadwal Kuliah Default', 'confirm_reset_default')
      ],
      [
        Markup.button.callback('⬅️ Tutup Menu Pengaturan', 'close_settings')
      ]
    ]);
  },

  // Cancel inline button
  cancelButton() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('❌ Batal', 'cancel_action')]
    ]);
  }
};
