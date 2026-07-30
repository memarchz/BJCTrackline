import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env';

let transporter: Transporter | null | undefined;

// Lazily built once — `undefined` means "not yet attempted", `null` means
// "attempted but SMTP isn't configured, don't retry every call".
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    console.warn('[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — email sending is disabled.');
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({ from: env.smtp.from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });
  } catch (err) {
    // Email is a best-effort side effect of the nudge action — a delivery
    // failure shouldn't fail the request or roll back the DB changes.
    console.error('[mailer] Failed to send email:', err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PRIORITY_CHIP: Record<'low' | 'medium' | 'high', { bg: string; color: string; label: string }> = {
  high: { bg: '#fdecec', color: '#c0392b', label: '&#9650;&nbsp; High priority' },
  medium: { bg: '#fef3e2', color: '#b45309', label: 'Medium priority' },
  low: { bg: '#eef1f6', color: '#5c6a80', label: 'Low priority' },
};

// Table-based layout with MSO conditionals for the CTA button — this is the
// same structure as the design prototype's TaskAssignedEmail.html (see
// `Job Tracking System Design/TaskAssignedEmail.html`), adapted for the
// nudge/follow-up copy instead of the initial assignment notice. Table
// layout + inline styles are deliberate, not a stylistic choice we could
// simplify away — it's what actually survives Outlook's Word rendering
// engine and Gmail's style stripping.
export function nudgeEmailHtml(opts: {
  recipientName: string;
  actorName: string;
  actorTitle?: string | null;
  taskTitle: string;
  teamName: string;
  priority: 'low' | 'medium' | 'high';
  dueDateText: string;
  dueRelativeText: string;
  dueSoon: boolean;
  statusLabel: string;
  brief: string;
  taskUrl: string;
}): string {
  const title = escapeHtml(opts.taskTitle);
  const recipient = escapeHtml(opts.recipientName);
  const actor = escapeHtml(opts.actorName);
  const actorWithTitle = opts.actorTitle ? `${actor} &middot; ${escapeHtml(opts.actorTitle)}` : actor;
  const chip = PRIORITY_CHIP[opts.priority];
  const dueColor = opts.dueSoon ? '#c0392b' : '#10203f';
  const url = escapeHtml(opts.taskUrl);
  const preheader = `${title} — ${chip.label.replace(/&nbsp;|&#9650;/g, '').trim()}, due ${opts.dueDateText}. ${actor} wants a status update.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Task follow-up — BJC Trackline</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#eef2f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f8;">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,31,69,.10);">

  <!-- Header / brand -->
  <tr>
  <td style="background:#12275a;padding:26px 36px;" bgcolor="#12275a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="46" valign="middle" style="width:46px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" valign="middle" width="46" height="46" bgcolor="#2563eb" style="width:46px;height:46px;background:#2563eb;border-radius:13px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:46px;text-align:center;">&#10003;</td>
        </tr></table>
      </td>
      <td valign="middle" style="padding-left:14px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-.3px;line-height:1.1;">BJC Trackline</div>
        <div style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#93b4f5;padding-top:3px;">Job Tracking System</div>
      </td>
      <td valign="middle" align="right">
        <span style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9fb6e6;background:rgba(255,255,255,.08);border-radius:20px;padding:7px 13px;">Notification</span>
      </td>
    </tr>
    </table>
  </td>
  </tr>

  <!-- Accent bar -->
  <tr><td style="height:4px;background:#f59e0b;font-size:0;line-height:0;" bgcolor="#f59e0b">&nbsp;</td></tr>

  <!-- Hero copy -->
  <tr>
  <td style="padding:40px 36px 8px;">
    <div style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f59e0b;padding-bottom:12px;">Task follow-up</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#10203f;line-height:1.28;letter-spacing:-.4px;">Following up on<br>${title}</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#5c6a80;line-height:1.6;padding-top:14px;">Hi ${recipient}, <strong style="color:#10203f;">${actor}</strong> wanted to check in on this task. Here&rsquo;s a quick recap.</div>
  </td>
  </tr>

  <!-- Task detail card -->
  <tr>
  <td style="padding:24px 36px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8fc;border:1px solid #e4e9f2;border-radius:14px;">
    <tr>
    <td style="padding:22px 24px;">

      <!-- Priority + team chips -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:${chip.bg};border-radius:8px;padding:6px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${chip.color};">${chip.label}</td>
        <td style="width:8px;font-size:0;">&nbsp;</td>
        <td style="background:#e9effb;border-radius:8px;padding:6px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#2563eb;">${escapeHtml(opts.teamName)}</td>
      </tr></table>

      <div style="height:18px;font-size:0;line-height:0;">&nbsp;</div>

      <!-- Detail rows -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;">
        <tr>
          <td width="120" style="width:120px;padding:9px 0;font-size:13px;color:#8592a8;">Task</td>
          <td style="padding:9px 0;font-size:14px;font-weight:600;color:#10203f;">${title}</td>
        </tr>
        <tr><td colspan="2" style="border-top:1px solid #e4e9f2;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td width="120" style="width:120px;padding:9px 0;font-size:13px;color:#8592a8;">Nudged by</td>
          <td style="padding:9px 0;font-size:14px;font-weight:600;color:#10203f;">${actorWithTitle}</td>
        </tr>
        <tr><td colspan="2" style="border-top:1px solid #e4e9f2;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td width="120" style="width:120px;padding:9px 0;font-size:13px;color:#8592a8;">Due date</td>
          <td style="padding:9px 0;font-size:14px;font-weight:600;color:${dueColor};">${escapeHtml(opts.dueDateText)} &nbsp;<span style="font-weight:400;color:#8592a8;">${escapeHtml(opts.dueRelativeText)}</span></td>
        </tr>
        <tr><td colspan="2" style="border-top:1px solid #e4e9f2;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td width="120" style="width:120px;padding:9px 0;font-size:13px;color:#8592a8;">Status</td>
          <td style="padding:9px 0;font-size:14px;font-weight:600;color:#10203f;">${escapeHtml(opts.statusLabel)}</td>
        </tr>
      </table>

    </td>
    </tr>
    </table>
  </td>
  </tr>

  <!-- Brief -->
  <tr>
  <td style="padding:20px 36px 4px;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8592a8;padding-bottom:8px;">Brief</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#42506a;line-height:1.65;">${escapeHtml(opts.brief)}</div>
  </td>
  </tr>

  <!-- CTA -->
  <tr>
  <td style="padding:28px 36px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td align="left">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:210px;" arcsize="24%" strokecolor="#2563eb" fillcolor="#2563eb"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">View task &rarr;</center></v:roundrect><![endif]-->
        <!--[if !mso]><!-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="#2563eb" style="border-radius:12px;background:#2563eb;">
          <a href="${url}" style="display:block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">View task &rarr;</a>
        </td>
        </tr></table>
        <!--<![endif]-->
      </td>
    </tr></table>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#8592a8;line-height:1.6;padding-top:14px;">Or open it directly: <a href="${url}" style="color:#2563eb;text-decoration:none;font-weight:600;">${url}</a></div>
  </td>
  </tr>

  <!-- Divider -->
  <tr><td style="padding:28px 36px 0;"><div style="border-top:1px solid #e4e9f2;font-size:0;line-height:0;">&nbsp;</div></td></tr>

  <!-- Footer -->
  <tr>
  <td style="padding:20px 36px 34px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94a1b6;line-height:1.7;">You&rsquo;re receiving this because the owner of this task nudged you in BJC Trackline.</div>
      </td>
    </tr></table>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aeb8c9;line-height:1.6;padding-top:14px;">&copy; ${new Date().getFullYear()} BJC Trackline</div>
  </td>
  </tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}
