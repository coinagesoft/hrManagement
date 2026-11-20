import { query } from '@/lib/db';

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    return cleanIp(first);
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return cleanIp(realIp);

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cleanIp(cfIp);

  return '127.0.0.1';
}

function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  // Strip IPv6-mapped IPv4 prefix
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.replace('::ffff:', '');
  }
  // Normalize IPv6 localhost
  if (cleaned === '::1') {
    return '127.0.0.1';
  }
  // Strip port if present (e.g. 192.168.1.1:8080)
  if (cleaned.includes(':') && !cleaned.includes('::')) {
    cleaned = cleaned.split(':')[0];
  }
  return cleaned;
}

export interface NetworkVerificationResult {
  allowed: boolean;
  mode: 'Office' | 'WFH' | 'Blocked';
  isEnforced: boolean;
  isWfhApproved: boolean;
  clientIp: string;
  reason: string;
  label: string;
  matchedNetwork?: string | null;
  allowedNetworks: { id: string; label: string; ip: string }[];
}

export async function verifyOfficeNetwork(
  companyId: number,
  userId: number,
  clientIp: string
): Promise<NetworkVerificationResult> {
  const [settings] = await query<any[]>(
    'SELECT enforce_office_ip, allowed_ips FROM company_settings WHERE company_id = ? LIMIT 1',
    [companyId]
  );

  let allowedIps: { id: string; label: string; ip: string; active?: boolean }[] = [];
  try {
    if (settings?.allowed_ips) {
      allowedIps = typeof settings.allowed_ips === 'string'
        ? JSON.parse(settings.allowed_ips)
        : settings.allowed_ips;
    }
  } catch {}

  // Filter only active configured networks
  const activeNets = allowedIps.filter((n) => n.active !== false);
  const isEnforced = Boolean(settings?.enforce_office_ip ?? true);

  // If IP enforcement is turned off by admin
  if (!isEnforced) {
    return {
      allowed: true,
      mode: 'Office',
      isEnforced: false,
      isWfhApproved: false,
      clientIp,
      reason: 'Office network check is disabled by company policy.',
      label: 'Network check disabled',
      allowedNetworks: activeNets,
    };
  }

  // Check if clientIp matches any allowed network
  const matched = activeNets.find((n) => {
    const target = cleanIp(n.ip);
    if (target === clientIp) return true;
    // Allow localhost/127.0.0.1 equivalence
    if ((target === '127.0.0.1' || target === 'localhost') && (clientIp === '127.0.0.1' || clientIp === 'localhost')) {
      return true;
    }
    return false;
  });

  if (matched) {
    return {
      allowed: true,
      mode: 'Office',
      isEnforced: true,
      isWfhApproved: false,
      clientIp,
      reason: `Connected to verified office network: ${matched.label} (${matched.ip})`,
      label: matched.label,
      matchedNetwork: matched.label,
      allowedNetworks: activeNets,
    };
  }

  // Check if employee has an approved WFH request for today
  const todayStr = new Date().toISOString().split('T')[0];
  const [wfh] = await query<any[]>(`
    SELECT id, reason
    FROM wfh_requests
    WHERE company_id = ? AND user_id = ? AND date = ? AND status = 'Approved'
    LIMIT 1
  `, [companyId, userId, todayStr]);

  if (wfh) {
    return {
      allowed: true,
      mode: 'WFH',
      isEnforced: true,
      isWfhApproved: true,
      clientIp,
      reason: 'Approved Work From Home today. Network restriction bypassed.',
      label: 'Approved WFH',
      allowedNetworks: activeNets,
    };
  }

  // Blocked
  return {
    allowed: false,
    mode: 'Blocked',
    isEnforced: true,
    isWfhApproved: false,
    clientIp,
    reason: `Your network IP (${clientIp}) is not an authorized office WiFi and no approved WFH was found for today.`,
    label: 'Unverified Network',
    allowedNetworks: activeNets,
  };
}
