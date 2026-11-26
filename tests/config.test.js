const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const arquivo = path.join(raiz, 'componentes', 'config.js');

function papelDoJwt(conteudo) {
  const jwt = conteudo.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (!jwt) {
    return null;
  }
  const payload = jwt[0].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role || null;
}

test('config.js nao contem chave de servico', () => {
  const conteudo = fs.readFileSync(arquivo, 'utf8');
  assert.doesNotMatch(conteudo, /sb_secret_/i);
  assert.notEqual(papelDoJwt(conteudo), 'service_role');
});

test('config.js comeca vazio para o modo local', () => {
  const conteudo = fs.readFileSync(arquivo, 'utf8');
  assert.match(conteudo, /supabaseUrl:\s*''/);
  assert.match(conteudo, /supabaseKey:\s*''/);
});

test('workflow injeta config.js a partir de Secrets', () => {
  const fluxo = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'deploy.yml'), 'utf8');
  assert.match(fluxo, /secrets\.SUPABASE_URL/);
  assert.match(fluxo, /secrets\.SUPABASE_PUBLISHABLE_KEY/);
});

test('workflow recusa chave de servico e valida a URL', () => {
  const fluxo = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'deploy.yml'), 'utf8');
  assert.match(fluxo, /sb_secret_/);
  assert.match(fluxo, /service_role/);
  assert.match(fluxo, /https:\/\/\*\.supabase\.co/);
});

test('workflow testa antes de gerar config e versiona o script no HTML', () => {
  const fluxo = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'deploy.yml'), 'utf8');
  const teste = fluxo.indexOf('node --test tests/*.test.js');
  const geracao = fluxo.indexOf('> componentes/config.js');
  const versionamento = fluxo.indexOf('config.js?v=$VERSAO');
  const upload = fluxo.indexOf('upload-pages-artifact');
  assert.ok(teste >= 0 && teste < geracao, 'testes precisam rodar antes de gerar config.js');
  assert.ok(geracao < versionamento && versionamento < upload, 'config versionado antes do upload');
});

test('setup.sql usa tabela de administradores sem placeholder', () => {
  const sql = fs.readFileSync(path.join(raiz, 'supabase', 'setup.sql'), 'utf8');
  assert.doesNotMatch(sql, /COLOQUE_O_UUID_DO_ADMIN/);
  assert.match(sql, /create table if not exists public\.nexus_admins/);
  assert.match(sql, /public\.nexus_eh_admin\(\)/);
});

test('formulario tem honeypot que bloqueia antes do create', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(raiz, 'componentes', 'script.js'), 'utf8');
  const css = fs.readFileSync(path.join(raiz, 'estilos', 'styles.css'), 'utf8');
  assert.match(html, /class="honeypot" aria-hidden="true"/);
  assert.match(html, /id="feedback-site"[^>]*tabindex="-1"[^>]*autocomplete="off"/);
  assert.match(css, /\.honeypot\s*\{[^}]*clip-path: inset\(50%\)/);
  const bloqueio = js.indexOf('site.value.trim()');
  const envio = js.indexOf('storage.create');
  assert.ok(bloqueio >= 0 && bloqueio < envio, 'honeypot precisa barrar antes de enviar');
});

test('nota de privacidade aparece so no modo Supabase e reusa contato existente', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(raiz, 'componentes', 'script.js'), 'utf8');
  assert.match(html, /id="feedback-privacidade" hidden/);
  assert.match(js, /privacidade\.hidden = !modoSupabase/);
  const trecho = html.match(/<p class="form-note form-note--privacidade"[\s\S]*?<\/p>/);
  assert.ok(trecho, 'nota de privacidade ausente');
  const telefones = [...html.matchAll(/https:\/\/wa\.me\/(\d+)/g)].map((m) => m[1]);
  const daNota = trecho[0].match(/https:\/\/wa\.me\/(\d+)/);
  assert.ok(daNota, 'nota de privacidade precisa linkar para um WhatsApp');
  assert.ok(telefones.includes(daNota[1]), ' WhatsApp da nota nao existe nos contatos do site');
});

test('scripts carregam na ordem config -> storage -> supabase -> pagina', () => {
  for (const nome of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(raiz, nome), 'utf8');
    const posicoes = [
      'componentes/config.js',
      'componentes/storage.js',
      'componentes/supabase.js',
      nome === 'index.html' ? 'componentes/script.js' : 'componentes/admin.js'
    ].map((trecho) => html.indexOf(`<script src="${trecho}"`));
    assert.ok(posicoes.every((posicao) => posicao >= 0), nome + ': script ausente');
    assert.deepEqual(posicoes, [...posicoes].sort((a, b) => a - b), nome + ': ordem errada');
  }
});
