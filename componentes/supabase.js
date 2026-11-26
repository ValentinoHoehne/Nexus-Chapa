/*
 * Adaptador Supabase para o "Mande sua ideia".
 * Usa apenas fetch (sem dependências). Visitantes enviam sem login;
 * o painel exige sessão do Supabase Auth para ler, editar e excluir.
 *
 * A URL e a chave publicável vêm de componentes/config.js, gerado no deploy.
 * Nunca usar service_role aqui: a proteção é o RLS do banco.
 */
(function (root) {
  'use strict';

  const CHAVE_SESSAO = 'nexus:auth:v1';
  const CONFIG = root.NEXUS_CONFIG || {};

  function erros() {
    return root.NexusStorage.erros;
  }

  function estaConfigurado() {
    const url = String(CONFIG.supabaseUrl || '');
    return Boolean(CONFIG.supabaseKey && /^https:\/\//i.test(url));
  }

  // Sessão apenas em memória: o Pages compartilha origem com outros projetos,
  // então sessionStorage deixaria o token do admin exposto na mesma aba.
  function armazenamentoPadrao() {
    const dados = new Map();
    return {
      getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
      setItem: (chave, valor) => dados.set(chave, String(valor)),
      removeItem: (chave) => dados.delete(chave)
    };
  }

  function lerSessao(store) {
    try {
      const bruto = store && store.getItem(CHAVE_SESSAO);
      if (!bruto) {
        return null;
      }
      const dados = JSON.parse(bruto);
      if (!dados || typeof dados.access_token !== 'string') {
        return null;
      }
      return dados;
    } catch (erro) {
      return null;
    }
  }

  function salvarSessao(store, sessao) {
    try {
      if (!store) {
        return;
      }
      if (sessao) {
        store.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
      } else {
        store.removeItem(CHAVE_SESSAO);
      }
    } catch (erro) {
      // Sessão em memória continua funcionando se o storage estiver bloqueado.
    }
  }

  function erroPorHttp(status, detalhe, autenticado, mensagem401) {
    const { ValidationError, NotFoundError, StorageError } = erros();
    const codigo = String((detalhe && (detalhe.code || detalhe.sqlstate)) || '');
    const motivo = String((detalhe && (detalhe.error || detalhe.message || detalhe.msg)) || '');

    if (!autenticado && /invalid_grant|invalid_credentials/i.test(motivo)) {
      return new StorageError(mensagem401 || 'E-mail ou senha incorretos.');
    }
    if (status === 401) {
      return new StorageError(
        autenticado
          ? 'Sessão expirada. Entre novamente.'
          : mensagem401 || 'Não foi possível acessar o serviço.'
      );
    }
    if (status === 403 || codigo === '42501') {
      return new StorageError('Você não tem permissão para isso.');
    }
    if (status === 404) {
      return new NotFoundError('Esta ideia não existe mais.');
    }
    if (
      (status === 400 || status === 422) &&
      ['23514', '23502', '22001', '22P02'].includes(codigo)
    ) {
      return new ValidationError('Confira os campos e tente de novo.');
    }
    if (status === 409) {
      return new StorageError('Conflito ao salvar. Tente de novo.');
    }
    if (status === 429) {
      return new StorageError('Muitas tentativas. Aguarde um momento.');
    }
    if (status >= 500) {
      return new StorageError('Serviço temporariamente indisponível.');
    }
    return new StorageError('Não foi possível concluir. Tente de novo.');
  }

  function criarServico(opcoes) {
    opcoes = opcoes || {};
    const { StorageError, ValidationError, NotFoundError } = erros();
    const config = opcoes.config || CONFIG;
    const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
    const chave = String(config.supabaseKey || '');
    const configurado = Boolean(chave && /^https:\/\//i.test(String(config.supabaseUrl || '')));
    const fetchFn = opcoes.fetchFn || (typeof fetch === 'function' ? fetch : null);
    const store = opcoes.sessionStore === undefined ? armazenamentoPadrao() : opcoes.sessionStore;
    const agora = opcoes.agora || (() => new Date().toISOString());
    const timeoutMs = Number(opcoes.timeoutMs) > 0 ? Number(opcoes.timeoutMs) : 15000;

    let sessao = lerSessao(store);
    let renovando = null;

    function limpar() {
      sessao = null;
      salvarSessao(store, null);
    }

    function buscar(url, init) {
      if (!fetchFn) {
        return Promise.reject(new StorageError('Este navegador não suporta envio de ideias.'));
      }
      const controlador = typeof AbortController === 'function' ? new AbortController() : null;
      const opcoesFetch = controlador
        ? Object.assign({}, init, { signal: controlador.signal })
        : init;
      let promessa;
      try {
        promessa = Promise.resolve(fetchFn(url, opcoesFetch));
      } catch (erro) {
        return Promise.reject(new StorageError('Não foi possível conectar. Verifique sua internet.'));
      }
      if (!controlador) {
        return promessa;
      }
      const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
      return promessa.finally(() => clearTimeout(temporizador));
    }

    async function requisitar(caminho, init, autenticado, mensagem401) {
      let resposta;
      try {
        resposta = await buscar(base + caminho, init);
      } catch (erro) {
        if (erro && erro.name === 'StorageError') {
          throw erro;
        }
        throw new StorageError('Não foi possível conectar. Verifique sua internet.');
      }
      if (!resposta.ok) {
        let detalhe = null;
        try {
          detalhe = await resposta.json();
        } catch (erro) {
          detalhe = null;
        }
        if (autenticado && resposta.status === 401) {
          limpar();
        }
        throw erroPorHttp(resposta.status, detalhe, autenticado, mensagem401);
      }
      return resposta;
    }

    async function renovar() {
      const atual = sessao;
      if (!atual || !atual.refresh_token) {
        throw new StorageError('Sessão expirada. Entre novamente.');
      }
      let resposta;
      try {
        resposta = await buscar(base + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: { apikey: chave, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: atual.refresh_token })
        });
      } catch (erro) {
        throw new StorageError('Sessão expirada. Entre novamente.');
      }
      if (!resposta.ok) {
        throw new StorageError('Sessão expirada. Entre novamente.');
      }
      let dados;
      try {
        dados = await resposta.json();
      } catch (erro) {
        throw new StorageError('Sessão expirada. Entre novamente.');
      }
      if (!dados || !dados.access_token) {
        throw new StorageError('Sessão expirada. Entre novamente.');
      }
      return {
        access_token: dados.access_token,
        refresh_token: dados.refresh_token || atual.refresh_token,
        expiresAt: Date.now() + Number(dados.expires_in || 3600) * 1000 - 60000
      };
    }

    async function token() {
      if (!sessao) {
        return null;
      }
      if (Date.now() < Number(sessao.expiresAt || 0)) {
        return sessao.access_token;
      }
      if (!renovando) {
        renovando = renovar()
          .then((nova) => {
            sessao = nova;
            salvarSessao(store, sessao);
            return nova.access_token;
          })
          .catch((erro) => {
            limpar();
            throw erro;
          })
          .finally(() => {
            renovando = null;
          });
      }
      return renovando;
    }

    async function login(email, senha) {
      const resposta = await requisitar('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: chave, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha })
      }, false, 'E-mail ou senha incorretos.');
      let dados;
      try {
        dados = await resposta.json();
      } catch (erro) {
        throw new StorageError('Não foi possível entrar. Tente de novo.');
      }
      if (!dados || !dados.access_token) {
        throw new StorageError('E-mail ou senha incorretos.');
      }
      sessao = {
        access_token: dados.access_token,
        refresh_token: dados.refresh_token || '',
        expiresAt: Date.now() + Number(dados.expires_in || 3600) * 1000 - 60000
      };
      salvarSessao(store, sessao);
      return { access_token: sessao.access_token };
    }

    async function logout() {
      const atual = sessao;
      limpar();
      if (atual && atual.access_token && fetchFn) {
        try {
          await buscar(base + '/auth/v1/logout', {
            method: 'POST',
            headers: { apikey: chave, Authorization: 'Bearer ' + atual.access_token }
          });
        } catch (erro) {
          // Saída local já aconteceu; falha de rede não prende o usuário.
        }
      }
    }

    function gerarId() {
      if (root.crypto && typeof root.crypto.randomUUID === 'function') {
        return root.crypto.randomUUID();
      }
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function iso(valor) {
      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) {
        throw new StorageError('O serviço devolveu dados inválidos.');
      }
      return data.toISOString();
    }

    function registroDe(linha) {
      return {
        id: String(linha.id),
        nome: String(linha.nome === null || linha.nome === undefined ? '' : linha.nome),
        mensagem: String(linha.mensagem),
        criadoEm: iso(linha.criado_em),
        atualizadoEm: iso(linha.atualizado_em)
      };
    }

    const api = {
      async create(dados) {
        const limpos = root.NexusStorage.normalizar(dados);
        const instante = agora();
        const registro = {
          id: gerarId(),
          nome: limpos.nome,
          mensagem: limpos.mensagem,
          criadoEm: instante,
          atualizadoEm: instante
        };
        await requisitar('/rest/v1/ideias', {
          method: 'POST',
          headers: {
            apikey: chave,
            Authorization: 'Bearer ' + chave,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          // Datas vêm do banco (trigger), não do relógio do visitante.
          body: JSON.stringify({
            id: registro.id,
            nome: registro.nome,
            mensagem: registro.mensagem
          })
        }, false);
        return registro;
      },

      async list() {
        const accessToken = await token();
        if (!accessToken) {
          throw new StorageError('Entre no painel para ver as ideias.');
        }
        const todos = [];
        const limite = 1000;
        let offset = 0;
        for (;;) {
          const caminho =
            `/rest/v1/ideias?select=id,nome,mensagem,criado_em,atualizado_em` +
            `&order=criado_em.desc,id.desc&limit=${limite}&offset=${offset}`;
          const resposta = await requisitar(caminho, {
            headers: {
              apikey: chave,
              Authorization: 'Bearer ' + accessToken,
              Prefer: 'count=exact'
            }
          }, true);
          const linhas = await resposta.json();
          if (!Array.isArray(linhas)) {
            throw new StorageError('O serviço devolveu uma resposta inesperada.');
          }
          for (const linha of linhas) {
            todos.push(registroDe(linha));
          }
          const faixa = resposta.headers && resposta.headers.get
            ? resposta.headers.get('content-range')
            : null;
          const total = Number(String(faixa || '').split('/')[1]);
          if (linhas.length === 0) {
            break;
          }
          if (Number.isFinite(total) && total > 0) {
            if (offset + linhas.length >= total) {
              break;
            }
            offset += linhas.length;
          } else if (linhas.length < limite) {
            break;
          } else {
            offset += limite;
          }
        }
        return todos;
      },

      async update(id, dados) {
        const limpos = root.NexusStorage.normalizar(dados);
        const accessToken = await token();
        if (!accessToken) {
          throw new StorageError('Entre no painel para ver as ideias.');
        }
        const resposta = await requisitar(`/rest/v1/ideias?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: {
            apikey: chave,
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify({
            nome: limpos.nome,
            mensagem: limpos.mensagem
          })
        }, true);
        const linhas = await resposta.json();
        if (!Array.isArray(linhas) || linhas.length === 0) {
          throw new NotFoundError('Esta ideia não existe mais.');
        }
        return registroDe(linhas[0]);
      },

      async remove(id) {
        const accessToken = await token();
        if (!accessToken) {
          throw new StorageError('Entre no painel para ver as ideias.');
        }
        const resposta = await requisitar(`/rest/v1/ideias?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            apikey: chave,
            Authorization: 'Bearer ' + accessToken,
            Prefer: 'return=representation'
          }
        }, true);
        const linhas = await resposta.json();
        if (!Array.isArray(linhas) || linhas.length === 0) {
          throw new NotFoundError('Esta ideia não existe mais.');
        }
        return true;
      },

      async export() {
        return root.NexusStorage.paraCsv(await api.list());
      }
    };

    return {
      estaConfigurado: () => configurado,
      login,
      logout,
      sessaoAtiva: () => Boolean(sessao),
      criarAdapter: () => api
    };
  }

  let padrao = null;
  function servicoPadrao() {
    if (!padrao) {
      padrao = criarServico();
    }
    return padrao;
  }

  const api = {
    CHAVE_SESSAO,
    estaConfigurado,
    criarServico,
    login: (...argumentos) => servicoPadrao().login(...argumentos),
    logout: (...argumentos) => servicoPadrao().logout(...argumentos),
    sessaoAtiva: () => servicoPadrao().sessaoAtiva(),
    criarAdapter: () => servicoPadrao().criarAdapter()
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.NexusStorageSupabase = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
