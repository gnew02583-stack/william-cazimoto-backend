// routes/paymentRoutes.js
// Endpoint que o botão "Pagar sinal — M-Pesa" do site chama.
// Grava o pedido na base de dados e reencaminha para a API oficial.

const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { initiateC2BPayment } = require('../utils/mpesa');

const router = express.Router();

const PHONE_REGEX = /^(258)?(84|85|86|87)\d{7}$/;

/* ------------------------- POST /api/payments/mpesa ------------------------- */
router.post('/mpesa', async (req, res) => {
  try {
    const { plan, phone, amount, userId } = req.body;

    const cleanPhone = (phone || '').replace(/\s+/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      return res.status(400).json({ ok: false, message: 'Número M-Pesa inválido. Usa o formato 84/85/86/87XXXXXXX.' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ ok: false, message: 'Valor do pagamento inválido.' });
    }
    if (!plan) {
      return res.status(400).json({ ok: false, message: 'Plano em falta.' });
    }

    // A API M-Pesa exige o número no formato internacional sem "+".
    const msisdn = cleanPhone.startsWith('258') ? cleanPhone : `258${cleanPhone}`;

    const transactionReference = `WC-${Date.now()}`;
    const thirdPartyReference = crypto.randomBytes(6).toString('hex');

    // Grava já como "pendente" antes de chamar a operadora.
    const insert = db
      .prepare(
        `INSERT INTO payments (user_id, plan, phone, amount, transaction_reference, status)
         VALUES (?, ?, ?, ?, ?, 'pendente')`
      )
      .run(userId || null, plan, msisdn, Number(amount), transactionReference);

    let mpesaResult;
    try {
      mpesaResult = await initiateC2BPayment({
        phone: msisdn,
        amount: Number(amount),
        transactionReference,
        thirdPartyReference
      });
    } catch (mpesaErr) {
      // Falha a falar com a M-Pesa (ex: credenciais em falta/erradas).
      db.prepare('UPDATE payments SET status = ?, raw_response = ? WHERE id = ?').run(
        'erro',
        String(mpesaErr.message),
        insert.lastInsertRowid
      );
      console.error('Erro ao contactar a M-Pesa:', mpesaErr.message);
      return res.status(502).json({
        ok: false,
        message: 'Não foi possível contactar o M-Pesa neste momento. Tenta novamente em instantes.'
      });
    }

    const success = mpesaResult.data && mpesaResult.data.output_ResponseCode === 'INS-0';
    const status = success ? 'concluido' : 'falhou';

    db.prepare('UPDATE payments SET status = ?, mpesa_conversation_id = ?, raw_response = ? WHERE id = ?').run(
      status,
      mpesaResult.data?.output_ConversationID || null,
      JSON.stringify(mpesaResult.data || {}),
      insert.lastInsertRowid
    );

    if (!success) {
      return res.status(400).json({
        ok: false,
        message: mpesaResult.data?.output_ResponseDesc || 'O pagamento não foi aprovado pela M-Pesa.'
      });
    }

    return res.json({
      ok: true,
      message: 'Pagamento confirmado com sucesso.',
      reference: transactionReference
    });
  } catch (err) {
    console.error('Erro no endpoint de pagamento:', err);
    return res.status(500).json({ ok: false, message: 'Erro interno ao processar o pagamento.' });
  }
});

/* ------------------------- GET /api/payments/:reference ------------------------- */
// Permite ao frontend consultar o estado de um pagamento pela referência.
router.get('/:reference', (req, res) => {
  const payment = db
    .prepare('SELECT plan, amount, status, created_at FROM payments WHERE transaction_reference = ?')
    .get(req.params.reference);

  if (!payment) return res.status(404).json({ ok: false, message: 'Pagamento não encontrado.' });
  res.json({ ok: true, payment });
});

module.exports = router;
