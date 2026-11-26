/* Painel de ideias: Supabase quando configurado, protótipo local quando não. */
(function () {
  'use strict';

  const busca = document.querySelector('#admin-busca');
  const exportar = document.querySelector('#admin-exportar');
  const contagem = document.querySelector('#admin-contagem');
  const erroGeral = document.querySelector('#admin-erro');
  const tabelaWrap = document.querySelector('.admin-tabela-wrap');
  const linhas = document.querySelector('#admin-linhas');
  const modeloLinha = document.querySelector('#linha-template');
  const vazio = document.querySelector('#admin-vazio');
  const semResultados = document.querySelector('#admin-sem-resultados');
  const painel = document.querySelector('#admin-painel');

  const titulo = document.querySelector('#admin-titulo');
  const aviso = document.querySelector('#admin-notice');
  const marcaSub = document.querySelector('#admin-brand-sub');
  const confirmarTexto = document.querySelector('#admin-confirmar-texto');
  const sair = document.querySelector('#admin-sair');

  const login = document.querySelector('#admin-login');
  const loginForm = document.querySelector('#admin-login-form');
  const loginEmail = document.querySelector('#admin-login-email');
  const loginSenha = document.querySelector('#admin-login-senha');
  const loginStatus = document.querySelector('#admin-login-status');
  const loginSubmit = document.querySelector('#admin-login-submit');

  const modoSupabase = Boolean(
    window.NexusStorageSupabase && window.NexusStorageSupabase.estaConfigurado()
  );
  document.documentElement.dataset.modo = modoSupabase ? 'supabase' : 'local';

  let storage;
  try {
    const adapter = window.NexusStorageAdapter || (
      modoSupabase
        ? window.NexusStorageSupabase.criarAdapter()
        : NexusStorage.criarAdapterLocalStorage()
    );
    storage = NexusStorage.criarStorage(adapter);
  } catch (erro) {
    // Mantém o painel responsivo e explica a falha em vez de travar em "Carregando…".
    const falhar = () => Promise.reject(erro);
    storage = NexusStorage.criarStorage({
      create: falhar,
      list: falhar,
      update: falhar,
      remove: falhar,
      export: falhar
    });
  }

  const dialogEditar = document.querySelector('#admin-dialog');
  const formEditar = document.querySelector('#admin-form');
  const nomeEditar = document.querySelector('#admin-editar-nome');
  const mensagemEditar = document.querySelector('#admin-editar-mensagem');
  const erroEdicao = document.querySelector('#admin-erro-edicao');
  const cancelarEdicao = document.querySelector('#admin-cancelar');

  const dialogConfirmar = document.querySelector('#admin-confirmar');
  const confirmarSim = document.querySelector('#admin-confirmar-sim');
  const confirmarNao = document.querySelector('#admin-confirmar-nao');

  let todos = [];
  let visiveis = [];
  let idEmEdicao = null;
  let idParaExcluir = null;
  let voltarFocoEdicao = null;
  let voltarFocoExclusao = null;

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function formatarData(iso) {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) {
      return iso;
    }
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function mensagemErro(erro) {
    if (!erro) {
      return 'Não foi possível concluir. Tente de novo.';
    }
    if (
      erro.name === 'StorageError' ||
      erro.name === 'NotFoundError' ||
      erro.name === 'ValidationError'
    ) {
      return erro.message;
    }
    return 'Não foi possível concluir. Tente de novo.';
  }

  function registrarErro(erro) {
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
      console.error(erro);
    }
  }

  function mostrarErro(erro) {
    erroGeral.textContent = mensagemErro(erro);
    erroGeral.hidden = false;
    registrarErro(erro);
  }

  function limparErro() {
    erroGeral.textContent = '';
    erroGeral.hidden = true;
  }

  function sessaoExpirada(erro) {
    if (
      modoSupabase &&
      erro &&
      erro.name === 'StorageError' &&
      /^Sessão expirada/.test(erro.message)
    ) {
      mostrarLogin(erro.message);
      return true;
    }
    return false;
  }

  function atualizarContagem(anuncio) {
    const total = todos.length;
    const encontrados = visiveis.length;
    const termo = busca.value.trim();
    const substantivo = modoSupabase
      ? { uma: 'ideia enviada', varias: 'ideias enviadas', encontrada: 'ideia encontrada', encontradas: 'ideias encontradas' }
      : { uma: 'ideia salva', varias: 'ideias salvas', encontrada: 'ideia encontrada', encontradas: 'ideias encontradas' };

    let texto;
    if (termo) {
      texto = `${encontrados} de ${total} ${total === 1 ? substantivo.encontrada : substantivo.encontradas}`;
    } else {
      texto = `${total} ${total === 1 ? substantivo.uma : substantivo.varias}`;
    }

    const final = anuncio ? `${anuncio} ${texto}` : texto;
    if (contagem.textContent !== final) {
      contagem.textContent = final;
    }
  }

  function criarLinha(registro) {
    const linha = modeloLinha.content.firstElementChild.cloneNode(true);
    const data = linha.querySelector('time');
    data.dateTime = registro.criadoEm;
    data.textContent = formatarData(registro.criadoEm);
    linha.querySelector('.admin-nome').textContent = registro.nome || '—';
    linha.querySelector('.admin-mensagem').textContent = registro.mensagem;
    linha.querySelector('.admin-editar').dataset.id = registro.id;
    linha.querySelector('.admin-excluir').dataset.id = registro.id;
    return linha;
  }

  function aplicarFiltro() {
    const termo = normalizar(busca.value);
    visiveis = todos.filter((registro) =>
      normalizar(
        `${registro.nome} ${registro.mensagem} ${registro.criadoEm} ${formatarData(registro.criadoEm)}`
      ).includes(termo)
    );
  }

  function desenhar() {
    const fragmento = document.createDocumentFragment();
    for (const registro of visiveis) {
      fragmento.appendChild(criarLinha(registro));
    }
    linhas.replaceChildren(fragmento);
    tabelaWrap.hidden = visiveis.length === 0;
    vazio.hidden = todos.length !== 0;
    semResultados.hidden = !(todos.length > 0 && visiveis.length === 0);
  }

  let sequencia = 0;

  async function carregar(anuncio) {
    if (modoSupabase && !window.NexusStorageSupabase.sessaoAtiva()) {
      return;
    }
    const atual = ++sequencia;
    try {
      const itens = await storage.list();
      if (atual !== sequencia) {
        return;
      }
      todos = itens;
      aplicarFiltro();
      desenhar();
      atualizarContagem(anuncio);
      limparErro();
    } catch (erro) {
      if (atual !== sequencia) {
        return;
      }
      if (!sessaoExpirada(erro)) {
        contagem.textContent = 'Ideias indisponíveis.';
        mostrarErro(erro);
      }
    }
  }

  function focarDepois(id, classe) {
    if (id) {
      for (const botao of linhas.querySelectorAll('button')) {
        if (botao.dataset.id === id && botao.classList.contains(classe)) {
          botao.focus();
          return;
        }
      }
    }
    busca.focus();
  }

  function devolverFoco(dialog, obterBotao) {
    dialog.addEventListener('close', () => {
      const botao = obterBotao();
      if (botao && botao.isConnected && !painel.hidden) {
        botao.focus();
      } else if (!painel.hidden) {
        busca.focus();
      }
    });
  }

  function mostrarLogin(mensagem) {
    if (!modoSupabase) {
      return;
    }
    if (dialogEditar.open) {
      dialogEditar.close();
    }
    if (dialogConfirmar.open) {
      dialogConfirmar.close();
    }
    idEmEdicao = null;
    idParaExcluir = null;
    sequencia += 1;
    todos = [];
    visiveis = [];
    linhas.replaceChildren();
    painel.hidden = true;
    login.hidden = false;
    loginSenha.value = '';
    loginStatus.textContent = mensagem || '';
    loginStatus.hidden = !mensagem;
    loginEmail.focus();
  }

  function mostrarPainel(anuncio) {
    login.hidden = true;
    painel.hidden = false;
    carregar(anuncio);
  }

  if (modoSupabase) {
    marcaSub.textContent = 'área restrita';
    titulo.textContent = 'Ideias enviadas pela comunidade';
    aviso.textContent = 'Área restrita da chapa. As ideias enviadas pelo site ficam salvas no banco da chapa; ler, editar e excluir exige login.';
    confirmarTexto.textContent = 'Isso apaga o registro enviado e não pode ser desfeito.';
    sair.hidden = false;

    if (window.NexusStorageSupabase.sessaoAtiva()) {
      mostrarPainel();
    } else {
      mostrarLogin();
      contagem.textContent = 'Entre para ver as ideias.';
    }

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!loginForm.reportValidity()) {
        return;
      }

      loginStatus.hidden = true;
      loginSubmit.disabled = true;
      loginSubmit.textContent = 'Entrando...';
      try {
        await window.NexusStorageSupabase.login(loginEmail.value, loginSenha.value);
        loginSenha.value = '';
        mostrarPainel('Ideias carregadas.');
        busca.focus();
      } catch (erro) {
        loginStatus.textContent = mensagemErro(erro);
        loginStatus.hidden = false;
        registrarErro(erro);
      } finally {
        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Entrar';
      }
    });

    sair.addEventListener('click', async () => {
      await window.NexusStorageSupabase.logout();
      limparErro();
      mostrarLogin();
    });
  } else {
    carregar();
  }

  busca.addEventListener('input', () => {
    aplicarFiltro();
    desenhar();
    atualizarContagem();
  });

  exportar.addEventListener('click', async () => {
    try {
      const csv = await storage.export();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nexus-ideias.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      limparErro();
    } catch (erro) {
      if (!sessaoExpirada(erro)) {
        mostrarErro(erro);
      }
    }
  });

  linhas.addEventListener('click', (event) => {
    const botao = event.target.closest('button');
    if (!botao) {
      return;
    }

    if (botao.classList.contains('admin-editar')) {
      const registro = todos.find((item) => item.id === botao.dataset.id);
      if (!registro) {
        mostrarErro(new NexusStorage.erros.NotFoundError('Esta ideia não existe mais.'));
        return;
      }
      idEmEdicao = registro.id;
      nomeEditar.value = registro.nome;
      mensagemEditar.value = registro.mensagem;
      mensagemEditar.removeAttribute('aria-invalid');
      erroEdicao.textContent = '';
      erroEdicao.hidden = true;
      voltarFocoEdicao = botao;
      dialogEditar.showModal();
      mensagemEditar.focus();
      return;
    }

    if (botao.classList.contains('admin-excluir')) {
      idParaExcluir = botao.dataset.id;
      voltarFocoExclusao = botao;
      dialogConfirmar.showModal();
      confirmarSim.focus();
    }
  });

  formEditar.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!formEditar.reportValidity()) {
      mensagemEditar.setAttribute('aria-invalid', 'true');
      erroEdicao.textContent = 'Escreva uma mensagem com pelo menos 10 caracteres.';
      erroEdicao.hidden = false;
      return;
    }

    mensagemEditar.removeAttribute('aria-invalid');
    try {
      await storage.update(idEmEdicao, {
        nome: nomeEditar.value,
        mensagem: mensagemEditar.value
      });
      const idEditado = idEmEdicao;
      dialogEditar.close();
      await carregar('Ideia atualizada.');
      focarDepois(idEditado, 'admin-editar');
    } catch (erro) {
      if (!sessaoExpirada(erro)) {
        erroEdicao.textContent = mensagemErro(erro);
        erroEdicao.hidden = false;
        registrarErro(erro);
      }
    }
  });

  mensagemEditar.addEventListener('input', () => {
    mensagemEditar.removeAttribute('aria-invalid');
    erroEdicao.hidden = true;
  });

  cancelarEdicao.addEventListener('click', () => dialogEditar.close());
  confirmarNao.addEventListener('click', () => dialogConfirmar.close());

  confirmarSim.addEventListener('click', async () => {
    confirmarSim.disabled = true;
    try {
      await storage.remove(idParaExcluir);
      dialogConfirmar.close();
      await carregar('Ideia excluída.');
      focarDepois(null);
    } catch (erro) {
      dialogConfirmar.close();
      if (!sessaoExpirada(erro)) {
        mostrarErro(erro);
      }
    } finally {
      confirmarSim.disabled = false;
      idParaExcluir = null;
    }
  });

  devolverFoco(dialogEditar, () => voltarFocoEdicao);
  devolverFoco(dialogConfirmar, () => voltarFocoExclusao);

  if (modoSupabase) {
    // sessionStorage não dispara evento entre abas; atualiza ao voltar à aba.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !painel.hidden) {
        carregar();
      }
    });
    window.setInterval(() => {
      if (document.visibilityState === 'visible' && !painel.hidden) {
        carregar();
      }
    }, 30000);
  } else {
    window.addEventListener('storage', (event) => {
      if (event.key === NexusStorage.CHAVE) {
        carregar();
      }
    });
  }
})();
