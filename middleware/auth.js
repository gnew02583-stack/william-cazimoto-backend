// middleware/auth.js
// Verifica o token JWT enviado no cabeçalho "Authorization: Bearer <token>"
// e bloqueia o acesso a rotas privadas se o token não for válido.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, message: 'Sessão não encontrada. Inicia sessão novamente.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Sessão expirada ou inválida. Inicia sessão novamente.' });
  }
}

module.exports = { requireAuth };
