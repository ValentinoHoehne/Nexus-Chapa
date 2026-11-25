# NEXUS — Grêmio estudantil

![Prévia do NEXUS](assets/nexus-og.png)

> **Por uma escola mais participativa, integrada e acolhedora.** Ouvir, encaminhar, publicar.

Página estática de apresentação do grêmio estudantil NEXUS. Direta ao ponto, mobile-first e sem cadastro: o foco é deixar claro o que a chapa faz e como a comunidade pode falar com a gente.

![HTML5](https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?style=for-the-badge&logo=github&logoColor=white)

---

## 🌿 A ideia

O visual segue uma **floresta mística**: carvão e verde profundo, luz de lua em lilás, musgo e pequenos pontos âmbar. As transições entre seções são tranças de cinco galhos finos, geradas por um componente próprio — orgânicas, mas limpas, sem animações chamativas.

Tudo é HTML e CSS puro. O único JavaScript é o necessário para o componente de divisória e para simular o envio do feedback.

## ✨ O que tem

- Cabeçalho fixo com navegação por âncoras e menu mobile via `<details>`.
- Cinco blocos em tela cheia, com a mesma altura: início, quem somos, propostas, contato e feedback.
- Divisor orgânico reutilizável em todas as transições, com `flip` e `variant`.
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
├── paginas/
│   └── divisores.html         # painel local de comparação das opções de divisor
├── componentes/
│   ├── branch-divider.js      # <branch-divider> — trança de galhos em SVG inline
│   └── script.js              # feedback simulado + fechamento do menu mobile
├── estilos/
│   └── styles.css             # paleta, gradientes, layout e responsividade
└── assets/
    ├── fonts/                 # Cinzel e Spectral (self-hosted)
    ├── divider-options/       # opções antigas de divisor + referência visual
    ├── nexus-mark.png         # marca usada na navbar e no favicon
    ├── nexus-og.png           # preview social (1200×630)
    └── nexus-divider.svg      # divisor antigo, mantido como referência
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
| Cores, gradientes e espaçamentos | `estilos/styles.css` (variáveis no `:root`) |
| Textos e seções | `index.html` |
| Forma dos galhos, tons e folhas | `componentes/branch-divider.js` |
| Divisor em cada transição | atributos `variant` e `flip` em `<branch-divider>` |
| Envio real do formulário | `componentes/script.js` — trocar o `setTimeout` por `fetch()` |

Exemplo de uso do componente:

```html
<branch-divider class="divider--organic" variant="2" flip="x" aria-hidden="true"></branch-divider>
```

`flip` aceita `x`, `y` ou `both`; `variant` muda a fase e a direção da trança.

## ✅ Qualidade

- Lighthouse: **100** em acessibilidade, boas práticas e SEO.
- Blocos com alturas iguais e `overflow-x: 0` em 320, 390, 768 e 1188 px.
- Console sem erros; fontes e scripts carregando nos caminhos corretos.
- Respeito a `prefers-reduced-motion`.

## 📌 Ainda provisório

- Textos das propostas e do “Quem somos”.
- E-mail e WhatsApp de contato.
- Envio do feedback: hoje é apenas uma demonstração, sem back-end.

---

Feito para a comunidade escolar. 🌙
