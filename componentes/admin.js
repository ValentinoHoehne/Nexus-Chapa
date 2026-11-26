/* Painel local de ideias. Usa o mesmo adaptador do formulário. */
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

  let storage;
  try {
    storage = NexusStorage.criarStorage(
      window.NexusStorageAdapter || NexusStorage.criarAdapterLocalStorage()
    );
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
    if (erro.name === 'StorageError') {
      return erro.message;
    }
    if (erro.name === 'NotFoundError') {
      return 'Esta ideia não existe mais.';
    }
    if (erro.name === 'ValidationError') {
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

  function atualizarContagem(anuncio) {
    const total = todos.length;
    const encontrados = visiveis.length;
    const termo = busca.value.trim();

    let texto;
    if (termo) {
      texto = `${encontrados} de ${total} ${total === 1 ? 'ideia encontrada' : 'ideias encontradas'}`;
    } else {
      texto = `${total} ${total === 1 ? 'ideia salva' : 'ideias salvas'}`;
    }

    contagem.textContent = anuncio ? `${anuncio} ${texto}` : texto;
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

  async function carregar(anuncio) {
    try {
      todos = await storage.list();
      aplicarFiltro();
      desenhar();
      atualizarContagem(anuncio);
      limparErro();
    } catch (erro) {
      contagem.textContent = 'Ideias indisponíveis.';
      mostrarErro(erro);
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
      if (botao && botao.isConnected) {
        botao.focus();
      } else {
        busca.focus();
      }
    });
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
      mostrarErro(erro);
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
      erroEdicao.textContent = mensagemErro(erro);
      erroEdicao.hidden = false;
      registrarErro(erro);
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
      mostrarErro(erro);
    } finally {
      confirmarSim.disabled = false;
      idParaExcluir = null;
    }
  });

  devolverFoco(dialogEditar, () => voltarFocoEdicao);
  devolverFoco(dialogConfirmar, () => voltarFocoExclusao);

  window.addEventListener('storage', (event) => {
    if (event.key === NexusStorage.CHAVE) {
      carregar();
    }
  });

  carregar();
})();
