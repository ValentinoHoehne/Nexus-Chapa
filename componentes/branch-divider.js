// Divisor orgânico reutilizável: <branch-divider variant="1" flip="x"></branch-divider>
// Cinco galhos finos e contínuos, entrelaçados por pequenas sobreposições nos cruzamentos.
// O viewBox segue innerWidth (o SVG é full-bleed), então nada distorce.
// Paleta derivada de styles.css: --green-muted, --purple, --purple-light e --accent.

let dividerSeq = 0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const n = (value) => Number(value).toFixed(1);
const TAU = Math.PI * 2;

const STRANDS = Array.from({ length: 5 }, (_, i) => ({
  phase: (TAU * i) / 5,
  tone: ["a", "b", "c", "a", "b"][i],
}));

function smoothPath(points) {
  let d = `M ${n(points[0][0])} ${n(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    d += ` Q ${n(points[i][0])} ${n(points[i][1])} ${n(mx)} ${n(my)}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${n(last[0])} ${n(last[1])}`;
}

function interpolate(points, t) {
  const k = Math.min(points.length - 2, Math.max(0, Math.floor(t * (points.length - 1))));
  const a = points[k];
  const b = points[k + 1];
  const f = (t - a.t) / (b.t - a.t || 1);
  return { t, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function slice(points, from, to) {
  const out = [interpolate(points, from)];
  for (const p of points) {
    if (p.t > from + 1e-6 && p.t < to - 1e-6) out.push(p);
  }
  out.push(interpolate(points, to));
  return out;
}

/**
 * Fábrica do componente. Retorna o SVG inline pronto para inserir no DOM.
 * @param {Object} options
 * @param {number} options.width - largura em px do container
 * @param {number} options.height - altura visível em px (40 a 80)
 * @param {number|string} options.variant - muda a fase e a direção da trança
 * @param {string} options.flip - "x", "y" ou "both"
 * @param {string} options.className - classes extras aplicadas ao SVG
 */
function BranchDivider({
  width = window.innerWidth,
  height = 56,
  variant = 0,
  flip = "",
  className = "",
} = {}) {
  const w = Math.max(320, Math.round(width));
  const h = clamp(Math.round(height), 40, 80);
  const v = Number(variant) || 0;
  const uid = `bd${++dividerSeq}`;
  const direction = flip === "y" ? "y" : flip === "both" ? "both" : flip ? "x" : "";
  const safeClass = String(className).replace(/[^-\w\s]/g, "");
  const x0 = -40;
  const x1 = w + 40;
  const period = Math.max(260, w / 2.2);
  const amp = h * 0.24;
  const baseHalf = h * 0.08;
  const twist = v % 2 === 0 ? 1 : -1;
  const SEG = 72;

  const strands = STRANDS.map((strand, i) => {
    const phase = strand.phase + v * 0.22;
    const points = Array.from({ length: SEG + 1 }, (_, k) => {
      const t = k / SEG;
      const x = x0 + (x1 - x0) * t;
      return {
        t,
        x,
        y: h / 2 + twist * amp * Math.sin((TAU * x) / period + phase),
      };
    });
    return { ...strand, points };
  });

  // Em cada cruzamento, alterna qual galho aparece na frente.
  const crossings = [];
  let seq = 0;
  for (let i = 0; i < strands.length; i += 1) {
    for (let j = i + 1; j < strands.length; j += 1) {
      const a = strands[i].points;
      const b = strands[j].points;
      for (let k = 0; k < SEG; k += 1) {
        const da = a[k].y - b[k].y;
        const db = a[k + 1].y - b[k + 1].y;
        if (da === 0 || da * db >= 0) continue;
        if (Math.abs(da) > baseHalf * 2.4) continue;
        const frac = Math.abs(da) / (Math.abs(da) + Math.abs(db));
        crossings.push({
          t: (k + frac) / SEG,
          over: (i + j + seq) % 2 === 0 ? i : j,
        });
        seq += 1;
      }
    }
  }

  const strokeWidth = baseHalf * 2;
  const stroke = (d, color, lineWidth, opacity = 1) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(lineWidth)}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;

  // Um traço contínuo por galho: é isso que deixa cada um bem definido.
  let base = "";
  strands.forEach((strand) => {
    const pts = strand.points;
    const d = smoothPath(pts.map((p) => [p.x, p.y]));
    const rim = smoothPath(pts.map((p) => [p.x, p.y - baseHalf * 0.76]));
    const grain = smoothPath(pts.map((p) => [p.x, p.y + baseHalf * 0.2]));

    // Folhas pequenas em pares, como folhagem de sub-bosque.
    let leaves = "";
    for (let k = 5; k < pts.length - 5; k += 11) {
      const p = pts[k];
      const dir = Math.round(k / 11) % 2 === 0 ? -1 : 1;
      const len = h * 0.12;
      const tipX = p.x + 5;
      const tipY = p.y + dir * (baseHalf + len);
      leaves += `<path d="M ${n(p.x)} ${n(p.y)} Q ${n(p.x + len)} ${n(p.y + dir * len * 0.3)} ${n(tipX)} ${n(tipY)} Q ${n(p.x + len * 0.25)} ${n(p.y + dir * len * 0.7)} ${n(p.x)} ${n(p.y)} Z" fill="#2D4A2D" stroke="#8FA98B" stroke-width="0.8" opacity="0.78"/>`;
    }

    let knots = "";
    [0.3, 0.72].forEach((t, i) => {
      const k = interpolate(pts, t + i * 0.03);
      const rx = baseHalf * 0.46;
      const ry = baseHalf * 0.32;
      knots += `<ellipse cx="${n(k.x)}" cy="${n(k.y)}" rx="${n(rx)}" ry="${n(ry)}" fill="#232027" stroke="#9A6EA0" stroke-width="1" opacity="0.8"/>`;
      knots += `<ellipse cx="${n(k.x)}" cy="${n(k.y)}" rx="${n(rx * 0.5)}" ry="${n(ry * 0.5)}" fill="none" stroke="#D9B8DD" stroke-width="0.9" opacity="0.5"/>`;
    });

    base += `<g>${stroke(d, "#141617", strokeWidth + h * 0.05)}${stroke(d, `url(#wood-${strand.tone}-${uid})`, strokeWidth)}${stroke(rim, "#C6A0CB", 1.4, 0.45)}${stroke(grain, "#101511", h * 0.026, 0.4)}${leaves}${knots}</g>`;
  });

  // Pequeno trecho do galho vencedor em cada cruzamento, com sombra: cria a trama.
  let over = "";
  crossings.forEach((c) => {
    const strand = strands[c.over];
    const pts = slice(strand.points, Math.max(0, c.t - 0.028), Math.min(1, c.t + 0.028));
    const d = smoothPath(pts.map((p) => [p.x, p.y]));
    const rim = smoothPath(pts.map((p) => [p.x, p.y - baseHalf * 0.76]));
    over += `<g>${stroke(d, "#141617", strokeWidth + h * 0.05)}${stroke(d, `url(#wood-${strand.tone}-${uid})`, strokeWidth)}${stroke(rim, "#D9B8DD", 1.4, 0.5)}</g>`;
  });

  const svgClass = `branch-divider__svg ${safeClass}`.trim();

  return `<svg class="${svgClass}" data-flip="${direction}" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="wood-a-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#C6A0CB"/>
        <stop offset="0.16" stop-color="#5D425C"/>
        <stop offset="0.5" stop-color="#2D4A2D"/>
        <stop offset="1" stop-color="#141A16"/>
      </linearGradient>
      <linearGradient id="wood-b-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8FA98B"/>
        <stop offset="0.18" stop-color="#4A6741"/>
        <stop offset="0.55" stop-color="#2D4A2D"/>
        <stop offset="1" stop-color="#141A16"/>
      </linearGradient>
      <linearGradient id="wood-c-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#C6A0CB"/>
        <stop offset="0.2" stop-color="#5D425C"/>
        <stop offset="0.55" stop-color="#1A2E1A"/>
        <stop offset="1" stop-color="#141414"/>
      </linearGradient>
      <linearGradient id="mist-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#C6A0CB" stop-opacity="0"/>
        <stop offset="0.45" stop-color="#C6A0CB" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#1A2E1A" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="glow-${uid}">
        <stop offset="0" stop-color="#D4AA60" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#D4AA60" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow-${uid}" x="-2%" y="-60%" width="104%" height="220%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.55"/>
      </filter>
    </defs>
    <g>${base}</g>
    <g filter="url(#shadow-${uid})">${over}</g>
  </svg>`;
}

class BranchDividerElement extends HTMLElement {
  static get observedAttributes() {
    return ["flip", "variant"];
  }

  connectedCallback() {
    this._observer = new ResizeObserver(() => this._queue());
    this._observer.observe(this);
    this._queue();
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  attributeChangedCallback() {
    if (this.isConnected) this._queue();
  }

  _queue() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._render();
    });
  }

  _render() {
    const cssHeight = parseFloat(getComputedStyle(this).getPropertyValue("--branch-divider-h"));
    // O SVG é full-bleed (100vw), então o viewBox deve seguir a janela, não o shell.
    const width = window.innerWidth;
    this.innerHTML = BranchDivider({
      width,
      height: Number.isFinite(cssHeight) ? cssHeight : 56,
      variant: this.getAttribute("variant") || 0,
      flip: this.getAttribute("flip") || "",
      className: this.getAttribute("class") || "",
    });
  }
}

if (!customElements.get("branch-divider")) {
  customElements.define("branch-divider", BranchDividerElement);
}

window.addEventListener(
  "resize",
  () => {
    document.querySelectorAll("branch-divider").forEach((el) => el._queue?.());
  },
  { passive: true },
);

// API pública para reutilizar em outros templates.
window.BranchDivider = BranchDivider;
