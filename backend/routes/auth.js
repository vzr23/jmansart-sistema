const jwt = require('jsonwebtoken');

function login(req, res) {
  const { user, password } = req.body ?? {};

  const validUser = process.env.AUTH_USER;
  const validPass = process.env.AUTH_PASS;
  const secret    = process.env.AUTH_JWT_SECRET;

  if (!validUser || !validPass || !secret) {
    console.error('[auth] Variáveis AUTH_USER, AUTH_PASS ou AUTH_JWT_SECRET não definidas');
    return res.status(500).json({ error: 'Configuração de autenticação ausente no servidor' });
  }

  if (user !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  const token = jwt.sign({ user }, secret, { expiresIn: '8h' });
  return res.json({ token });
}

module.exports = { login };
