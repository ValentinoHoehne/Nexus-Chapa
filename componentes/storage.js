/*
 * Camada de dados do "Mande sua ideia".
 * Hoje usa localStorage. No futuro basta definir window.NexusStorageAdapter
 * com create/list/update/remove/export antes deste arquivo para trocar por Supabase,
 * sem alterar o formulário nem o painel.
 */
(function (root) {
  'use strict';

  const CHAVE = 'nexus:feedback:v1';
  const LIMITES = Object.freeze({ nome: 80, mensagemMin: 10, mensagemMax: 2000 });
  const METODOS = Object.freeze(['create', 'list', 'update', 'remove', 'export']);

  class ValidationError extends Error {
    constructor(mensagem) {
      super(mensagem);
      this.name = 'ValidationError';
    }
  }

  class NotFoundError extends Error {
    constructor(mensagem) {
      super(mensagem);
      this.name = 'NotFoundError';
    }
  }

  class StorageError extends Error {
    constructor(mensagem) {
      super(mensagem);
      this.name = 'StorageError';
    }
  }

  function texto(valor, limite, obrigatorio) {
    if (valor === undefined || valor === null) {
      if (obrigatorio) {
        throw new ValidationError('Escreva uma mensagem com pelo menos 10 caracteres.');
      }
      return '';
    }

    if (typeof valor !== 'string' && typeof valor !== 'number') {
      throw new ValidationError('Os campos devem ser texto.');
    }

    const limpo = String(valor).trim();
    if (obrigatorio && limpo.length < LIMITES.mensagemMin) {
      throw new ValidationError('Escreva uma mensagem com pelo menos 10 caracteres.');
    }
    if (limpo.length > limite) {
      throw new ValidationError(`O campo passou do limite de ${limite} caracteres.`);
    }
    return limpo;
  }

  function normalizar(dados) {
    if (!dados || typeof dados !== 'object') {
      throw new ValidationError('Dados inválidos.');
    }

    return {
      nome: texto(dados.nome, LIMITES.nome, false),
      mensagem: texto(dados.mensagem, LIMITES.mensagemMax, true)
    };
  }

  function validarRegistro(registro) {
    const invalido =
      !registro ||
      typeof registro !== 'object' ||
      typeof registro.id !== 'string' ||
      !registro.id ||
      typeof registro.nome !== 'string' ||
      registro.nome.length > LIMITES.nome ||
      typeof registro.mensagem !== 'string' ||
      registro.mensagem.length < LIMITES.mensagemMin ||
      registro.mensagem.length > LIMITES.mensagemMax ||
      typeof registro.criadoEm !== 'string' ||
      typeof registro.atualizadoEm !== 'string';

    if (invalido) {
      throw new StorageError('Os dados salvos estão inválidos.');
    }

    return {
      id: registro.id,
      nome: registro.nome,
      mensagem: registro.mensagem,
      criadoEm: registro.criadoEm,
      atualizadoEm: registro.atualizadoEm
    };
  }

  function gerarId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') {
      return root.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function criarAdapterLocalStorage(store, agora, gerar) {
    let destino = store;
    if (destino === undefined) {
      try {
        destino = root.localStorage;
      } catch (erro) {
        // Alguns navegadores bloqueiam o acesso à propriedade (modo privado/política).
        destino = null;
      }
    }
    const agoraFn = agora || (() => new Date().toISOString());
    const gerarIdFn = gerar || gerarId;

    if (!destino || typeof destino.getItem !== 'function' || typeof destino.setItem !== 'function') {
      throw new StorageError('Armazenamento local indisponível.');
    }

    function ler() {
      let bruto;
      try {
        bruto = destino.getItem(CHAVE);
      } catch (erro) {
        throw new StorageError('Não foi possível acessar o armazenamento local.');
      }

      if (!bruto) {
        return [];
      }

      let dados;
      try {
        dados = JSON.parse(bruto);
      } catch (erro) {
        throw new StorageError('Os dados salvos estão corrompidos.');
      }

      if (!Array.isArray(dados)) {
        throw new StorageError('Os dados salvos estão inválidos.');
      }
      return dados.map(validarRegistro);
    }

    function escrever(registros) {
      try {
        destino.setItem(CHAVE, JSON.stringify(registros));
      } catch (erro) {
        const semEspaco =
          erro &&
          (erro.name === 'QuotaExceededError' || erro.code === 22 || erro.code === 1014);
        throw new StorageError(
          semEspaco
            ? 'Não há espaço para salvar esta mensagem neste navegador.'
            : 'Não foi possível salvar neste navegador.'
        );
      }
    }

    return {
      async create(dados) {
        const limpos = normalizar(dados);
        const instante = agoraFn();
        const registro = {
          id: gerarIdFn(),
          nome: limpos.nome,
          mensagem: limpos.mensagem,
          criadoEm: instante,
          atualizadoEm: instante
        };
        const registros = ler();
        registros.push(registro);
        escrever(registros);
        return { ...registro };
      },

      async list() {
        return ler()
          .map((registro, indice) => ({ registro, indice }))
          .sort(
            (a, b) =>
              b.registro.criadoEm.localeCompare(a.registro.criadoEm) || b.indice - a.indice
          )
          .map((item) => ({ ...item.registro }));
      },

      async update(id, dados) {
        const limpos = normalizar(dados);
        const registros = ler();
        const indice = registros.findIndex((registro) => registro.id === id);
        if (indice < 0) {
          throw new NotFoundError('Esta mensagem não existe mais.');
        }

        const atualizado = {
          ...registros[indice],
          nome: limpos.nome,
          mensagem: limpos.mensagem,
          atualizadoEm: agoraFn()
        };
        registros[indice] = atualizado;
        escrever(registros);
        return { ...atualizado };
      },

      async remove(id) {
        const registros = ler();
        const indice = registros.findIndex((registro) => registro.id === id);
        if (indice < 0) {
          throw new NotFoundError('Esta mensagem não existe mais.');
        }

        registros.splice(indice, 1);
        escrever(registros);
        return true;
      },

      async export() {
        return paraCsv(ler());
      }
    };
  }

  function celula(valor) {
    let textoValor = String(valor === undefined || valor === null ? '' : valor);
    if (/^[\s]*[=+\-@\t\r]/.test(textoValor)) {
      textoValor = `'${textoValor}`;
    }
    return `"${textoValor.replace(/"/g, '""')}"`;
  }

  function paraCsv(registros) {
    const colunas = ['id', 'nome', 'mensagem', 'criadoEm', 'atualizadoEm'];
    const linhas = [colunas.join(';')];

    for (const registro of registros) {
      linhas.push(colunas.map((coluna) => celula(registro[coluna])).join(';'));
    }
    return `\uFEFF${linhas.join('\r\n')}\r\n`;
  }

  function criarStorage(adapter) {
    if (!adapter || METODOS.some((metodo) => typeof adapter[metodo] !== 'function')) {
      throw new StorageError('Adaptador de armazenamento inválido.');
    }

    const fachada = {};
    for (const metodo of METODOS) {
      fachada[metodo] = async (...argumentos) => adapter[metodo](...argumentos);
    }
    return Object.freeze(fachada);
  }

  const api = {
    CHAVE,
    LIMITES,
    erros: { ValidationError, NotFoundError, StorageError },
    criarAdapterLocalStorage,
    criarStorage,
    normalizar,
    paraCsv
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NexusStorage = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
