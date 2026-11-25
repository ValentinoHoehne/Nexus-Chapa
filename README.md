# NEXUS — Grêmio estudantil

![Prévia do NEXUS](assets/nexus-og.png)

> **Conectando ideias e construindo mudanças.** Chapa NEXUS · grêmio estudantil.

Página estática de apresentação do grêmio estudantil NEXUS. Direta ao ponto, mobile-first e sem cadastro: o foco é deixar claro o que a chapa faz e como a comunidade pode falar com a gente.

![HTML5](https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?style=for-the-badge&logo=github&logoColor=white)

---

## 🌙 A ideia

Identidade **Lunar Forest** levada ao extremo editorial: fundo carvão `#100E16`, superfícies em roxo profundo `#1C1725`, acentos em violeta `#684C78` e lilás `#B99BCB`, tipografia clara `#D9D0DF` e um toque de musgo `#68745E`. A atmosfera é de floresta noturna **sem desenhar galhos, folhas ou flores**: o que resta é a lua, linhas de conexão e pontos de luz discretos.

Cinzel comanda os títulos e a marca; Spectral conduz a leitura. Cada seção tem uma composição própria — hero em duas colunas, manifesto, prioridades em escada, índice de propostas, contato em linhas, formulário aberto e chamada final em spread. As seis áreas e todas as propostas continuam no ar, com as três prioridades principais em destaque.

Tudo é HTML e CSS puro. O único JavaScript simula o envio do feedback e fecha o menu mobile.

## ✨ O que tem

- Cabeçalho fixo com navegação por âncoras e menu mobile via `<details>`.
- Hero assimétrico, tipografia-first: **NEXUS** domina e o slogan oficial vem logo abaixo.
- Prioridades em destaque sobre painéis planos e recuados: Voz e Transparência, Esporte e Competição, Cultura e Entretenimento.
- Outras propostas em índice discreto: Educação e Futuro, Bem-estar e Acolhimento e Período Noturno (complementar).
- Barra roxa de 6px entre as seções, com um pequeno ponto lilás de conexão.
- Símbolo lunar da Lucide (ISC) e motivo de conexão original: só retas e pontos.
- Formulário de feedback com validação, estado de envio e mensagem de sucesso **simulados**.
- Fontes Cinzel e Spectral hospedadas no próprio projeto.
- Layout responsivo testado em 320, 390, 768 e 1188 px, sem overflow horizontal.

## 🚀 Ver online

**[valentinohoehne.github.io/Nexus-Chapa](https://valentinohoehne.github.io/Nexus-Chapa/)**

O deploy é automático via GitHub Pages a cada push em `main`.

## 🧱 Estrutura

```text
Nexus-Chapa/
├── index.html                 # entrada do site (precisa ficar na raiz para o Pages)
├── README.md
├── componentes/
│   └── script.js              # feedback simulado + fechamento do menu mobile
├── estilos/
│   └── styles.css             # paleta, composições, transições e responsividade
└── assets/
    ├── fonts/                 # Cinzel e Spectral (self-hosted)
    ├── icones/                # lua da Lucide + conexão original + LICENSE.txt (ISC)
    ├── nexus-mark.png         # marca usada na navbar e no favicon
    └── nexus-og.png           # preview social (1200×630)
```

## 🛠 Como rodar localmente

Não há build, dependências nem etapa de instalação.

**Opção mais simples:** abra `index.html` no navegador.

**Ou com um servidor local estático:**

```bash
npx serve .
```

Depois acesse o endereço mostrado no terminal (normalmente `http://localhost:3000`).

## 🎨 Onde mexer

| O que você quer mudar | Onde fica |
| --- | --- |
| Cores, tipografia e espaçamentos | `estilos/styles.css` (variáveis no `:root`) |
| Textos e seções | `index.html` |
| Barra entre seções | `estilos/styles.css` — `.doc > section::after` |
| Destaque das três prioridades | `estilos/styles.css` — `.priority` |
| Símbolos decorativos | `assets/icones/` (Lua Lucide ISC + conexão original) |
| Envio real do formulário | `componentes/script.js` — trocar o `setTimeout` por `fetch()` |

## ✅ Qualidade

- Lighthouse: **100** em acessibilidade, boas práticas e SEO.
- `overflow-x: 0` em 320, 390, 768 e 1188 px.
- Console sem erros; fontes e scripts carregando nos caminhos corretos.
- Respeito a `prefers-reduced-motion`.

## 📌 Ainda provisório

- E-mail e WhatsApp de contato.
- Envio do feedback: hoje é apenas uma demonstração, sem back-end.

---

Feito para a comunidade escolar. 🌙
