import assert from 'assert';
import { scheduleRepo } from '../src/repositories/scheduleRepo.js';
import {
  parseTimeRange,
  isValidTimeFormat,
  getMinutesDifference,
  getTodayDayName,
  getTomorrowDayName,
  DAYS_OF_WEEK
} from '../src/utils/dateTime.js';
import {
  formatSingleSchedule,
  formatDayScheduleList,
  formatWeeklyScheduleList,
  formatMorningBriefing,
  formatPreClassAlert
} from '../src/utils/formatter.js';

console.log('🧪 Menjalankan pengujian otomatis untuk Bot Kuliah...\n');

const TEST_CHAT_ID = 'test_user_' + Date.now();

// 1. Test DateTime Utils
console.log('1. Menguji fungsi waktu & parsing...');
assert.strictEqual(isValidTimeFormat('08:00'), true);
assert.strictEqual(isValidTimeFormat('23:59'), true);
assert.strictEqual(isValidTimeFormat('25:00'), false);
assert.strictEqual(isValidTimeFormat('invalid'), false);

const parsedRange = parseTimeRange('8:00 - 10:30');
assert.deepStrictEqual(parsedRange, { startTime: '08:00', endTime: '10:30' });

const parsedRange2 = parseTimeRange('13:00-15:45');
assert.deepStrictEqual(parsedRange2, { startTime: '13:00', endTime: '15:45' });

const diff = getMinutesDifference('08:00', '08:15');
assert.strictEqual(diff, 15);

const diffNegative = getMinutesDifference('08:30', '08:15');
assert.strictEqual(diffNegative, -15);

const todayName = getTodayDayName();
assert.ok(DAYS_OF_WEEK.includes(todayName), `Today name ${todayName} harus terdaftar di DAYS_OF_WEEK`);
console.log('   ✅ DateTime utils lolos uji.');

// 2. Test Schedule CRUD
console.log('2. Menguji database CRUD schedule...');
// Clean up any test data first
const initialSchedules = scheduleRepo.getAllSchedules(TEST_CHAT_ID);
initialSchedules.forEach(s => scheduleRepo.deleteSchedule(s.id, TEST_CHAT_ID));

// Create
const id1 = scheduleRepo.addSchedule({
  chatId: TEST_CHAT_ID,
  day: 'Senin',
  courseName: 'Algoritma & Pemrograman',
  startTime: '08:00',
  endTime: '10:30',
  room: 'Lab Komputer 3',
  lecturer: 'Dr. Budi Santoso'
});
assert.ok(id1 > 0, 'ID jadwal baru harus > 0');

const id2 = scheduleRepo.addSchedule({
  chatId: TEST_CHAT_ID,
  day: 'Senin',
  courseName: 'Kalkulus I',
  startTime: '13:00',
  endTime: '15:30',
  room: 'Gedung B R.201',
  lecturer: 'Prof. Siti'
});

const id3 = scheduleRepo.addSchedule({
  chatId: TEST_CHAT_ID,
  day: 'Rabu',
  courseName: 'Basis Data',
  startTime: '09:00',
  endTime: '11:30',
  room: 'Lab Basis Data',
  lecturer: 'Ahmad, M.Kom'
});

// Read by day
const seninSchedules = scheduleRepo.getSchedulesByDay(TEST_CHAT_ID, 'Senin');
assert.strictEqual(seninSchedules.length, 2, 'Harus ada 2 jadwal di hari Senin');
assert.strictEqual(seninSchedules[0].course_name, 'Algoritma & Pemrograman');
assert.strictEqual(seninSchedules[1].course_name, 'Kalkulus I');

// Read all (sorted)
const all = scheduleRepo.getAllSchedules(TEST_CHAT_ID);
assert.strictEqual(all.length, 3, 'Total ada 3 jadwal');
assert.strictEqual(all[0].day, 'Senin');
assert.strictEqual(all[2].day, 'Rabu');

// Update
const updateSuccess = scheduleRepo.updateSchedule(id1, {
  courseName: 'Algoritma & Struktur Data',
  room: 'Lab AI 1'
});
assert.strictEqual(updateSuccess, true);
const updated1 = scheduleRepo.getScheduleById(id1);
assert.strictEqual(updated1.course_name, 'Algoritma & Struktur Data');
assert.strictEqual(updated1.room, 'Lab AI 1');
assert.strictEqual(updated1.start_time, '08:00'); // Unchanged

// Delete
const deleteSuccess = scheduleRepo.deleteSchedule(id2, TEST_CHAT_ID);
assert.strictEqual(deleteSuccess, true);
const afterDelete = scheduleRepo.getSchedulesByDay(TEST_CHAT_ID, 'Senin');
assert.strictEqual(afterDelete.length, 1);
assert.strictEqual(afterDelete[0].id, id1);
console.log('   ✅ Schedule CRUD lolos uji.');

// 3. Test User Settings
console.log('3. Menguji user settings & preferences...');
const defaultSettings = scheduleRepo.getUserSettings(TEST_CHAT_ID);
assert.strictEqual(defaultSettings.morning_reminder_enabled, 1);
assert.strictEqual(defaultSettings.morning_reminder_time, '06:30');
assert.strictEqual(defaultSettings.pre_class_reminder_mins, 15);

scheduleRepo.updateUserSettings(TEST_CHAT_ID, {
  morningReminderTime: '07:00',
  preClassReminderMins: 30
});
const updatedSettings = scheduleRepo.getUserSettings(TEST_CHAT_ID);
assert.strictEqual(updatedSettings.morning_reminder_time, '07:00');
assert.strictEqual(updatedSettings.pre_class_reminder_mins, 30);
console.log('   ✅ User settings lolos uji.');

// 4. Test Reminder Logs
console.log('4. Menguji log pengiriman reminder...');
const dateToday = '2026-09-26';
assert.strictEqual(scheduleRepo.hasReminderBeenSent(TEST_CHAT_ID, null, 'morning', dateToday), false);
scheduleRepo.logReminderSent(TEST_CHAT_ID, null, 'morning', dateToday);
assert.strictEqual(scheduleRepo.hasReminderBeenSent(TEST_CHAT_ID, null, 'morning', dateToday), true);

assert.strictEqual(scheduleRepo.hasReminderBeenSent(TEST_CHAT_ID, id1, 'pre_class', dateToday), false);
scheduleRepo.logReminderSent(TEST_CHAT_ID, id1, 'pre_class', dateToday);
assert.strictEqual(scheduleRepo.hasReminderBeenSent(TEST_CHAT_ID, id1, 'pre_class', dateToday), true);
console.log('   ✅ Reminder log lolos uji.');

// 5. Test Formatters
console.log('5. Menguji pemformatan teks pesan Telegram...');
const formattedSingle = formatSingleSchedule(updated1);
assert.ok(formattedSingle.includes('Algoritma &amp; Struktur Data'));
assert.ok(formattedSingle.includes('Lab AI 1'));

const formattedList = formatDayScheduleList('Senin', [updated1]);
assert.ok(formattedList.includes('Hari Senin'));

const formattedBriefing = formatMorningBriefing('Senin', [updated1]);
assert.ok(formattedBriefing.includes('Rangkuman Kuliah Hari Ini'));

const formattedPreClass = formatPreClassAlert(updated1, 15);
assert.ok(formattedPreClass.includes('15 menit'));
console.log('   ✅ Formatter lolos uji.');

// Cleanup test data
scheduleRepo.deleteSchedule(id1, TEST_CHAT_ID);
scheduleRepo.deleteSchedule(id3, TEST_CHAT_ID);

// 6. Test Default Schedules Seeding
console.log('6. Menguji muat jadwal kuliah default...');
scheduleRepo.resetToDefaultSchedules(TEST_CHAT_ID);
const seededSchedules = scheduleRepo.getAllSchedules(TEST_CHAT_ID);
assert.strictEqual(seededSchedules.length, 9, 'Harus ada 9 jadwal default yang dimuat');

// Check Fisika Dasar I on Senin 10:40 - 13:10
const fisika = seededSchedules.find(s => s.course_name === 'Fisika Dasar I');
assert.ok(fisika, 'Fisika Dasar I harus ada');
assert.strictEqual(fisika.day, 'Senin');
assert.strictEqual(fisika.start_time, '10:40');
assert.strictEqual(fisika.end_time, '13:10');
assert.strictEqual(fisika.room, 'C.807 VA');

// Check Kalkulus I (2 sessions on Jumat)
const kalkulus = seededSchedules.filter(s => s.course_name === 'Kalkulus I');
assert.strictEqual(kalkulus.length, 2, 'Kalkulus I harus ada 2 sesi di hari Jumat');

// Clean up
const cleanupStmt = scheduleRepo.getAllSchedules(TEST_CHAT_ID);
cleanupStmt.forEach(s => scheduleRepo.deleteSchedule(s.id, TEST_CHAT_ID));
console.log('   ✅ Muat jadwal default lolos uji.');

console.log('\n🎉 SEMUA PENGUJIAN BERHASIL LOLOS 100%!');
