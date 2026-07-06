// =========================================================
// script.js — William Cazimoto Portfolio
// Navegação por tabs, modais (login / M-Pesa) e simulação
// de pagamento. NOTA: a integração real do M-Pesa e do login
// exige um backend seguro (ver comentários mais abaixo).
// =========================================================

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
   Isto é apenas a interface. Autenticação real requer:
   - um servidor backend (Node/PHP/etc.)
   - uma base de dados de utilizadores com palavras-passe encriptadas
   - gestão de sessão/token (ex: JWT ou cookies seguras)
   Nunca guardar nem validar palavras-passe apenas no browser.
------------------------------------------------------------ */
function setupLoginForm(){
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'A entrar...';
    submitBtn.disabled = true;

    // Simulação — substituir por fetch('/api/login', {...}) real
    setTimeout(() => {
      submitBtn.textContent = 'Entrar';
      submitBtn.disabled = false;
      closeModal('loginModal');
      form.reset();
    }, 900);
  });
}

/* ---------- PLUGIN M-PESA (simulação de front-end) ----------
   Fluxo real de produção:
   1. O browser envia o número de telefone e o valor ao backend.
   2. O backend chama a API oficial (Vodacom M-Pesa OpenAPI /
      Safaricom Daraja), usando credenciais secretas guardadas
      no servidor (nunca no código do browser).
   3. O backend recebe uma confirmação (callback/webhook) do
      operador e só então marca o pagamento como concluído.
   Este ficheiro apenas demonstra a experiência de utilizador.
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

  form.addEventListener('submit', (e) => {
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

    // Simulação de resposta do operador — em produção isto viria
    // de um webhook/callback processado pelo backend.
    setTimeout(() => {
      statusEl.textContent = '✔ Pagamento confirmado. Obrigado, ' + 'William entrará em contacto em breve.';
      statusEl.className = 'mpesa-status success';
      submitBtn.disabled = false;

      setTimeout(() => {
        closeModal('mpesaModal');
        form.reset();
        statusEl.textContent = '';
        statusEl.className = 'mpesa-status';
      }, 2200);
    }, 1600);
  });
}
