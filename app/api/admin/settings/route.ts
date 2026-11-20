import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { getClientIp } from '@/lib/ip';

async function resolveCompanyId(): Promise<number> {
  const session = await getSessionUser();
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET(req: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId();
    const currentClientIp = getClientIp(req);

    const [comp] = await query<any[]>(
      'SELECT id, name, code, email, admin_name FROM companies WHERE id = ?',
      [companyId]
    );

    const [settings] = await query<any[]>(
      'SELECT * FROM company_settings WHERE company_id = ?',
      [companyId]
    );

    let parsedIps = [];
    try {
      if (settings?.allowed_ips) {
        parsedIps = typeof settings.allowed_ips === 'string' ? JSON.parse(settings.allowed_ips) : settings.allowed_ips;
      }
    } catch (e) {
      console.error('Error parsing allowed_ips:', e);
      parsedIps = [];
    }

    if (!Array.isArray(parsedIps)) {
      parsedIps = [];
    }

    return NextResponse.json({
      success: true,
      currentClientIp,
      profile: {
        id: comp?.id,
        name: comp?.name || 'Acme Technologies Pvt Ltd',
        code: comp?.code || 'ACM',
        email: comp?.email || '',
        admin: comp?.admin_name || '',
        timezone: 'Asia/Kolkata',
        currency: 'INR (₹)',
      },
      schedule: {
        startTime: settings?.start_time ? String(settings.start_time).slice(0, 5) : '09:30',
        endTime: settings?.end_time ? String(settings.end_time).slice(0, 5) : '18:30',
        graceMinutes: settings?.grace_minutes ?? 15,
        halfDayHours: settings?.half_day_hours ?? 4,
        workingDays: settings?.working_days ? settings.working_days.split(',').map(Number) : [1, 2, 3, 4, 5],
      },
      network: {
        enforceOfficeIp: Boolean(settings?.enforce_office_ip ?? true),
        allowSameDayWfh: Boolean(settings?.allow_same_day_wfh ?? true),
        wfhLimitMonthly: settings?.wfh_limit_monthly ?? 4,
        allowedIps: parsedIps,
      },
    });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to retrieve company settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser();
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { name, schedule, network } = body;

    // Update company name if provide
    if (name) {
      await query('UPDATE companies SET name = ?, updated_at = NOW() WHERE id = ?', [name.trim(), companyId]);
    }

    // Update or insert company_settings
    const startTime = schedule?.startTime ? `${schedule.startTime}:00` : '09:30:00';
    const endTime = schedule?.endTime ? `${schedule.endTime}:00` : '18:30:00';
    const grace = schedule?.graceMinutes ?? 15;
    const halfDay = schedule?.halfDayHours ?? 4;
    const workingDays = schedule?.workingDays ? schedule.workingDays.join(',') : '1,2,3,4,5';

    const enforceIp = network?.enforceOfficeIp ? 1 : 0;
    const sameDay = network?.allowSameDayWfh ? 1 : 0;
    const wfhLimit = network?.wfhLimitMonthly ?? 4;
    const allowedIps = network?.allowedIps ? JSON.stringify(network.allowedIps) : null;

    await query(`
      INSERT INTO company_settings 
      (company_id, start_time, end_time, grace_minutes, half_day_hours, working_days, wfh_limit_monthly, allow_same_day_wfh, enforce_office_ip, allowed_ips)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        start_time = VALUES(start_time),
        end_time = VALUES(end_time),
        grace_minutes = VALUES(grace_minutes),
        half_day_hours = VALUES(half_day_hours),
        working_days = VALUES(working_days),
        wfh_limit_monthly = VALUES(wfh_limit_monthly),
        allow_same_day_wfh = VALUES(allow_same_day_wfh),
        enforce_office_ip = VALUES(enforce_office_ip),
        allowed_ips = VALUES(allowed_ips),
        updated_at = NOW()
    `, [companyId, startTime, endTime, grace, halfDay, workingDays, wfhLimit, sameDay, enforceIp, allowedIps]);

    const userName = session?.name || 'Administrator';
    const clientIp = getClientIp(request);
    await query(`
      INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, ip_address, created_at)
      VALUES (?, ?, ?, 'Settings updated', 'blue', ?, ?, NOW())
    `, [
      companyId,
      session?.id || null,
      userName,
      `Updated settings: Enforce office IP = ${enforceIp ? 'Yes' : 'No'}, allowed networks count = ${network?.allowedIps?.length || 0}`,
      clientIp
    ]);

    return NextResponse.json({ success: true, message: 'Settings successfully updated.' });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update company settings' }, { status: 500 });
  }
}
