# Arquivos de configuração do Git

Esta pasta existe para deixar claro onde ficam as configurações do Git, mas os
arquivos em si precisam continuar na **raiz do repositório**:

- `/.gitattributes` — força quebras de linha `LF` nos arquivos de texto.
- `/.gitignore` — impede o envio de `SkillsForOpenCode/`, do print local e dos
  HTML gerados na raiz durante o deploy.

O Git só lê `.gitattributes` e `.gitignore` na raiz. Se eles fossem movidos para
cá, o print local e a pasta de estudos poderiam subir por engano e as quebras de
linha deixariam de ser normalizadas.

Por isso, aqui dentro fica apenas esta explicação; os arquivos reais estão na raiz.
