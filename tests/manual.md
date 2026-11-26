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
