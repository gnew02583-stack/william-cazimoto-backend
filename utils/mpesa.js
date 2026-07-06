// utils/mpesa.js
// Ajudante para falar com a API M-Pesa Moçambique (Vodacom OpenAPI).
//
// Como funciona a autenticação desta API:
// 1. A Vodacom dá-te, ao registares-te como comerciante, uma API Key
//    e uma chave pública (certificado).
// 2. Para cada pedido, encriptas a tua API Key com essa chave pública
//    (RSA) e envias o resultado em Base64 no cabeçalho Authorization
//    como "Bearer <valor_encriptado>".
// 3. Não existe "login" prévio — o Bearer token é gerado localmente
//    a cada pedido, por isso nunca expira.
//
// Documentação oficial (precisa de conta de developer):
// https://developer.mpesa.vm.co.mz

const crypto = require('crypto');
const fetch = require('node-fetch');

function buildBearerToken() {
  const apiKey = process.env.MPESA_API_KEY;
  const publicKey = process.env.MPESA_PUBLIC_KEY;

  if (!apiKey || !publicKey) {
    throw new Error(
      'Faltam as variáveis MPESA_API_KEY / MPESA_PUBLIC_KEY no .env — obtém-nas no portal de developer da M-Pesa.'
    );
  }

  const formattedKey = publicKey.includes('BEGIN PUBLIC KEY')
    ? publicKey
    : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

  const encrypted = crypto.publicEncrypt(
    { key: formattedKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey)
  );

  return encrypted.toString('base64');
}

/**
 * Inicia uma cobrança M-Pesa (C2B single stage).
 * @param {Object} params
 * @param {string} params.phone - número MSISDN, ex: "258840000000"
 * @param {number} params.amount - valor em Meticais
 * @param {string} params.transactionReference - referência interna única
 * @param {string} params.thirdPartyReference - referência da tua aplicação
 */
async function initiateC2BPayment({ phone, amount, transactionReference, thirdPartyReference }) {
  const bearerToken = buildBearerToken();
  const url = `${process.env.MPESA_API_HOST}/ipg/v1x/c2bPayment/singleStage/`;

  const body = {
    input_TransactionReference: transactionReference,
    input_CustomerMSISDN: phone,
    input_Amount: String(amount),
    input_ThirdPartyReference: thirdPartyReference,
    input_ServiceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.MPESA_ORIGIN,
      Authorization: `Bearer ${bearerToken}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  return { httpStatus: response.status, data };
}

module.exports = { initiateC2BPayment };
