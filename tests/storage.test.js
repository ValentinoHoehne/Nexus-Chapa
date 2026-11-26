const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const NexusStorage = require(path.join(__dirname, '..', 'componentes', 'storage.js'));

function criarFakeStorage() {
  const dados = new Map();
  return {
    dados,
    getItem(chave) {
      return dados.has(chave) ? dados.get(chave) : null;
    },
    setItem(chave, valor) {
      dados.set(chave, String(valor));
    },
    removeItem(chave) {
      dados.delete(chave);
    }
  };
}

function criarAdapter(store, opcoes = {}) {
  let segundo = 0;
  let sequencia = 0;
  const agora = () => new Date(Date.UTC(2026, 0, 1, 0, 0, segundo++)).toISOString();
  const gerarId = opcoes.gerarId || (() => `id-${++sequencia}`);
  return NexusStorage.criarAdapterLocalStorage(store, agora, gerarId);
}

test('create normaliza, gera id e timestamps e guarda no localStorage', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  const registro = await adapter.create({ nome: '  Ana  ', mensagem: '  Uma ideia boa para a escola  ' });

  assert.equal(registro.id, 'id-1');
  assert.equal(registro.nome, 'Ana');
  assert.equal(registro.mensagem, 'Uma ideia boa para a escola');
  assert.equal(registro.criadoEm, '2026-01-01T00:00:00.000Z');
  assert.equal(registro.atualizadoEm, registro.criadoEm);
  assert.deepEqual(JSON.parse(store.getItem(NexusStorage.CHAVE)), [registro]);
});

test('nome omitido vira string vazia', async () => {
  const adapter = criarAdapter(criarFakeStorage());
  const registro = await adapter.create({ mensagem: 'Uma sugestao para o grêmio' });
  assert.equal(registro.nome, '');
});

test('list devolve vazio quando a chave nao existe', async () => {
  const adapter = criarAdapter(criarFakeStorage());
  assert.deepEqual(await adapter.list(), []);
});

test('list ordena do mais recente para o mais antigo', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  await adapter.create({ mensagem: 'Primeira mensagem de teste' });
  await adapter.create({ mensagem: 'Segunda mensagem de teste' });
  const lista = await adapter.list();
  assert.equal(lista[0].mensagem, 'Segunda mensagem de teste');
  assert.equal(lista[1].mensagem, 'Primeira mensagem de teste');
});

test('update preserva id e criadoEm e avanca atualizadoEm', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  const original = await adapter.create({ nome: 'Ana', mensagem: 'Mensagem original de teste' });
  const alterado = await adapter.update(original.id, { nome: 'Ana Maria', mensagem: 'Mensagem editada de teste' });

  assert.equal(alterado.id, original.id);
  assert.equal(alterado.criadoEm, original.criadoEm);
  assert.equal(alterado.atualizadoEm, '2026-01-01T00:00:01.000Z');
  assert.equal((await adapter.list())[0].mensagem, 'Mensagem editada de teste');
});

test('update e remove com id inexistente lancam NotFoundError sem mutar dados', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  await adapter.create({ mensagem: 'Mensagem que deve permanecer' });
  const antes = store.getItem(NexusStorage.CHAVE);

  await assert.rejects(
    () => adapter.update('nao-existe', { mensagem: 'Outra mensagem de teste' }),
    (erro) => erro.name === 'NotFoundError'
  );
  await assert.rejects(
    () => adapter.remove('nao-existe'),
    (erro) => erro.name === 'NotFoundError'
  );
  assert.equal(store.getItem(NexusStorage.CHAVE), antes);
});

test('remove apaga o registro', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  const registro = await adapter.create({ mensagem: 'Mensagem para apagar' });
  assert.equal(await adapter.remove(registro.id), true);
  assert.deepEqual(await adapter.list(), []);
});

test('validacao rejeita mensagem curta, nome longo e mensagem longa', async () => {
  const adapter = criarAdapter(criarFakeStorage());
  await assert.rejects(() => adapter.create({ mensagem: 'curta' }), (erro) => erro.name === 'ValidationError');
  await assert.rejects(
    () => adapter.create({ nome: 'a'.repeat(81), mensagem: 'Mensagem valida de teste' }),
    (erro) => erro.name === 'ValidationError'
  );
  await assert.rejects(
    () => adapter.create({ mensagem: 'a'.repeat(2001) }),
    (erro) => erro.name === 'ValidationError'
  );
});

test('json corrompido ou registro sem id lanca StorageError', async () => {
  const store = criarFakeStorage();
  store.setItem(NexusStorage.CHAVE, '{invalido');
  const adapter = criarAdapter(store);
  await assert.rejects(() => adapter.list(), (erro) => erro.name === 'StorageError');

  store.setItem(NexusStorage.CHAVE, JSON.stringify([{ nome: '', mensagem: 'Sem id aqui' }]));
  await assert.rejects(() => adapter.list(), (erro) => erro.name === 'StorageError');
});

test('quota excedida lanca StorageError e preserva o valor anterior', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  await adapter.create({ mensagem: 'Primeira mensagem salva' });
  const antes = store.getItem(NexusStorage.CHAVE);

  store.setItem = () => {
    const erro = new Error('quota');
    erro.name = 'QuotaExceededError';
    throw erro;
  };

  await assert.rejects(
    () => adapter.create({ mensagem: 'Segunda mensagem que nao cabe' }),
    (erro) => erro.name === 'StorageError'
  );
  assert.equal(store.getItem(NexusStorage.CHAVE), antes);
});

test('getItem bloqueado lanca StorageError sem fallback silencioso', async () => {
  const store = criarFakeStorage();
  store.getItem = () => {
    const erro = new Error('bloqueado');
    erro.name = 'SecurityError';
    throw erro;
  };
  const adapter = criarAdapter(store);
  await assert.rejects(() => adapter.list(), (erro) => erro.name === 'StorageError');
});

test('acesso bloqueado à propriedade localStorage vira StorageError', () => {
  const descritor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      const erro = new Error('bloqueado');
      erro.name = 'SecurityError';
      throw erro;
    }
  });

  try {
    assert.throws(() => NexusStorage.criarAdapterLocalStorage(), (erro) => erro.name === 'StorageError');
  } finally {
    if (descritor) {
      Object.defineProperty(globalThis, 'localStorage', descritor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test('export gera CSV com BOM, CRLF, aspas duplicadas e neutraliza formulas', async () => {
  const store = criarFakeStorage();
  const adapter = criarAdapter(store);
  await adapter.create({ nome: '=HYPERLINK("x")', mensagem: '  =A1 + 2; "aspas"' });

  const csv = await adapter.export();
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('\r\n'));
  assert.ok(csv.includes('id;nome;mensagem;criadoEm;atualizadoEm'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('"\'=A1 + 2; ""aspas"""'));
});

test('criarStorage valida adapter, delega os cinco metodos e devolve Promises', async () => {
  const adapter = criarAdapter(criarFakeStorage());
  const storage = NexusStorage.criarStorage(adapter);

  assert.equal(Object.isFrozen(storage), true);
  for (const metodo of ['create', 'list', 'update', 'remove', 'export']) {
    assert.equal(typeof storage[metodo], 'function');
  }
  const lista = storage.list();
  assert.ok(lista instanceof Promise);
  assert.deepEqual(await lista, []);

  assert.throws(() => NexusStorage.criarStorage({ list() {} }), (erro) => erro.name === 'StorageError');
});

test('adapters diferentes sobre o mesmo storage enxergam os dados do outro', async () => {
  const store = criarFakeStorage();
  const primeiro = criarAdapter(store);
  const segundo = criarAdapter(store);
  await primeiro.create({ mensagem: 'Mensagem compartilhada entre adapters' });
  assert.equal((await segundo.list()).length, 1);
});
