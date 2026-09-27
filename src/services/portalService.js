import * as cheerio from 'cheerio';

const PORTAL_BASE_URL = 'https://portalmhs.unas.ac.id';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Normalizes HH:mm:ss to HH:mm
 */
function normalizeTime(timeStr) {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d{1,2}:\d{2})/);
  if (!match) return timeStr.trim();
  let time = match[1];
  if (time.length === 4) time = '0' + time;
  return time;
}

/**
 * Parses schedule table from HTML string
 */
export function parseScheduleTable(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const schedules = [];

  // Match rows inside #example or any table tbody
  const table = $('table#example').length ? $('table#example') : $('table');

  table.find('tbody tr').each((_, tr) => {
    const cols = $(tr).find('td').map((_, td) => $(td).text().trim()).get();

    // Table structure from UNAS:
    // Col 0: No (1)
    // Col 1: Hari (Senin)
    // Col 2: Mulai (10:40:00)
    // Col 3: Akhir (13:10:00)
    // Col 4: Ruang (C.807 VA)
    // Col 5: Kode MK (FTS251401)
    // Col 6: Kelas (R.01)
    // Col 7: Nama MK (Fisika Dasar I)
    // Col 8: SKS (3)
    if (cols.length >= 8) {
      const day = cols[1];
      const startTime = normalizeTime(cols[2]);
      const endTime = normalizeTime(cols[3]);
      const room = cols[4] || '';
      const courseName = cols[7] || '';

      if (day && startTime && endTime && courseName) {
        schedules.push({
          day,
          startTime,
          endTime,
          room,
          courseName,
          lecturer: ''
        });
      }
    }
  });

  return schedules;
}

/**
 * Performs automated login and scrapes /jadwal-pribadi
 */
export async function fetchJadwalFromPortal(username, password) {
  try {
    let cookieJar = '';

    // 1. Initial GET to acquire session cookie
    const initialRes = await fetch(`${PORTAL_BASE_URL}/login`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const setCookies = initialRes.headers.getSetCookie ? initialRes.headers.getSetCookie() : [initialRes.headers.get('set-cookie')];
    if (setCookies && setCookies.length) {
      cookieJar = setCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');
    }

    // 2. POST loginCheck
    const formData = new URLSearchParams();
    formData.append('username', username.trim());
    formData.append('password', password);

    const loginRes = await fetch(`${PORTAL_BASE_URL}/loginCheck`, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${PORTAL_BASE_URL}/login`,
        'Origin': PORTAL_BASE_URL,
        'Cookie': cookieJar,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      body: formData.toString(),
      redirect: 'manual' // Inspect 303 / 302 location
    });

    // Update cookies
    const loginCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
    if (loginCookies && loginCookies.length) {
      const newCookies = loginCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');
      cookieJar = [cookieJar, newCookies].filter(Boolean).join('; ');
    }

    const redirectLocation = loginRes.headers.get('location') || '';

    // If redirected back to login, credentials failed
    if (redirectLocation.includes('/login') && !redirectLocation.includes('/dashboard')) {
      return {
        success: false,
        error: 'Login gagal. NPM atau Password portal mahasiswa Anda salah. Silakan periksa kembali.'
      };
    }

    // 3. GET /jadwal-pribadi
    const scheduleRes = await fetch(`${PORTAL_BASE_URL}/jadwal-pribadi`, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': cookieJar,
        'Referer': `${PORTAL_BASE_URL}/dashboard`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!scheduleRes.ok) {
      return {
        success: false,
        error: `Gagal mengakses halaman jadwal (HTTP status: ${scheduleRes.status}).`
      };
    }

    const htmlContent = await scheduleRes.text();

    // Check if redirected to login page inside body
    if (htmlContent.includes('action="https://portalmhs.unas.ac.id/loginCheck"')) {
      return {
        success: false,
        error: 'Sesi login tidak valid atau kadaluarsa. Pastikan NPM dan Password sudah benar.'
      };
    }

    // 4. Parse table
    const schedules = parseScheduleTable(htmlContent);

    if (schedules.length === 0) {
      return {
        success: true,
        schedules: [],
        message: 'Berhasil login ke portal, tetapi tidak ditemukan jadwal perkuliahan pada tabel.'
      };
    }

    return {
      success: true,
      schedules
    };
  } catch (err) {
    console.error('Error fetching portal schedules:', err);
    return {
      success: false,
      error: `Terjadi kendala koneksi ke server portal UNAS: ${err.message}`
    };
  }
}
