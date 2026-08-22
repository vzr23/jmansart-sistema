const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token  = authHeader.split(' ')[1];
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret) {
    console.error('[auth] AUTH_JWT_SECRET não definido');
    return res.status(500).json({ error: 'Configuração de autenticação ausente no servidor' });
  }

  try {
    req.jwtPayload = jwt.verify(token, secret);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

module.exports = authMiddleware;
