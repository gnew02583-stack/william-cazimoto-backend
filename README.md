# Backend — William Cazimoto Portfolio

API em Node.js/Express com:
- **Login e registo reais** (palavras-passe encriptadas com bcrypt, sessão com JWT)
- **Pagamentos M-Pesa** via API oficial da Vodacom Moçambique (C2B single stage)
- Base de dados **SQLite** local (ficheiro `db/app.db`, criado automaticamente)

## 1. Instalar

Precisas de [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

```bash
cd server
npm install
```

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Depois abre `.env` e preenche:

| Variável | Onde obter |
|---|---|
| `JWT_SECRET` | Gera com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FRONTEND_ORIGIN` | O endereço de onde o site é servido (ex: `http://localhost:5500`) |
| `MPESA_API_KEY`, `MPESA_PUBLIC_KEY`, `MPESA_SERVICE_PROVIDER_CODE` | Regista-te como comerciante em **https://developer.mpesa.vm.co.mz** — a Vodacom fornece estes valores após aprovação |
| `MPESA_API_HOST` | `https://api.sandbox.vm.co.mz:18352` para testes; a Vodacom dá-te o URL de produção depois de aprovado |

⚠️ **Nunca** publiques o ficheiro `.env` real (já está no `.gitignore`).

## 3. Correr o servidor

```bash
npm start
```

Devias ver: `✔ Servidor a correr em http://localhost:4000`

Para desenvolvimento com reinício automático:
```bash
npm run dev
```

## 4. Ligar ao frontend

No `script.js` do site (pasta principal do portfólio), já está configurado para
chamar este backend em `http://localhost:4000/api`. Se mudares a porta ou
publicares o backend noutro domínio, atualiza a constante `API_BASE_URL` no
topo do `script.js`.

## 5. Rotas disponíveis

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cria conta `{ name, email, password }` |
| POST | `/api/auth/login` | Inicia sessão `{ email, password }` → devolve `token` |
| GET | `/api/auth/me` | Dados do utilizador autenticado (precisa de `Authorization: Bearer <token>`) |
| POST | `/api/payments/mpesa` | Inicia cobrança `{ plan, phone, amount, userId }` |
| GET | `/api/payments/:reference` | Consulta o estado de um pagamento |
| GET | `/api/health` | Verifica se o servidor está no ar |

## 6. Publicar em produção

Para o site funcionar fora do teu computador, hospeda este backend num
serviço como Render, Railway, ou uma VPS, e atualiza:
- `FRONTEND_ORIGIN` no `.env` do servidor, com o domínio real do site;
- `API_BASE_URL` no `script.js` do frontend, com o URL público do backend;
- as credenciais M-Pesa de sandbox para as de produção, após aprovação da Vodacom.

## Notas de segurança já aplicadas

- Palavras-passe nunca são guardadas em texto simples (bcrypt, custo 12).
- Sessões usam JWT assinado com segredo próprio, válido por 7 dias.
- Limite de pedidos (`express-rate-limit`) contra tentativas em massa.
- Mensagens de erro de login não revelam se o email existe ou não.
- Credenciais M-Pesa ficam só no servidor — nunca chegam ao browser.
