import { NextResponse, connection } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';

function saveBase64ToPublic(fileName: string, base64Url: string): string {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const match = base64Url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return base64Url;

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${cleanName}`;
    const fullPath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/documents/${uniqueName}`;
  } catch (err) {
    console.error('Failed to save file to public directory:', err);
    return base64Url;
  }
}

function deduceCategory(kind: string): string {
  const k = kind.toLowerCase();
  if (k.includes('aadhaar') || k.includes('pan') || k.includes('passport') || k.includes('identity') || k.includes('address') || k.includes('kyc') || k.includes('voter')) {
    return 'Identity & KYC';
  }
  if (k.includes('degree') || k.includes('marksheet') || k.includes('academic') || k.includes('diploma') || k.includes('transcript') || k.includes('certificate') || k.includes('portfolio')) {
    return 'Education & Certificates';
  }
  if (k.includes('offer') || k.includes('appointment') || k.includes('relieving') || k.includes('experience') || k.includes('contract') || k.includes('service')) {
    return 'Employment & Experience';
  }
  if (k.includes('salary') || k.includes('payslip') || k.includes('cheque') || k.includes('bank') || k.includes('tax') || k.includes('form 16') || k.includes('declaration')) {
    return 'Payroll & Tax';
  }
  if (k.includes('letter') || k.includes('bonafide') || k.includes('request')) {
    return 'Letters & Requests';
  }
  return 'General Documents';
}

function deduceExtension(fileName?: string | null): string {
  if (!fileName) return 'pdf';
  const parts = fileName.split('.');
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return 'pdf';
}

export async function GET(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const folder = searchParams.get('folder');

    let sql = `
      SELECT 
        d.id,
        d.company_id,
        d.user_id,
        d.kind,
        d.folder_category,
        d.requested_by,
        d.status,
        d.date,
        d.note,
        d.file_name,
        d.file_size,
        d.file_type,
        d.file_url,
        d.created_at,
        u.name AS employee_name,
        u.employee_code,
        u.department AS dept
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.company_id = ?
    `;
    const params: any[] = [companyId];

    if (userId && userId !== 'all') {
      sql += ' AND d.user_id = ?';
      params.push(userId);
    }
    if (status && status !== 'all') {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (folder && folder !== 'all') {
      sql += ' AND d.folder_category = ?';
      params.push(folder);
    }

    sql += ' ORDER BY d.id DESC';

    const rows = await query<any[]>(sql, params);

    const documents = rows.map((r) => {
      const ext = r.file_type || deduceExtension(r.file_name);
      return {
        id: r.id,
        userId: r.user_id,
        employeeName: r.employee_name,
        employeeCode: r.employee_code,
        dept: r.dept,
        kind: r.kind,
        folderCategory: r.folder_category || deduceCategory(r.kind),
        by: r.requested_by,
        status: r.status,
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
        note: r.note,
        fileName: r.file_name,
        fileSize: r.file_size || (r.file_name ? '1.2 MB' : null),
        fileType: ext,
        fileUrl: r.file_url,
      };
    });

    return NextResponse.json(
      { success: true, documents },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('Documents GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { userId, kind, note, folderCategory, fileName, fileSize, fileType, fileUrl, status: customStatus } = body;

    if (!userId || !kind) {
      return NextResponse.json({ success: false, error: 'User and document kind are required' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const requestedBy = session?.role === 'admin' ? 'admin' : session?.role === 'employee' ? 'employee' : 'hr';
    const finalFolder = folderCategory || deduceCategory(kind);
    const finalStatus = customStatus || (fileName ? 'Received' : requestedBy === 'employee' ? 'Pending' : 'Requested');
    const finalType = fileType || (fileName ? deduceExtension(fileName) : null);
    const finalSize = fileSize || (fileName ? '1.2 MB' : null);

    // Save Base64 file into public/uploads/documents/ directory
    const publicFileUrl = fileUrl && String(fileUrl).startsWith('data:')
      ? saveBase64ToPublic(fileName || `${kind}.pdf`, fileUrl)
      : fileUrl;

    const result = await query<any>(`
      INSERT INTO documents (company_id, user_id, kind, folder_category, requested_by, status, date, note, file_name, file_size, file_type, file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [companyId, userId, kind, finalFolder, requestedBy, finalStatus, todayStr, note || null, fileName || null, finalSize, finalType, publicFileUrl || null]);

    const userName = session?.name || (requestedBy === 'employee' ? 'Employee' : 'HR Manager');
    await query(
      `INSERT INTO audit_logs (company_id, user_id, user_name, action, tone, detail, created_at)
       VALUES (?, ?, ?, 'Document action', 'blue', ?, NOW())`,
      [companyId, session?.id || null, userName, `${requestedBy === 'employee' ? 'Uploaded/Requested' : 'Added'} ${kind} for user ID ${userId}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Document record created successfully',
      id: result.insertId,
      fileUrl: publicFileUrl,
    });
  } catch (error: any) {
    console.error('Documents POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const body = await req.json();
    const { id, status, fileName, fileSize, fileType, fileUrl, folderCategory, note } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (fileName !== undefined) {
      updates.push('file_name = ?');
      params.push(fileName);
      if (fileName) {
        const ext = fileType || deduceExtension(fileName);
        updates.push('file_type = ?');
        params.push(ext);
        if (!fileSize) {
          updates.push('file_size = ?');
          params.push('1.4 MB');
        }
      }
    }
    if (fileSize !== undefined) {
      updates.push('file_size = ?');
      params.push(fileSize);
    }
    if (fileType !== undefined) {
      updates.push('file_type = ?');
      params.push(fileType);
    }
    if (fileUrl !== undefined) {
      const publicFileUrl = fileUrl && String(fileUrl).startsWith('data:')
        ? saveBase64ToPublic(fileName || 'document.pdf', fileUrl)
        : fileUrl;
      updates.push('file_url = ?');
      params.push(publicFileUrl);
    }
    if (folderCategory !== undefined) {
      updates.push('folder_category = ?');
      params.push(folderCategory);
    }
    if (note !== undefined) {
      updates.push('note = ?');
      params.push(note);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    params.push(id, companyId);
    await query(`
      UPDATE documents 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ? AND company_id = ?
    `, params);

    return NextResponse.json({ success: true, message: 'Document updated successfully' });
  } catch (error: any) {
    console.error('Documents PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  await connection();
  try {
    const session = await getSessionUser();
    let companyId = session?.companyId;

    if (!companyId) {
      const defaultComps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
      companyId = defaultComps[0]?.id || 1;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required' }, { status: 400 });
    }

    await query('DELETE FROM documents WHERE id = ? AND company_id = ?', [id, companyId]);

    return NextResponse.json({ success: true, message: 'Document request deleted' });
  } catch (error: any) {
    console.error('Documents DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
