const KBO_SCHEDULE_URL='https://www.koreabaseball.com/Schedule/Schedule.aspx';

const timeoutMs = Number(process.argv[2] ?? 15000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
  const response = await fetch(KBO_SCHEDULE_URL, { signal: controller.signal, headers: { 'user-agent': 'HANWHA-NOW/0.6.3' } });
  const html = await response.text();
  const checks = {
    http_ok: response.ok,
    schedule_table: /id=["']tblScheduleList["']/i.test(html),
    year_selector: /id=["']ddlYear["']/i.test(html),
    month_selector: /id=["']ddlMonth["']/i.test(html),
    series_selector: /id=["']ddlSeries["']/i.test(html)
  };
  const ok = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ version:'0.6.5', url:KBO_SCHEDULE_URL, status:ok?'PASS':'FAIL', http_status:response.status, bytes:html.length, checks }, null, 2));
  process.exitCode = ok ? 0 : 2;
} catch (error) {
  console.log(JSON.stringify({ version:'0.6.5', url:KBO_SCHEDULE_URL, status:'UNAVAILABLE', error:error.name === 'AbortError' ? 'TIMEOUT' : error.message }, null, 2));
  process.exitCode = 3;
} finally { clearTimeout(timer); }
