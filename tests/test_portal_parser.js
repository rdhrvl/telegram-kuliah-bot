import assert from 'assert';
import { parseScheduleTable } from '../src/services/portalService.js';

console.log('🧪 Menguji parser tabel jadwal portal UNAS...\n');

const sampleHtml = `
<div class="card">
  <div class="card-header text-muted">
    <h5><b>JADWAL PRIBADI</b></h5>
    <h6><b>TAHUN AKADEMIK : 2026/2027 - GANJIL - REGULER</b></h6>
  </div>
  <div class="card-body">
    <table id="example" class="table table-bordered dt-responsive table-striped align-middle" style="width:100%; text-align:center">
      <thead>
        <tr>
          <th>No</th>
          <th>Hari</th>
          <th>Mulai</th>
          <th>Akhir</th>
          <th>Ruang</th>
          <th>Kode MK</th>
          <th>Kelas</th>
          <th>Nama MK</th>
          <th>SKS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Senin</td>
          <td style="text-align:left">10:40:00</td>
          <td>13:10:00</td>
          <td>C.807 VA</td>
          <td style="text-align:left">FTS251401</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Fisika Dasar I</td>
          <td style="text-align:center">3</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Jumat</td>
          <td style="text-align:left">08:00:00</td>
          <td>09:40:00</td>
          <td>LabKomputerUnas/SL402</td>
          <td style="text-align:left">FTS251402</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Kalkulus I</td>
          <td style="text-align:center">4</td>
        </tr>
        <tr>
          <td>3</td>
          <td>Jumat</td>
          <td style="text-align:left">09:50:00</td>
          <td>11:30:00</td>
          <td>LabKomputerUnas/SL402</td>
          <td style="text-align:left">FTS251402</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Kalkulus I</td>
          <td style="text-align:center">4</td>
        </tr>
        <tr>
          <td>4</td>
          <td>Selasa</td>
          <td style="text-align:left">09:50:00</td>
          <td>11:30:00</td>
          <td>D.001 VA</td>
          <td style="text-align:left">FTS251404</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Kimia Dasar</td>
          <td style="text-align:center">2</td>
        </tr>
        <tr>
          <td>5</td>
          <td>Kamis</td>
          <td style="text-align:left">09:50:00</td>
          <td>11:30:00</td>
          <td>LabKomputerUnas/SL402</td>
          <td style="text-align:left">TE251404</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Matematika Diskrit</td>
          <td style="text-align:center">2</td>
        </tr>
        <tr>
          <td>6</td>
          <td>Senin</td>
          <td style="text-align:left">13:30:00</td>
          <td>15:10:00</td>
          <td>D.011 VA</td>
          <td style="text-align:left">TE251405</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Material Teknik Elektro</td>
          <td style="text-align:center">2</td>
        </tr>
        <tr>
          <td>7</td>
          <td>Rabu</td>
          <td style="text-align:left">13:30:00</td>
          <td>15:10:00</td>
          <td>D.304 VA</td>
          <td style="text-align:left">TE251406</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Pengantar Teknologi Informasi dan Komunikasi</td>
          <td style="text-align:center">2</td>
        </tr>
        <tr>
          <td>8</td>
          <td>Jumat</td>
          <td style="text-align:left">13:30:00</td>
          <td>15:10:00</td>
          <td>Lab Teknik Elektro</td>
          <td style="text-align:left">TE251408</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Praktikum Rangkaian Listrik</td>
          <td style="text-align:center">1</td>
        </tr>
        <tr>
          <td>9</td>
          <td>Rabu</td>
          <td style="text-align:left">15:20:00</td>
          <td>17:00:00</td>
          <td>C.005 VA</td>
          <td style="text-align:left">TE251407</td>
          <td style="text-align:left">R.01</td>
          <td style="text-align:left">Rangkaian Listrik I</td>
          <td style="text-align:center">2</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
`;

const parsed = parseScheduleTable(sampleHtml);
console.log('Hasil parsing:', parsed.length, 'jadwal');
assert.strictEqual(parsed.length, 9, 'Harus mengekstrak tepat 9 baris jadwal');

// Verify Row 1: Fisika Dasar I
assert.strictEqual(parsed[0].day, 'Senin');
assert.strictEqual(parsed[0].startTime, '10:40');
assert.strictEqual(parsed[0].endTime, '13:10');
assert.strictEqual(parsed[0].room, 'C.807 VA');
assert.strictEqual(parsed[0].courseName, 'Fisika Dasar I');

// Verify Row 2: Kalkulus I
assert.strictEqual(parsed[1].day, 'Jumat');
assert.strictEqual(parsed[1].startTime, '08:00');
assert.strictEqual(parsed[1].endTime, '09:40');
assert.strictEqual(parsed[1].room, 'LabKomputerUnas/SL402');
assert.strictEqual(parsed[1].courseName, 'Kalkulus I');

// Verify Row 8: Praktikum Rangkaian Listrik
assert.strictEqual(parsed[7].day, 'Jumat');
assert.strictEqual(parsed[7].startTime, '13:30');
assert.strictEqual(parsed[7].endTime, '15:10');
assert.strictEqual(parsed[7].room, 'Lab Teknik Elektro');
assert.strictEqual(parsed[7].courseName, 'Praktikum Rangkaian Listrik');

console.log('✅ Pengujian parseScheduleTable berhasil 100%!');
