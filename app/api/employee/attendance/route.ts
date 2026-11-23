import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getClientIp, verifyOfficeNetwork } from '@/lib/ip';
import { calculateAttendanceHoursSummary, calculateRecordHours, timeToMinutes } from '@/lib/hours';

function getIstNow(): { dateStr: string; timeStr: string; minutes: number } {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now); // 'YYYY-MM-DD'
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now); // 'HH:mm:ss'
  const [h, m] = timeStr.split(':').map(Number);
  return { dateStr, timeStr, minutes: h * 60 + m };
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    if (!session?.id || !session?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is missing or invalid', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const userId: number = session.id;
    const companyId: number = session.companyId;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || 'November 2026';

    let year = 2026;
    let monthNum = 11;
    const parts = month.split(' ');
    if (parts.length === 2) {
      const mNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const idx = mNames.indexOf(parts[0]);
      if (idx !== -1) monthNum = idx + 1;
      year = parseInt(parts[1], 10) || 2026;
    }

    const startStr = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await query<any[]>(`
      SELECT id, date, check_in, check_out, mode, status, ip_address, notes
      FROM attendance
      WHERE company_id = ? AND user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `, [companyId, userId, startStr, endStr]);

    const { dateStr: todayStr } = getIstNow();

    let present = 0;
    let late = 0;
    let halfDays = 0;
    let onLeave = 0;

    const records = rows.map((r) => {
      const checkInStr = r.check_in ? String(r.check_in).slice(0, 5) : '—';
      const checkOutStr = r.check_out ? String(r.check_out).slice(0, 5) : '—';
      const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];

      if (r.status === 'Present') present++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'On leave') onLeave++;

      const dur = calculateRecordHours(checkInStr, checkOutStr, dateStr, todayStr);

      return {
        id: r.id,
        date: dateStr,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        mode: r.mode || 'Office',
        status: r.status,
        hoursDecimal: dur.hours,
        hoursFormatted: dur.formatted,
        isActive: dur.isActive,
      };
    });

    // Calculate aggregated hours summary (Today, This Week, This Month)
    const hoursSummary = calculateAttendanceHoursSummary(
      records.map((r) => ({
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
      })),
      todayStr
    );

    // Fetch company settings to pass shift and late cutoff details
    const [settings] = await query<any[]>(
      'SELECT start_time, end_time, late_cutoff_time, grace_minutes, working_days FROM company_settings WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    const clientIp = getClientIp(req);
    const verification = await verifyOfficeNetwork(companyId, userId, clientIp);

    const lateCutoffDisplay = settings?.late_cutoff_time
      ? String(settings.late_cutoff_time).slice(0, 5)
      : '09:15';

    return NextResponse.json({
      success: true,
      month,
      clientIp,
      verification,
      schedule: {
        startTime: settings?.start_time ? String(settings.start_time).slice(0, 5) : '09:00',
        endTime: settings?.end_time ? String(settings.end_time).slice(0, 5) : '18:00',
        lateCutoff: lateCutoffDisplay,
        workingDays: settings?.working_days || '1,2,3,4,5',
      },
      summary: {
        present,
        late,
        halfDays,
        onLeave,
      },
      hours: hoursSummary,
      records,
    });
  } catch (error: any) {
    console.error('Employee attendance GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser(req);
    if (!session?.id || !session?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is missing or invalid', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    const userId: number = session.id;
    const companyId: number = session.companyId;

    const body = await req.json();
    const { action } = body;

    const clientIp = getClientIp(req);
    const { dateStr: todayStr, timeStr, minutes: currentMinutes } = getIstNow();

    // Fetch company settings for shift, late cutoff, and working days
    const [settings] = await query<any[]>(
      'SELECT start_time, end_time, late_cutoff_time, grace_minutes, working_days FROM company_settings WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    let thresholdMinutes = 9 * 60 + 15; // 09:15 default

    if (settings?.late_cutoff_time) {
      const cutMin = timeToMinutes(String(settings.late_cutoff_time));
      if (cutMin !== null) thresholdMinutes = cutMin;
    } else {
      let startHour = 9;
      let startMin = 0;
      if (settings?.start_time) {
        const [h, m] = String(settings.start_time).split(':').map(Number);
        if (!isNaN(h)) startHour = h;
        if (!isNaN(m)) startMin = m;
      }
      const grace = settings?.grace_minutes ?? 15;
      thresholdMinutes = startHour * 60 + startMin + grace;
    }

    const isLate = currentMinutes > thresholdMinutes;
    const initialStatus = isLate ? 'Late' : 'Present';

    const lateCutoffFormatted = `${String(Math.floor(thresholdMinutes / 60)).padStart(2, '0')}:${String(thresholdMinutes % 60).padStart(2, '0')}`;

    if (action === 'check_in') {
      // 1. Verify Office Network and WFH status
      const verification = await verifyOfficeNetwork(companyId, userId, clientIp);

      if (!verification.allowed) {
        let blockError = `Check-in blocked: You are connected from IP ${clientIp}, which is not an authorized company WiFi network. Connect to office WiFi or submit a Work From Home request.`;

        if (verification.wfhStatus === 'Pending') {
          blockError = 'Check-in blocked: Your Work From Home request for today is currently Pending HR approval. Once approved by HR, you will be able to check in.';
        } else if (verification.wfhStatus === 'Rejected') {
          blockError = 'Check-in blocked: Your Work From Home request for today was Rejected by HR. Check-in is only permitted when connected to the authorized office WiFi network.';
        } else if (verification.wfhStatus === 'None') {
          blockError = `Check-in blocked: You are connected from IP ${clientIp}, which is not an authorized office WiFi. If you are working from home today, please submit a Work From Home request and wait for HR approval.`;
        }

        return NextResponse.json({
          success: false,
          blocked: true,
          error: blockError,
          clientIp,
          verification,
        }, { status: 403 });
      }

      const assignedMode = verification.mode === 'WFH' ? 'WFH' : 'Office';

      await query(`
        INSERT INTO attendance (company_id, user_id, date, check_in, mode, status, ip_address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          check_in = COALESCE(check_in, VALUES(check_in)),
          mode = VALUES(mode),
          ip_address = VALUES(ip_address),
          notes = VALUES(notes),
          status = IF(status = 'Present' OR status = 'Late', status, VALUES(status))
      `, [companyId, userId, todayStr, timeStr, assignedMode, initialStatus, clientIp, assignedMode === 'WFH' ? 'Approved WFH' : 'Office WiFi']);

      const modeLabel = assignedMode === 'WFH' ? 'WFH (HR Approved)' : 'Office';

      return NextResponse.json({
        success: true,
        message: `Checked in at ${timeStr.slice(0, 5)} (${modeLabel})${isLate ? ` · Late Mark (Office cutoff was ${lateCutoffFormatted})` : ''}`,
        checkInTime: timeStr.slice(0, 5),
        mode: assignedMode,
        status: initialStatus,
        lateCutoff: lateCutoffFormatted,
        isLate,
        clientIp,
      });
    }

    if (action === 'check_out') {
      await query(`
        INSERT INTO attendance (company_id, user_id, date, check_out, mode, status, ip_address)
        VALUES (?, ?, ?, ?, 'Office', 'Present', ?)
        ON DUPLICATE KEY UPDATE
          check_out = VALUES(check_out)
      `, [companyId, userId, todayStr, timeStr, clientIp]);

      return NextResponse.json({
        success: true,
        message: `Checked out at ${timeStr.slice(0, 5)}`,
        checkOutTime: timeStr.slice(0, 5),
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid attendance action' }, { status: 400 });
  } catch (error: any) {
    console.error('Employee attendance POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
