import fs from 'fs';
import path from 'path';
import { query } from '@/lib/db';
import { EmailAttachment } from '@/lib/email';

export async function getCompanyInvitationAttachments(companyId: number): Promise<EmailAttachment[]> {
  try {
    const docs = await query<any[]>(`
      SELECT id, title, file_name, file_url, file_path
      FROM invitation_documents
      WHERE company_id = ? AND is_active = 1
      ORDER BY id ASC
    `, [companyId]);

    const attachments: EmailAttachment[] = [];
    for (const d of docs) {
      let diskPath: string | null = null;

      if (d.file_path && fs.existsSync(d.file_path)) {
        diskPath = d.file_path;
      } else if (d.file_url) {
        const candidate = path.join(process.cwd(), 'public', d.file_url);
        if (fs.existsSync(candidate)) {
          diskPath = candidate;
        }
      }

      if (diskPath) {
        attachments.push({
          filename: d.file_name || d.title,
          path: diskPath,
        });
      }
    }
    return attachments;
  } catch (e: any) {
    console.warn('Failed to load company invitation attachments:', e.message);
    return [];
  }
}
