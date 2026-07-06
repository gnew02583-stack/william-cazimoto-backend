// routes/authRoutes.js
// Registo e login reais: palavras-passe encriptadas com bcrypt,
// sessão mantida com um token JWT (o browser guarda o token e
// envia-o nas próximas chamadas).

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------- POST /api/auth/register ------------------------- */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Preenche nome, email e palavra-passe.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ ok: false, message: 'Email inválido.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: 'A palavra-passe deve ter pelo menos 8 caracteres.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ ok: false, message: 'Já existe uma conta com este email.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const info = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name.trim(), email.toLowerCase(), passwordHash);

    const token = signToken({ id: info.lastInsertRowid, name: name.trim(), email: email.toLowerCase() });

    return res.status(201).json({
      ok: true,
      message: 'Conta criada com sucesso.',
      token,
      user: { id: info.lastInsertRowid, name: name.trim(), email: email.toLowerCase() }
    });
  } catch (err) {
    console.error('Erro no registo:', err);
    return res.status(500).json({ ok: false, message: 'Erro interno ao criar a conta.' });
  }
});

/* ------------------------- POST /api/auth/login ------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Preenche email e palavra-passe.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    // Mensagem genérica propositadamente — não revela se foi o email
    // ou a palavra-passe que estava errada (evita ajudar um atacante).
    const invalidMsg = { ok: false, message: 'Email ou palavra-passe incorretos.' };

    if (!user) return res.status(401).json(invalidMsg);

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) return res.status(401).json(invalidMsg);

    const token = signToken({ id: user.id, name: user.name, email: user.email });

    return res.json({
      ok: true,
      message: 'Sessão iniciada com sucesso.',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ ok: false, message: 'Erro interno ao iniciar sessão.' });
  }
});

/* ------------------------- GET /api/auth/me ------------------------- */
// Rota protegida de exemplo — só responde se o token for válido.
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

function signToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = router;
