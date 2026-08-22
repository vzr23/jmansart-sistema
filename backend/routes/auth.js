const jwt      = require('jsonwebtoken');
const { saveOtp, verifyOtp } = require('../utils/otpStore');
const { sendOtp }            = require('../utils/mailer');

async function login(req, res) {
  const { user, password } = req.body ?? {};

  const validUser = process.env.AUTH_USER;
  const validPass = process.env.AUTH_PASS;
  const secret    = process.env.AUTH_JWT_SECRET;
  const authEmail = process.env.AUTH_EMAIL;

  if (!validUser || !validPass || !secret || !authEmail) {
    console.error('[auth] Variáveis AUTH_USER, AUTH_PASS, AUTH_JWT_SECRET e AUTH_EMAIL são obrigatórias');
    return res.status(500).json({ error: 'Configuração de autenticação incompleta no servidor' });
  }

  if (user !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  try {
    const code = saveOtp(user);
    await sendOtp(authEmail, code);
    return res.json({ requiresOtp: true });
  } catch (err) {
    console.error('[auth] Erro ao enviar OTP:', err);
    return res.status(500).json({ error: 'Falha ao enviar código de verificação' });
  }
}

async function verifyOtpRoute(req, res) {
  const { user, code } = req.body ?? {};
  const secret = process.env.AUTH_JWT_SECRET;

  if (!user || !code) {
    return res.status(400).json({ error: 'Usuário e código são obrigatórios' });
  }

  if (!verifyOtp(user, code)) {
    return res.status(401).json({ error: 'Código inválido ou expirado' });
  }

  const token = jwt.sign({ user }, secret, { expiresIn: '8h' });
  return res.json({ token });
}

module.exports = { login, verifyOtpRoute };
