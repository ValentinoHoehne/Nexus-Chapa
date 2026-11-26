# Contribuindo para a NEXUS

Obrigado por ajudar a melhorar o site da chapa. Este projeto é estático: não há build,
dependências ou etapa de instalação.

## Antes de começar

1. Abra uma issue descrevendo o que você quer mudar. Use os modelos de bug, feature
   ou ajuste de conteúdo.
2. Faça um fork (ou crie uma branch a partir de `main`).
3. Rode o site localmente:

```bash
npx serve . -l 8765
```

Acesse `http://127.0.0.1:8765/`.

## Padrões

- HTML, CSS e JavaScript separados. Sem frameworks.
- `index.html` precisa continuar na raiz para o GitHub Pages.
- Mantenha o slogan oficial: **Conectando ideias e construindo mudanças.**
- Não invente contatos, membros, números ou promessas.
- Respeite a identidade Lunar Forest e as fontes Cinzel/Spectral.
- Nada de `service_role` ou chave secreta no front-end. Credenciais vão nos
  Secrets do GitHub e são injetadas no deploy.

## Testes

Antes de abrir o PR:

```bash
node --test tests/*.test.js
git diff --check
```

Também confira o site em 320, 390, 768, 1188 e 1440 px, com console sem erros.

## Commits e PRs

Use commits convencionais:

```text
feat: adiciona filtro por prioridade
fix: corrige contraste do formulário
docs: atualiza guia do Supabase
test: cobre expiração da sessão
```

No PR, descreva o que mudou, como testar e marque os itens do checklist.

## Segurança

Se encontrar um problema de segurança, abra uma issue marcando `seguranca` sem
colar chaves, tokens ou dados pessoais. Não publique credenciais em comentários.
