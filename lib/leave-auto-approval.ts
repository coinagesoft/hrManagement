import { query } from '@/lib/db';
import { sendLeaveAutoApprovedEmail } from '@/lib/email';

export async function processLeaveAutoApprovals(targetCompanyId?: number | null): Promise<number> {
  let approvedCount = 0;
  try {
    let sql = `
      SELECT 
        lr.id,
        lr.company_id,
        lr.user_id,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.days_count,
        lr.reason,
        lr.status,
        lr.created_at,
        u.name AS employee_name,
        u.employee_code,
        u.department,
        c.name AS company_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN companies c ON lr.company_id = c.id
      WHERE lr.status = 'Pending'
        AND DATEDIFF(lr.start_date, DATE(lr.created_at)) >= 5
        AND lr.created_at <= (NOW() - INTERVAL 48 HOUR)
    `;
    const params: any[] = [];
    if (targetCompanyId) {
      sql += ' AND lr.company_id = ?';
      params.push(targetCompanyId);
    }

    const pendingRequests = await query<any[]>(sql, params);
    if (!pendingRequests || pendingRequests.length === 0) {
      return 0;
    }

    const now = new Date();
    const currentMonthNum = now.getMonth() + 1;
    const currentYearNum = now.getFullYear();
    const priorMonthsCount = Math.max(0, currentMonthNum - 1);

    for (const req of pendingRequests) {
      // 1. Fetch leave policy for this company
      const [policy] = await query<any[]>(
        'SELECT casual_per_month, sick_per_month, carry_forward_enabled FROM leave_policies WHERE company_id = ? LIMIT 1',
        [req.company_id]
      );

      const casualPerMo = Number(policy?.casual_per_month ?? 1.5);
      const sickPerMo = Number(policy?.sick_per_month ?? 1.0);
      const carryForwardEnabled = Boolean(policy?.carry_forward_enabled ?? 1);

      const isCasual = req.leave_type?.toLowerCase().includes('casual');
      const rate = isCasual ? casualPerMo : sickPerMo;

      // 2. Fetch approved leaves for this user in the current year
      const usedLeavesRows = await query<any[]>(`
        SELECT leave_type, MONTH(start_date) AS m, COALESCE(SUM(days_count), 0) AS used_days
        FROM leave_requests
        WHERE company_id = ? AND user_id = ? AND status = 'Approved' AND YEAR(start_date) = ?
        GROUP BY leave_type, MONTH(start_date)
      `, [req.company_id, req.user_id, currentYearNum]);

      const priorUsed = usedLeavesRows
        .filter((r) => r.leave_type?.toLowerCase() === req.leave_type?.toLowerCase() && r.m < currentMonthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      const currentUsed = usedLeavesRows
        .filter((r) => r.leave_type?.toLowerCase() === req.leave_type?.toLowerCase() && r.m === currentMonthNum)
        .reduce((sum, r) => sum + Number(r.used_days), 0);

      let carriedForward = 0;
      if (carryForwardEnabled && priorMonthsCount > 0) {
        const priorAccrued = Math.round(priorMonthsCount * rate * 10) / 10;
        carriedForward = Math.max(0, Math.round((priorAccrued - priorUsed) * 10) / 10);
      }

      const availableCredits = Math.max(0, Math.round((carriedForward + rate - currentUsed) * 10) / 10);
      const daysCount = Number(req.days_count || 1);

      // 3. Auto-approve only if employee has sufficient leave credits
      if (availableCredits >= daysCount) {
        const initialCredits = availableCredits;
        const deductedCredits = daysCount;
        const remainingCredits = Math.max(0, Math.round((availableCredits - deductedCredits) * 10) / 10);

        // Update leave request to Approved
        await query(`
          UPDATE leave_requests
          SET status = 'Approved',
              decided_at = NOW(),
              reason = CONCAT(COALESCE(reason, ''), ' [Auto-approved after 48h (requested 5+ days in advance with sufficient balance)]')
          WHERE id = ? AND status = 'Pending'
        `, [req.id]);

        // Audit log
        await query(
          `INSERT INTO audit_logs (company_id, user_name, action, tone, detail, created_at)
           VALUES (?, 'System (Auto-Approval)', 'Leave auto-approved', 'green', ?, NOW())`,
          [
            req.company_id,
            `${req.employee_name} (${req.employee_code}), ${req.leave_type} (${daysCount}d auto-approved after 48h)`,
          ]
        );

        // 4. Send email notification to HR
        const hrUsers = await query<any[]>(
          `SELECT email, name FROM users WHERE company_id = ? AND role IN ('hr', 'admin') AND status = 'Active'`,
          [req.company_id]
        );

        const fromDateStr = req.start_date instanceof Date ? req.start_date.toISOString().split('T')[0] : String(req.start_date).split('T')[0];
        const toDateStr = req.end_date instanceof Date ? req.end_date.toISOString().split('T')[0] : String(req.end_date).split('T')[0];
        const requestedAtStr = req.created_at instanceof Date ? req.created_at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : String(req.created_at);

        for (const hr of hrUsers) {
          try {
            await sendLeaveAutoApprovedEmail({
              toEmail: hr.email,
              hrName: hr.name,
              employeeName: req.employee_name,
              employeeCode: req.employee_code || `EMP-${req.user_id}`,
              department: req.department,
              leaveType: req.leave_type,
              fromDate: fromDateStr,
              toDate: toDateStr,
              daysCount,
              reason: req.reason || 'Not specified',
              requestedAt: requestedAtStr,
              initialCredits,
              deductedCredits,
              remainingCredits,
              companyName: req.company_name || 'Acme Technologies',
            });
          } catch (mailErr) {
            console.error(`Failed to dispatch auto-approval mail to ${hr.email}:`, mailErr);
          }
        }

        approvedCount++;
      }
    }
  } catch (err) {
    console.error('processLeaveAutoApprovals error:', err);
  }

  return approvedCount;
}
