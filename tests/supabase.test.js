const test = require('node:test');
const assert = require('node:assert/strict');

require('../componentes/storage.js');
const supabase = require('../componentes/supabase.js');

const CONFIG = {
  supabaseUrl: 'https://teste.supabase.co',
  supabaseKey: 'chave-publica'
};

function memoria(inicial) {
  const dados = new Map(Object.entries(inicial || {}));
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: (chave) => dados.delete(chave),
    get tamanho() {
      return dados.size;
    }
  };
}

function fetchFalso(respostas) {
  const fila = [...respostas];
  const chamadas = [];
  const fn = async (url, init) => {
    chamadas.push({ url, init: init || {} });
    const atual = fila.shift();
    assert.ok(atual, 'fetch chamado mais vezes do que o previsto: ' + url);
    if (atual.erro) {
      throw atual.erro;
    }
    return {
      ok: (atual.status || 200) >= 200 && (atual.status || 200) < 300,
      status: atual.status || 200,
      headers: { get: (nome) => (atual.headers || {})[nome.toLowerCase()] || null },
      json: async () => atual.body
    };
  };
  fn.chamadas = chamadas;
  return fn;
}

function servico(respostas, opcoes) {
  const sessionStore = (opcoes && opcoes.sessionStore) || memoria();
  const fetchFn = fetchFalso(respostas);
  return {
    sessionStore,
    fetchFn,
    api: supabase.criarServico({
      config: (opcoes && opcoes.config) || CONFIG,
      fetchFn,
      sessionStore,
      agora: (opcoes && opcoes.agora) || (() => '2026-01-02T03:04:05.000Z')
    })
  };
}

function sessao(sobreposto) {
  return Object.assign(
    {
      access_token: 'token-admin',
      refresh_token: 'refresh-admin',
      expiresAt: Date.now() + 3600000
    },
    sobreposto || {}
  );
}

test('estaConfigurado exige https e chave', () => {
  const bom = servico([], { config: CONFIG }).api;
  assert.equal(bom.estaConfigurado(), true);
  const ruim = servico([], {
    config: { supabaseUrl: 'http://inseguro', supabaseKey: 'chave' }
  }).api;
  assert.equal(ruim.estaConfigurado(), false);
});

test('create envia INSERT anonimo com return=minimal e devolve o registro', async () => {
  const { api, fetchFn } = servico([{ status: 201, body: null }]);
  const registro = await api.criarAdapter().create({ nome: ' Ana ', mensagem: 'Uma ideia boa' });

  assert.equal(registro.nome, 'Ana');
  assert.match(registro.id, /^[0-9a-f-]{36}$/i);
  assert.equal(registro.criadoEm, '2026-01-02T03:04:05.000Z');
  assert.equal(registro.atualizadoEm, registro.criadoEm);

  const chamada = fetchFn.chamadas[0];
  assert.equal(chamada.url, 'https://teste.supabase.co/rest/v1/ideias');
  assert.equal(chamada.init.method, 'POST');
  assert.equal(chamada.init.headers.apikey, 'chave-publica');
  assert.equal(chamada.init.headers.Authorization, 'Bearer chave-publica');
  assert.equal(chamada.init.headers.Prefer, 'return=minimal');
  const enviado = JSON.parse(chamada.init.body);
  assert.equal(enviado.mensagem, 'Uma ideia boa');
  assert.equal(enviado.criado_em, undefined);
  assert.equal(enviado.atualizado_em, undefined);
});

test('create valida antes de chamar a rede', async () => {
  const { api, fetchFn } = servico([]);
  await assert.rejects(
    () => api.criarAdapter().create({ mensagem: 'curta' }),
    (erro) => erro.name === 'ValidationError'
  );
  assert.equal(fetchFn.chamadas.length, 0);
});

test('login salva sessao e mensagem de erro de credenciais', async () => {
  const { api, sessionStore } = servico([
    {
      body: { access_token: 'abc', refresh_token: 'def', expires_in: 3600 }
    }
  ]);
  await api.login('admin@nexus.test', 'senha');
  const salvo = JSON.parse(sessionStore.getItem(supabase.CHAVE_SESSAO));
  assert.equal(salvo.access_token, 'abc');
  assert.equal(salvo.refresh_token, 'def');
  assert.ok(salvo.expiresAt > Date.now());

  for (const resposta of [
    { status: 401, body: { msg: 'invalid' } },
    { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid login credentials' } }
  ]) {
    const ruim = servico([resposta]).api;
    await assert.rejects(
      () => ruim.login('admin@nexus.test', 'errada'),
      (erro) => erro.name === 'StorageError' && /E-mail ou senha/.test(erro.message)
    );
  }
});

test('list usa token, ordena e converte timestamps com +00:00', async () => {
  const store = memoria({
    [supabase.CHAVE_SESSAO]: JSON.stringify(sessao())
  });
  const { api, fetchFn } = servico(
    [
      {
        body: [
          {
            id: '1',
            nome: '',
            mensagem: 'Ola',
            criado_em: '2026-01-02T03:04:05+00:00',
            atualizado_em: '2026-01-02T03:04:05+00:00'
          }
        ]
      }
    ],
    { sessionStore: store }
  );

  const itens = await api.criarAdapter().list();
  assert.equal(itens.length, 1);
  assert.equal(itens[0].criadoEm, '2026-01-02T03:04:05.000Z');
  assert.match(fetchFn.chamadas[0].url, /order=criado_em\.desc,id\.desc/);
  assert.equal(fetchFn.chamadas[0].init.headers.Authorization, 'Bearer token-admin');
});

test('list pagina em blocos de 1000', async () => {
  const linha = (i) => ({
    id: String(i),
    nome: '',
    mensagem: 'Mensagem de teste',
    criado_em: '2026-01-02T03:04:05Z',
    atualizado_em: '2026-01-02T03:04:05Z'
  });
  const primeira = Array.from({ length: 1000 }, (_, i) => linha(i));
  const { api, fetchFn } = servico([{ body: primeira }, { body: [linha(1000)] }], {
    sessionStore: memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) })
  });

  assert.equal((await api.criarAdapter().list()).length, 1001);
  assert.equal(fetchFn.chamadas.length, 2);
  assert.match(fetchFn.chamadas[0].url, /offset=0/);
  assert.match(fetchFn.chamadas[1].url, /offset=1000/);
});

test('token expirado renova uma vez e reusa o novo token', async () => {
  const store = memoria({
    [supabase.CHAVE_SESSAO]: JSON.stringify(sessao({ expiresAt: Date.now() - 1 }))
  });
  const { api, fetchFn } = servico(
    [
      { body: { access_token: 'novo', refresh_token: 'r2', expires_in: 3600 } },
      { body: [] }
    ],
    { sessionStore: store }
  );

  assert.deepEqual(await api.criarAdapter().list(), []);
  assert.match(fetchFn.chamadas[0].url, /grant_type=refresh_token/);
  assert.equal(fetchFn.chamadas[1].init.headers.Authorization, 'Bearer novo');
  assert.equal(JSON.parse(store.getItem(supabase.CHAVE_SESSAO)).access_token, 'novo');
});

test('falha no refresh limpa a sessao', async () => {
  const store = memoria({
    [supabase.CHAVE_SESSAO]: JSON.stringify(sessao({ expiresAt: Date.now() - 1 }))
  });
  const { api } = servico([{ status: 400, body: {} }], { sessionStore: store });

  await assert.rejects(
    () => api.criarAdapter().list(),
    (erro) => erro.name === 'StorageError' && /Sessão expirada/.test(erro.message)
  );
  assert.equal(store.getItem(supabase.CHAVE_SESSAO), null);
  assert.equal(api.sessaoAtiva(), false);
});

test('401 autenticado encerra sessao; 403 e codigos de validacao viram erros proprios', async () => {
  const store401 = memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) });
  const ruim401 = servico([{ status: 401, body: {} }], { sessionStore: store401 }).api;
  await assert.rejects(
    () => ruim401.criarAdapter().list(),
    (erro) => erro.name === 'StorageError' && /Sessão expirada/.test(erro.message)
  );
  assert.equal(store401.getItem(supabase.CHAVE_SESSAO), null);

  const proibido = servico([{ status: 403, body: { code: '42501' } }], {
    sessionStore: memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) })
  }).api;
  await assert.rejects(
    () => proibido.criarAdapter().list(),
    (erro) => erro.name === 'StorageError' && /permissão/.test(erro.message)
  );

  const check = servico([{ status: 400, body: { code: '23514' } }]).api;
  await assert.rejects(
    () => check.criarAdapter().create({ mensagem: 'Mensagem valida' }),
    (erro) => erro.name === 'ValidationError'
  );

  const conflito = servico([{ status: 409, body: {} }]).api;
  await assert.rejects(
    () => conflito.criarAdapter().create({ mensagem: 'Mensagem valida' }),
    (erro) => erro.name === 'StorageError' && /Conflito/.test(erro.message)
  );
});

test('update e remove tratam registro inexistente', async () => {
  const linha = {
    id: 'abc',
    nome: 'Ana',
    mensagem: 'Mensagem atualizada',
    criado_em: '2026-01-01T00:00:00Z',
    atualizado_em: '2026-01-02T03:04:05Z'
  };
  const adapter = servico(
    [{ body: [] }, { body: [linha] }, { body: [] }, { body: [linha] }],
    { sessionStore: memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) }) }
  ).api.criarAdapter();

  await assert.rejects(
    () => adapter.update('sumiu', { mensagem: 'Mensagem atualizada' }),
    (erro) => erro.name === 'NotFoundError'
  );
  assert.deepEqual(
    await adapter.update('abc', { nome: 'Ana', mensagem: 'Mensagem atualizada' }),
    {
      id: 'abc',
      nome: 'Ana',
      mensagem: 'Mensagem atualizada',
      criadoEm: '2026-01-01T00:00:00.000Z',
      atualizadoEm: '2026-01-02T03:04:05.000Z'
    }
  );
  await assert.rejects(
    () => adapter.remove('sumiu'),
    (erro) => erro.name === 'NotFoundError'
  );
  assert.equal(await adapter.remove('abc'), true);
});

test('export gera CSV com BOM e neutraliza formulas', async () => {
  const linha = {
    id: '1',
    nome: '=HYPERLINK("x")',
    mensagem: 'Mensagem normal',
    criado_em: '2026-01-02T03:04:05Z',
    atualizado_em: '2026-01-02T03:04:05Z'
  };
  const api = servico([{ body: [linha] }], {
    sessionStore: memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) })
  }).api;

  const csv = await api.criarAdapter().export();
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"'=HYPERLINK/);
});

test('logout chama o endpoint e apaga a sessao local', async () => {
  const store = memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) });
  const { api, fetchFn } = servico([{ body: {} }], { sessionStore: store });

  await api.logout();
  assert.match(fetchFn.chamadas[0].url, /\/auth\/v1\/logout$/);
  assert.equal(fetchFn.chamadas[0].init.headers.Authorization, 'Bearer token-admin');
  assert.equal(store.getItem(supabase.CHAVE_SESSAO), null);
  assert.equal(api.sessaoAtiva(), false);
});

test('sem fetch disponivel o adapter falha com mensagem amigavel', async () => {
  const api = supabase.criarServico({ config: CONFIG, fetchFn: null });
  await assert.rejects(
    () => api.criarAdapter().create({ mensagem: 'Mensagem valida' }),
    (erro) => erro.name === 'StorageError'
  );
});

test('fetch travado expira e devolve erro amigavel', async () => {
  const fetchPreso = (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('abortada')), { once: true });
  });
  const api = supabase.criarServico({
    config: CONFIG,
    fetchFn: fetchPreso,
    timeoutMs: 20
  });
  await assert.rejects(
    () => api.criarAdapter().create({ mensagem: 'Mensagem valida' }),
    (erro) => erro.name === 'StorageError' && /Não foi possível conectar/.test(erro.message)
  );
});

test('renovacao concorrente usa um unico refresh', async () => {
  const store = memoria({
    [supabase.CHAVE_SESSAO]: JSON.stringify(sessao({ expiresAt: Date.now() - 1 }))
  });
  const { api, fetchFn } = servico(
    [
      { body: { access_token: 'novo', refresh_token: 'r2', expires_in: 3600 } },
      { body: [] },
      { body: [] }
    ],
    { sessionStore: store }
  );
  const adapter = api.criarAdapter();

  assert.deepEqual(await Promise.all([adapter.list(), adapter.list()]), [[], []]);
  assert.equal(fetchFn.chamadas.filter((chamada) => /grant_type=refresh_token/.test(chamada.url)).length, 1);
  assert.equal(fetchFn.chamadas.length, 3);
  assert.equal(fetchFn.chamadas[1].init.headers.Authorization, 'Bearer novo');
  assert.equal(fetchFn.chamadas[2].init.headers.Authorization, 'Bearer novo');
});

test('list usa content-range quando o servidor limita linhas', async () => {
  const linha = (i) => ({
    id: String(i),
    nome: '',
    mensagem: 'Mensagem de teste',
    criado_em: '2026-01-02T03:04:05Z',
    atualizado_em: '2026-01-02T03:04:05Z'
  });
  const { api, fetchFn } = servico(
    [
      { body: [linha(0)], headers: { 'content-range': '0-0/2' } },
      { body: [linha(1)], headers: { 'content-range': '1-1/2' } }
    ],
    { sessionStore: memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) }) }
  );

  assert.equal((await api.criarAdapter().list()).length, 2);
  assert.match(fetchFn.chamadas[0].init.headers.Prefer, /count=exact/);
  assert.match(fetchFn.chamadas[1].url, /offset=1/);
});

test('401 e 403 em edicao, exclusao e exportacao sao tratados', async () => {
  const ativa = () => memoria({ [supabase.CHAVE_SESSAO]: JSON.stringify(sessao()) });

  const expirada = servico([{ status: 401, body: {} }], { sessionStore: ativa() }).api;
  await assert.rejects(
    () => expirada.criarAdapter().update('abc', { mensagem: 'Mensagem valida' }),
    (erro) => /Sessão expirada/.test(erro.message)
  );

  const negada = servico([{ status: 403, body: { code: '42501' } }], { sessionStore: ativa() }).api;
  await assert.rejects(
    () => negada.criarAdapter().remove('abc'),
    (erro) => /permissão/.test(erro.message)
  );

  const storeExport = ativa();
  const exportacao = servico([{ status: 401, body: {} }], { sessionStore: storeExport }).api;
  await assert.rejects(
    () => exportacao.criarAdapter().export(),
    (erro) => /Sessão expirada/.test(erro.message)
  );
  assert.equal(storeExport.getItem(supabase.CHAVE_SESSAO), null);
});
