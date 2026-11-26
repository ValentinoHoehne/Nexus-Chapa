# Guia Supabase — envio real das ideias

Atualmente o site salva as ideias só no navegador. Este guia ativa o modo real:
visitante envia sem login, e **somente a conta de administrador autorizada** acessa o painel.

> **Não use a chave `service_role` em nenhum momento.** Ela ignora RLS e daria
> acesso total a qualquer pessoa. A chave publicável/anon é pública por design;
> a proteção é a RLS do banco. O workflow recusa chaves de servidor se você colar a errada.

## 1. Criar o projeto

1. Entre em [supabase.com](https://supabase.com/) e crie uma conta.
2. **New project** → nome `Nexus-Chapa`, senha do banco forte, região próxima (ex.: São Paulo).
3. Guarde a senha do banco em local seguro; ela não vai para o site.

## 2. Criar sua conta de administrador **antes** do SQL

1. **Authentication → Providers** → confirme que **Email** está habilitado.
2. Ainda em **Email**, desligue **“Allow new users to sign up”**. Assim ninguém
   cria outra conta que tentaria acessar o painel.
3. Se **Confirm email** estiver ligado, desligue ou confirme o link enviado.
4. **Authentication → Users → Add user** → e-mail e senha fortes → marque **Auto Confirm**.
5. Nessa mesma tela, copie o **UUID** do usuário criado. Ele é obrigatório no passo 3.

Essa será a conta usada em `admin.html`.

## 3. Criar tabela e regras de acesso

1. No projeto, abra **SQL Editor → New query**.
2. Abra `supabase/setup.sql` e substitua **todas** as ocorrências de
   `COLOQUE_O_UUID_DO_ADMIN` pelo UUID copiado no passo 2.
3. Clique em **Run**. Se der erro de UUID, você esqueceu de substituir o placeholder —
   isso falha de propósito: melhor falhar fechado do que liberar o painel.
4. Confira em **Table Editor** que a tabela `public.ideias` existe.
5. Confira em **Authentication → Policies** que existem quatro policies:
   `anon_insert_ideias`, `admin_select_ideias`, `admin_update_ideias`, `admin_delete_ideias`.
6. Confira também que há um trigger `nexus_ideias_timestamps`: as datas vêm do
   servidor, não do relógio de quem envia.

Regra resultante: visitante consegue **inserir**, mas não lê, edita nem exclui.
Entre os usuários autenticados, **só o UUID autorizado** lê, edita e exclui.

## 4. Pegar URL e chave

Em **Project Settings → API**:

- **Project URL**: `https://imfipxtazvphejwaerze.supabase.co/rest/v1/`
- **Publishable key**: `qzcOKAW4PAzU-TVR2m9bBQ_rOTPYimd...` (se não aparecer, use a chave `anon` legada)

Copie os dois valores. Não copie `service_role` nem chave `sb_secret_...`.

## 5. Configurar os Secrets no GitHub

No repositório `ValentinoHoehne/Nexus-Chapa`:

**Settings → Secrets and variables → Actions → New repository secret**

| Nome | Valor |
| --- | --- |
| `SUPABASE_URL` | a Project URL do passo 4 |
| `SUPABASE_PUBLISHABLE_KEY` | a Publishable/anon key do passo 4 |

Sem esses dois segredos o workflow falha de propósito — melhor falhar do que
publicar um site que promete envio e não envia.

## 6. Mudar a origem do GitHub Pages

**Settings → Pages → Build and deployment → Source**: mude de **Deploy from a branch**
para **GitHub Actions**.

O arquivo `.github/workflows/deploy.yml`:

1. roda `node --test tests/` **antes** de gerar a config;
2. valida a URL (`https://....supabase.co`) e recusa chaves de servidor;
3. gera `componentes/config.js` com os segredos;
4. grava `componentes/config.js?v=<commit>` nos dois HTML para evitar cache antigo.

O arquivo versionado fica vazio. Assim nenhuma chave entra no repositório.

## 7. Publicar e testar

1. Faça um push em `main` (ou rode **Actions → Deploy Pages (Supabase) → Run workflow**).
2. Espere o workflow ficar verde.
3. Abra o site com **Ctrl+F5**: o texto do formulário muda para “Sua ideia é enviada à chapa NEXUS”.
4. Envie uma ideia em uma janela privada.
5. Abra `admin.html`, entre com a conta do passo 2, confira a ideia, edite, exclua e exporte CSV.
6. Recarregue `admin.html`: pede login de novo. Isso é esperado — a sessão fica só
   em memória, sem token em `sessionStorage`, porque `github.io` compartilha origem
   com outros projetos publicados.
7. Crie outra conta com signup desligado (ou use outro usuário de teste) e confirme
   que ela não consegue ver as ideias: a RLS barra.
8. Em janela privada, confirme que o visitante sem login não consegue listar nada.

## Sessão do painel

- O token fica **apenas na memória da aba**. Ao recarregar ou fechar a aba, entre novamente.
- Enquanto a aba está aberta, o token é renovado automaticamente antes de expirar.
- Se a renovação falhar ou o serviço responder 401, o painel volta ao login com
  “Sessão expirada. Entre novamente.” e fecha qualquer diálogo aberto.
- Nunca guarde a senha ou o `refresh_token` no código, em comentário ou no repositório.

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| Texto continua “Protótipo local” | cache ou `config.js` vazio no ar | Ctrl+F5; conferir se o workflow rodou com os Secrets |
| Erro de CORS no console | origem não liberada | Supabase → Project Settings → API → CORS → incluir `https://valentinohoehne.github.io` |
| “E-mail ou senha incorretos” | usuário não confirmado | confirmar o e-mail ou criar usuário com Auto Confirm |
| “Você não tem permissão para isso” | UUID do admin diferente do placeholder | rodar `setup.sql` de novo com o UUID correto |
| Visitante consegue ler ideias | RLS errada | parar o deploy e revisar `supabase/setup.sql` |
| Workflow falha “Chave de servico recusada” | foi colada `service_role`/`sb_secret_` | repetir o passo 4 com a Publishable key |
| Workflow falha “SUPABASE_URL ausente” | segredo não criado | repetir o passo 5 com os nomes exatos |

## Modo local continua disponível

Com `componentes/config.js` vazio (estado versionado), o site segue funcionando
como protótipo local em `http://127.0.0.1:8765/`. Isso permite desenvolver e
rodar os testes sem rede: `node --test tests/`.
