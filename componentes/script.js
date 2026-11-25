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

// Feedback em demonstração. Quando o back-end existir, substitua o bloco abaixo
// por um fetch() para a API e trate loading/erro com o mesmo #feedback-status.
const form = document.querySelector('#feedback-form');
const submit = document.querySelector('#feedback-submit');
const status = document.querySelector('#feedback-status');
const mensagem = document.querySelector('#feedback-mensagem');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    status.textContent = 'Escreva uma mensagem com pelo menos 10 caracteres.';
    status.className = 'form-status is-error';
    mensagem.setAttribute('aria-invalid', 'true');
    return;
  }

  mensagem.removeAttribute('aria-invalid');
  submit.disabled = true;
  submit.textContent = 'Enviando...';
  status.textContent = 'Enviando seu feedback...';
  status.className = 'form-status';

  window.setTimeout(() => {
    form.reset();
    submit.disabled = false;
    submit.textContent = 'Enviar feedback';
    status.textContent = 'Feedback recebido! Valeu por contribuir.';
    status.className = 'form-status is-success';
  }, 700);
});

mensagem.addEventListener('input', () => {
  mensagem.removeAttribute('aria-invalid');
  if (status.classList.contains('is-error')) {
    status.textContent = '';
    status.className = 'form-status';
  }
});

// Fecha o menu mobile depois de navegar para uma seção.
document.querySelectorAll('.nav-mobile__panel a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('.nav-mobile').open = false;
  });
});
