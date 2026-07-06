// =========================================================
// script.js — William Cazimoto Portfolio
// Navegação por tabs, modais (login / M-Pesa) e ligação ao
// backend real (pasta /server) para autenticação e pagamentos.
// =========================================================

// Endereço do backend. Em desenvolvimento local corre em localhost:4000
// (ver server/README.md). Depois de publicares o backend, troca este
// valor pelo URL público (ex: "https://api.teudominio.com/api").
const API_BASE_URL = 'http://localhost:4000/api';

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  setupTabHighlight();
  setupModals();
  setupLoginForm();
  setupMpesaFlow();
});

/* ---------- Ano no rodapé ---------- */
function setYear(){
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ---------- Realce da tab activa consoante a secção visível ---------- */
function setupTabHighlight(){
  const tabs = document.querySelectorAll('.tab');
  const sections = [...tabs].map(tab => document.querySelector(tab.getAttribute('href')));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        const id = '#' + entry.target.id;
        tabs.forEach(t => t.classList.toggle('active', t.getAttribute('href') === id));
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  sections.forEach(section => { if (section) observer.observe(section); });
}

/* ---------- Abrir / fechar modais ---------- */
function setupModals(){
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape'){
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    }
  });

  const openLoginBtn = document.getElementById('openLoginBtn');
  if (openLoginBtn) openLoginBtn.addEventListener('click', () => openModal('loginModal'));
}

function openModal(id){
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  const firstInput = modal.querySelector('input');
  if (firstInput) firstInput.focus();
}

function closeModal(id){
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

/* ---------- LOGIN ----------
   Liga-se ao backend real em /server (ver server/README.md):
   - POST /api/auth/login valida a palavra-passe no servidor
     (nunca no browser) e devolve um token de sessão (JWT).
   - Guardamos esse token em memória/localStorage para o usar
     nas próximas chamadas (ex: iniciar um pagamento já autenticado).
------------------------------------------------------------ */
function setupLoginForm(){
  const form = document.getElementById('loginForm');
  if (!form) return;

  let statusEl = form.querySelector('.login-status');
  if (!statusEl){
    statusEl = document.createElement('p');
    statusEl.className = 'login-status modal-note';
    form.insertBefore(statusEl, form.querySelector('.modal-note'));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;

    submitBtn.textContent = 'A entrar...';
    submitBtn.disabled = true;
    statusEl.textContent = '';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok || !data.ok){
        statusEl.textContent = data.message || 'Não foi possível entrar.';
        return;
      }

      // Guarda o token de sessão para pedidos futuros.
      localStorage.setItem('wc_token', data.token);
      localStorage.setItem('wc_user', JSON.stringify(data.user));

      closeModal('loginModal');
      form.reset();
    } catch (err) {
      // O backend não está a correr ou está inacessível.
      statusEl.textContent = 'Não foi possível ligar ao servidor. Confirma que o backend está a correr (ver server/README.md).';
      console.error('Erro no login:', err);
    } finally {
      submitBtn.textContent = 'Entrar';
      submitBtn.disabled = false;
    }
  });
}

/* ---------- PLUGIN M-PESA ----------
   Liga-se ao backend real em /server (ver server/README.md):
   - POST /api/payments/mpesa recebe { plan, phone, amount, userId }
   - O backend fala com a API oficial da Vodacom M-Pesa usando as
     credenciais guardadas no .env do servidor (nunca no browser)
     e só devolve "sucesso" depois de confirmação real do operador.
------------------------------------------------------------ */
function setupMpesaFlow(){
  const planNameEl = document.getElementById('mpesaPlanName');
  const amountInput = document.getElementById('mpesaAmount');
  const phoneInput = document.getElementById('mpesaPhone');
  const statusEl = document.getElementById('mpesaStatus');
  const form = document.getElementById('mpesaForm');
  const submitBtn = document.getElementById('mpesaSubmitBtn');

  document.querySelectorAll('.btn-mpesa[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      const price = btn.dataset.price;

      planNameEl.textContent = plan;
      amountInput.value = price && price !== '0' ? price : '';
      statusEl.textContent = '';
      statusEl.className = 'mpesa-status';

      openModal('mpesaModal');
    });
  });

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phone = phoneInput.value.trim();
    const validPhone = /^(84|85|86|87)\d{7}$/.test(phone.replace(/\s+/g, ''));

    if (!validPhone){
      statusEl.textContent = 'Introduz um número M-Pesa válido (ex: 840000000).';
      statusEl.className = 'mpesa-status';
      return;
    }

    statusEl.textContent = 'A pedir confirmação no telemóvel...';
    statusEl.className = 'mpesa-status loading';
    submitBtn.disabled = true;

    const storedUser = JSON.parse(localStorage.getItem('wc_user') || 'null');

    try {
      const response = await fetch(`${API_BASE_URL}/payments/mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planNameEl.textContent,
          phone: phone.replace(/\s+/g, ''),
          amount: Number(amountInput.value),
          userId: storedUser ? storedUser.id : null
        })
      });
      const data = await response.json();

      if (!response.ok || !data.ok){
        statusEl.textContent = data.message || 'O pagamento não foi confirmado.';
        statusEl.className = 'mpesa-status';
        return;
      }

      statusEl.textContent = '✔ Pagamento confirmado. William entrará em contacto em breve.';
      statusEl.className = 'mpesa-status success';

      setTimeout(() => {
        closeModal('mpesaModal');
        form.reset();
        statusEl.textContent = '';
        statusEl.className = 'mpesa-status';
      }, 2200);
    } catch (err) {
      statusEl.textContent = 'Não foi possível ligar ao servidor. Confirma que o backend está a correr (ver server/README.md).';
      statusEl.className = 'mpesa-status';
      console.error('Erro no pagamento M-Pesa:', err);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
