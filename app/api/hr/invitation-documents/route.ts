import { NextResponse, connection } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function resolveCompanyId(): Promise<number> {
  const session = await getSessionUser();
  if (session?.companyId) return session.companyId;
  const comps = await query<any[]>('SELECT id FROM companies ORDER BY id ASC LIMIT 1');
  return comps[0]?.id || 1;
}

export async function GET() {
  await connection();
  try {
    const companyId = await resolveCompanyId();

    const docs = await query<any[]>(`
      SELECT id, company_id, title, file_name, file_url, file_path, file_size, file_type, is_active, created_at
      FROM invitation_documents
      WHERE company_id = ?
      ORDER BY id DESC
    `, [companyId]);

    return NextResponse.json({
      success: true,
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        fileName: d.file_name,
        fileUrl: d.file_url,
        fileSize: Number(d.file_size || 0),
        fileType: d.file_type || 'application/pdf',
        isActive: Boolean(d.is_active),
        createdAt: d.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Failed to get invitation documents:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId();
    const session = await getSessionUser();

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invitation-docs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      const singleFile = formData.get('file') as File | null;
      const customTitle = (formData.get('title') as string) || '';

      const filesToProcess = files.length > 0 ? files : singleFile ? [singleFile] : [];

      if (filesToProcess.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
      }

      const insertedDocs = [];

      for (const file of filesToProcess) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const diskFileName = `${Date.now()}_${safeOriginalName}`;
        const diskPath = path.join(uploadDir, diskFileName);
        const relativeUrl = `/uploads/invitation-docs/${diskFileName}`;

        fs.writeFileSync(diskPath, buffer);

        const docTitle = customTitle.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        const res = await query<any>(`
          INSERT INTO invitation_documents (company_id, title, file_name, file_url, file_path, file_size, file_type, uploaded_by, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
        `, [
          companyId,
          docTitle,
          file.name,
          relativeUrl,
          diskPath,
          buffer.length,
          file.type || 'application/octet-stream',
          session?.id || null,
        ]);

        insertedDocs.push({
          id: res.insertId,
          title: docTitle,
          fileName: file.name,
          fileUrl: relativeUrl,
          fileSize: buffer.length,
          fileType: file.type,
          isActive: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: `${insertedDocs.length} onboarding document(s) uploaded successfully`,
        documents: insertedDocs,
      });
    }

    // JSON base64 upload fallback
    const body = await request.json();
    const { title, fileName, fileData, fileType } = body;

    if (!fileData || !fileName) {
      return NextResponse.json({ error: 'fileName and fileData are required' }, { status: 400 });
    }

    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    const safeOriginalName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const diskFileName = `${Date.now()}_${safeOriginalName}`;
    const diskPath = path.join(uploadDir, diskFileName);
    const relativeUrl = `/uploads/invitation-docs/${diskFileName}`;

    fs.writeFileSync(diskPath, buffer);

    const docTitle = title?.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const res = await query<any>(`
      INSERT INTO invitation_documents (company_id, title, file_name, file_url, file_path, file_size, file_type, uploaded_by, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `, [
      companyId,
      docTitle,
      fileName,
      relativeUrl,
      diskPath,
      buffer.length,
      fileType || 'application/pdf',
      session?.id || null,
    ]);

    return NextResponse.json({
      success: true,
      message: 'Invitation document uploaded successfully',
      document: {
        id: res.insertId,
        title: docTitle,
        fileName,
        fileUrl: relativeUrl,
        fileSize: buffer.length,
        fileType: fileType || 'application/pdf',
        isActive: true,
      },
    });
  } catch (error: any) {
    console.error('Failed to upload invitation document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const [doc] = await query<any[]>(
      'SELECT id, file_path, file_url FROM invitation_documents WHERE id = ? AND company_id = ? LIMIT 1',
      [id, companyId]
    );

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Safely remove file on disk if it exists
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (e) {
        console.warn('Failed to delete file from disk:', e);
      }
    } else if (doc.file_url) {
      const fallbackPath = path.join(process.cwd(), 'public', doc.file_url);
      if (fs.existsSync(fallbackPath)) {
        try {
          fs.unlinkSync(fallbackPath);
        } catch (e) {
          console.warn('Failed to delete file from fallback disk path:', e);
        }
      }
    }

    await query('DELETE FROM invitation_documents WHERE id = ? AND company_id = ?', [id, companyId]);

    return NextResponse.json({
      success: true,
      message: 'Onboarding document removed successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete onboarding document:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await connection();
  try {
    const companyId = await resolveCompanyId();
    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'id and isActive (boolean) are required' }, { status: 400 });
    }

    await query(
      'UPDATE invitation_documents SET is_active = ? WHERE id = ? AND company_id = ?',
      [isActive ? 1 : 0, id, companyId]
    );

    return NextResponse.json({
      success: true,
      message: `Document ${isActive ? 'enabled' : 'disabled'} for onboarding attachments`,
    });
  } catch (error: any) {
    console.error('Failed to update invitation document status:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
