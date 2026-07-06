// server.js
// Ponto de entrada do backend. Corre com: npm start

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || '*',
    methods: ['GET', 'POST']
  })
);

// Limita tentativas repetidas (protege login e pagamentos de abuso/força bruta).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados pedidos. Tenta novamente daqui a pouco.' }
});
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor de William Cazimoto no ar.' });
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handler genérico para rotas não encontradas.
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Rota não encontrada.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✔ Servidor a correr em http://localhost:${PORT}`);
});
