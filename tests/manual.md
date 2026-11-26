# Roteiro manual — protótipo local de feedback

Use sempre a mesma origem: `http://127.0.0.1:8765/`.

1. Abrir `index.html`, preencher o nome e uma mensagem com 10+ caracteres.
2. Enviar com mensagem curta: deve aparecer erro, `aria-invalid="true"` e o botão não trava.
3. Enviar com mensagem válida: "Salvando..." → "Ideia salva neste navegador...".
4. Abrir `admin.html` na **mesma origem**: o registro aparece com data, nome e mensagem.
5. Buscar por parte do nome e da mensagem, inclusive com acento (ex.: "acolhimento" encontra "Acolhimento").
6. Editar: alterar nome/mensagem, salvar, conferir a data de criação preservada.
7. Excluir: confirmar cancela e confirma remove; o foco volta para um controle do painel.
8. Exportar CSV: abrir o arquivo e conferir BOM, cabeçalho e que uma mensagem
   começando com `=HYPERLINK(...)` aparece com `'` na frente.
9. Abrir outra aba do painel e enviar uma ideia nova: a primeira aba atualiza sozinha.
10. Fechar e reabrir o navegador (mesma origem): os registros continuam lá.
11. Conferir larguras 320, 390, 768 e 1188 px: sem overflow horizontal.
12. Teclado: Tab alcança busca, exportar e botões da tabela; Esc fecha os diálogos.
13. Console do navegador sem erros.

Para limpar os dados de propósito: DevTools → Application → Local Storage →
apagar a chave `nexus:feedback:v1`.

## Modo Supabase (depois de seguir o GUIA-SUPABASE.md)

Use a origem pública `https://valentinohoehne.github.io/Nexus-Chapa/`.

1. Com `config.js` preenchido, o texto do formulário muda para "Sua ideia é enviada à chapa NEXUS".
2. Enviar sem nome e com mensagem de 10+ caracteres: deve aparecer "Ideia enviada. Obrigado!".
3. Abrir `admin.html` sem login: aparece a tela "Área restrita", sem tabela de ideias.
4. Entrar com a conta da chapa: a ideia enviada no passo 2 aparece na tabela.
5. Editar e excluir: as alterações persistem no banco após recarregar (Ctrl+F5).
6. Exportar CSV: BOM, cabeçalho e fórmulas neutralizadas com `'`.
7. Sair: volta à tela de login e a tabela fica escondida.
8. Recarregar a página: pede login de novo. A sessão é só em memória — não existe
   mais chave `nexus:auth:v1` em Session Storage, por segurança no domínio `github.io`.
9. Se o token expirar durante o uso (401), o painel volta ao login e fecha qualquer
   diálogo aberto, com "Sessão expirada. Entre novamente." Enquanto a aba está ativa,
   o refresh renova a sessão automaticamente.
10. Em janela privada, confirmar que o visitante não consegue listar nada (RLS) e
    que outra conta autenticada também não (policy por UUID do admin).
11. Conferir 320, 390, 768 e 1188 px e console sem erros.
