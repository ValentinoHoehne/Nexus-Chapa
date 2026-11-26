// Ao atualizar, começa do topo em vez de restaurar a rolagem anterior.
const navegacao = performance.getEntriesByType('navigation')[0];
if (navegacao && navegacao.type === 'reload') {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  window.addEventListener('DOMContentLoaded', () => {
    const raiz = document.documentElement;
    raiz.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      raiz.style.scrollBehavior = '';
    });
  });
}

// Feedback salvo neste navegador. Para usar outro destino (ex.: Supabase),
// defina window.NexusStorageAdapter antes de storage.js — a UI não muda.
const form = document.querySelector('#feedback-form');
const submit = document.querySelector('#feedback-submit');
const status = document.querySelector('#feedback-status');
const mensagem = document.querySelector('#feedback-mensagem');
const nome = document.querySelector('#feedback-nome');
const linkAdmin = document.querySelector('#feedback-admin');
let storage = null;
try {
  storage = NexusStorage.criarStorage(
    window.NexusStorageAdapter || NexusStorage.criarAdapterLocalStorage()
  );
} catch (erro) {
  status.textContent = 'Não foi possível acessar o armazenamento deste navegador.';
  status.className = 'form-status is-error';
  submit.disabled = true;
}

async function atualizarLinkAdmin() {
  if (!storage || !linkAdmin) {
    return;
  }
  try {
    const total = (await storage.list()).length;
    linkAdmin.textContent = total === 0
      ? 'Ver ideias salvas neste navegador →'
      : `Ver ${total} ${total === 1 ? 'ideia salva' : 'ideias salvas'} neste navegador →`;
  } catch (erro) {
    // Mantém o texto padrão quando o armazenamento está indisponível.
  }
}

atualizarLinkAdmin();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!storage) {
    return;
  }

  if (!form.reportValidity()) {
    status.textContent = 'Escreva uma mensagem com pelo menos 10 caracteres.';
    status.className = 'form-status is-error';
    mensagem.setAttribute('aria-invalid', 'true');
    return;
  }

  mensagem.removeAttribute('aria-invalid');
  submit.disabled = true;
  submit.textContent = 'Salvando...';
  status.textContent = 'Salvando neste navegador...';
  status.className = 'form-status';

  try {
    await storage.create({ nome: nome.value, mensagem: mensagem.value });
    form.reset();
    atualizarLinkAdmin();
    status.textContent = 'Ideia salva neste navegador. Ela ainda não é enviada à chapa.';
    status.className = 'form-status is-success';
  } catch (erro) {
    const invalido = erro && erro.name === 'ValidationError';
    status.textContent = invalido ? erro.message : 'Não foi possível salvar neste navegador. Tente de novo.';
    status.className = 'form-status is-error';
    if (invalido) {
      mensagem.setAttribute('aria-invalid', 'true');
    }
  } finally {
    submit.disabled = false;
    submit.textContent = 'Enviar feedback';
  }
});

mensagem.addEventListener('input', () => {
  mensagem.removeAttribute('aria-invalid');
  if (status.classList.contains('is-error')) {
    status.textContent = '';
    status.className = 'form-status';
  }
});

// Fecha o menu mobile depois de navegar para uma seção.
const menu = document.querySelector('.nav-mobile');
const menuSummary = menu.querySelector('summary');

document.querySelectorAll('.nav-mobile__panel a').forEach((link) => {
  link.addEventListener('click', () => {
    menu.open = false;
  });
});

document.addEventListener('click', (event) => {
  if (menu.open && !menu.contains(event.target)) {
    menu.open = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    menuSummary.focus();
  }
});
