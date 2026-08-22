const { Resend } = require('resend');

async function sendOtp(toEmail, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada');

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: 'J.Mansart Sistema <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Código de verificação – J.Mansart',
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e3a5f;margin:0 0 6px;">J.Mansart</h2>
        <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Seu código de acesso ao sistema:</p>
        <div style="font-size:42px;font-weight:700;letter-spacing:14px;color:#1e3a5f;text-align:center;background:#f1f5f9;padding:22px 16px;border-radius:8px;">
          ${code}
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;line-height:1.6;">
          Este código expira em <strong>5 minutos</strong>.<br>
          Se você não tentou acessar o sistema, ignore este e-mail.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

module.exports = { sendOtp };
