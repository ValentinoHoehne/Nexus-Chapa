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

// Duas formas de envio: Supabase (quando configurado no deploy) ou protótipo local.
// window.NexusStorageAdapter continua podendo substituir o destino nos testes.
const form = document.querySelector('#feedback-form');
const submit = document.querySelector('#feedback-submit');
const status = document.querySelector('#feedback-status');
const mensagem = document.querySelector('#feedback-mensagem');
const nome = document.querySelector('#feedback-nome');
const nota = document.querySelector('#feedback-nota');

const modoSupabase = Boolean(
  window.NexusStorageSupabase && window.NexusStorageSupabase.estaConfigurado()
);
document.documentElement.dataset.modo = modoSupabase ? 'supabase' : 'local';

const textos = modoSupabase
  ? {
      nota: 'Sua ideia é enviada à chapa NEXUS. Não pedimos login e o nome é opcional.',
      salvando: 'Enviando...',
      sucesso: 'Ideia enviada. Obrigado!',
      erro: 'Não foi possível enviar. Tente de novo.'
    }
  : {
      nota: 'Protótipo local: a mensagem fica salva apenas neste navegador, neste dispositivo. Ela não é enviada à chapa.',
      salvando: 'Salvando neste navegador...',
      sucesso: 'Ideia salva neste navegador. Ela ainda não é enviada à chapa.',
      erro: 'Não foi possível salvar neste navegador. Tente de novo.'
    };

if (nota) {
  nota.textContent = textos.nota;
}

let storage = null;
try {
  const adapter = window.NexusStorageAdapter || (
    modoSupabase
      ? window.NexusStorageSupabase.criarAdapter()
      : NexusStorage.criarAdapterLocalStorage()
  );
  storage = NexusStorage.criarStorage(adapter);
} catch (erro) {
  status.textContent = modoSupabase
    ? 'Não foi possível iniciar o envio. Tente recarregar a página.'
    : 'Não foi possível acessar o armazenamento deste navegador.';
  status.className = 'form-status is-error';
  submit.disabled = true;
}

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
  submit.textContent = textos.salvando;
  status.textContent = textos.salvando;
  status.className = 'form-status';

  try {
    await storage.create({ nome: nome.value, mensagem: mensagem.value });
    form.reset();
    status.textContent = textos.sucesso;
    status.className = 'form-status is-success';
  } catch (erro) {
    const invalido = erro && erro.name === 'ValidationError';
    status.textContent = invalido ? erro.message : textos.erro;
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
