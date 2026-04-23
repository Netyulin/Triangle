import nodemailer from 'nodemailer';

let transporterPromise = null;

function normalizeBoolean(value, fallback = false) {
  const source = String(value ?? '').trim().toLowerCase();
  if (!source) return fallback;
  if (['1', 'true', 'yes', 'y', 'on'].includes(source)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(source)) return false;
  return fallback;
}

async function createTransporter() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS.');
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secure = normalizeBoolean(process.env.SMTP_SECURE, port === 465);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });

  await transporter.verify();
  return transporter;
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }
  return transporterPromise;
}

function resolveFromAddress() {
  const from = String(process.env.SMTP_FROM || '').trim();
  if (from) return from;
  return String(process.env.SMTP_USER || '').trim();
}

export async function sendPasswordResetEmail({ to, resetUrl, username, expiresMinutes = 30 }) {
  const recipient = String(to || '').trim();
  const safeName = String(username || '用户').trim() || '用户';
  const link = String(resetUrl || '').trim();

  if (!recipient || !link) {
    throw new Error('invalid reset email payload');
  }

  const transporter = await getTransporter();
  const from = resolveFromAddress();

  const subject = '重置密码 - 三角软件';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1f2937; line-height:1.7;">
      <h2 style="margin:0 0 16px;">重置密码请求</h2>
      <p>你好，${safeName}：</p>
      <p>我们收到了你的密码重置请求。请点击下面的按钮完成密码重置：</p>
      <p style="margin:24px 0;">
        <a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
          立即重置密码
        </a>
      </p>
      <p>该链接将在 <strong>${expiresMinutes} 分钟</strong> 后失效，且只能使用一次。</p>
      <p>如果不是你本人操作，请忽略此邮件，你的账号仍然安全。</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="font-size:12px;color:#6b7280;">若按钮无法点击，请复制以下链接到浏览器打开：<br/>${link}</p>
    </div>
  `;

  const text = [
    '重置密码请求',
    '',
    `你好，${safeName}：`,
    '我们收到了你的密码重置请求，请访问下面的链接完成密码重置：',
    link,
    '',
    `该链接将在 ${expiresMinutes} 分钟后失效，且只能使用一次。`,
    '如果不是你本人操作，请忽略此邮件。'
  ].join('\n');

  await transporter.sendMail({
    from,
    to: recipient,
    subject,
    html,
    text
  });
}

