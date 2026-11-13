// =====================================================================
// DEV MENU — «ركّب برقرك» (إضافة مدفوعة على المنيو، المفتاح builder في js/plans.js)
//   العميل يركّب البرقر أو الساندويتش طبقة طبقة من إضافات الطبق نفسها في المنيو
//   (نفس الأسماء والأسعار والإجباري/الاختياري)، بلون هوية المحل، وتنضاف للسلة مثل أي طبق
//   المنيو يحمّل الملف وقت الحاجة بس، ويناديه:
//   DMBuilder.open({ product, store: { name, color, logo }, lang, money, sizes, sizeLabel, unitPrice, canOrder, onAdd })
//   الرسمة تنختار من اسم الإضافة (جبن، هالبينو، صوص...)، واللي ما لها رسمة تنضاف للطلب وتطلع في الملخص بس
// =====================================================================
(function () {
  if (window.DMBuilder) return;

  // ─── رسومات الأكل (SVG) ───
    function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    const f1 = (n) => n.toFixed(1);

    function bottomBun() {
      return `<svg viewBox="0 0 260 50"><path d="M12 16 Q12 7 34 6 L226 6 Q248 7 248 16 L245 33 Q240 46 208 47 L52 47 Q20 46 15 33 Z" fill="url(#bbgBunSide)"/>
        <path d="M12 16 Q12 7 34 6 L226 6 Q248 7 248 16 Q130 26 12 16Z" fill="url(#bbgCrumb)"/>
        <path d="M14 15 Q130 25 246 15" fill="none" stroke="#b5702a" stroke-opacity=".55" stroke-width="2"/>
        <path d="M28 40 Q130 50 232 40" fill="none" stroke="#6e3810" stroke-opacity=".35" stroke-width="3"/>
        <ellipse cx="80" cy="32" rx="40" ry="4" fill="#fff" opacity=".12"/></svg>`;
    }
    function topBun(seed) {
      const r = rng(seed); let seeds = '';
      for (let i = 0; i < 30; i++) {
        const a = r() * Math.PI, rad = 0.25 + r() * 0.7;
        const x = 130 + Math.cos(a) * 105 * rad * (r() < .5 ? -1 : 1), y = 70 - Math.sin(a) * 58 * rad - 6;
        if (y > 72 || y < 12) continue;
        seeds += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="3.6" ry="1.9" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})" fill="#fff6dc" stroke="#d9bb7c" stroke-width=".8"/>`;
      }
      return `<svg viewBox="0 0 260 96"><path d="M10 82 Q7 58 30 36 Q70 4 130 4 Q190 4 230 36 Q253 58 250 82 Q249 92 228 93 L32 93 Q11 92 10 82Z" fill="url(#bbgBunTop)"/>
        <path d="M12 80 Q130 96 248 80 L248 84 Q247 92 228 93 L32 93 Q12 92 12 84Z" fill="url(#bbgCrumb)" opacity=".85"/>
        <ellipse cx="102" cy="28" rx="58" ry="13" fill="#fff" opacity=".22"/><ellipse cx="96" cy="24" rx="26" ry="5" fill="#fff" opacity=".25"/>
        ${seeds}</svg>`;
    }
    function patty(seed) {
      const r = rng(seed); const top = [], bot = [];
      for (let x = 10; x <= 262; x += 7) top.push([x, 10 + r() * 4.5]);
      for (let x = 262; x >= 10; x -= 7) bot.push([x, 33 + r() * 5]);
      // أطراف مقرمشة: نتوءات صغيرة على الجانبين
      const lace = (x, dir) => { let s = ''; for (let y = 12; y < 36; y += 4) s += `L${f1(x + dir * (2 + r() * 7))} ${f1(y + r() * 2)} L${f1(x)} ${f1(y + 2)} `; return s; };
      const d = `M${top[0][0]} ${f1(top[0][1])} ` + top.map(p => `L${p[0]} ${f1(p[1])}`).join(' ') + ' ' + lace(262, 1) + bot.map(p => `L${p[0]} ${f1(p[1])}`).join(' ') + ' ' + lace(10, -1) + 'Z';
      let specks = '';
      for (let i = 0; i < 46; i++) specks += `<circle cx="${f1(16 + r() * 238)}" cy="${f1(13 + r() * 21)}" r="${f1(.8 + r() * 1.8)}" fill="${r() < .5 ? '#9a5528' : '#2a1105'}" opacity="${f1(.35 + r() * .5)}"/>`;
      return `<svg viewBox="0 0 270 44"><path d="${d}" fill="url(#bbgPatty)" stroke="#3b1a08" stroke-width="2.4" stroke-linejoin="round"/>
        ${specks}<path d="M24 14 Q135 9 248 14" fill="none" stroke="#c98a55" stroke-opacity=".35" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="90" cy="17" rx="44" ry="2.6" fill="#fff" opacity=".14"/></svg>`;
    }
    function cheese(seed) {
      const r = rng(seed); const drips = [24 + r() * 20, 92 + r() * 30, 168 + r() * 20, 220 + r() * 14];
      let d = 'M6 6 L254 6 L254 14 ';
      drips.slice().reverse().forEach((x) => { const w = 9 + r() * 7, depth = 14 + r() * 16; d += `L${f1(x + w)} 14 Q${f1(x + w)} ${f1(14 + depth)} ${f1(x)} ${f1(14 + depth)} Q${f1(x - w)} ${f1(14 + depth)} ${f1(x - w)} 14 `; });
      d += 'L6 14 Z';
      return `<svg viewBox="0 0 260 40"><path d="${d}" fill="url(#bbgCheese)" stroke="#e07a00" stroke-width="1" stroke-linejoin="round"/>
        <path d="M12 8 L248 8" stroke="#fff3b0" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/></svg>`;
    }
    function lettuce(seed) {
      const r = rng(seed); let top = 'M2 18 ', bot = '';
      for (let x = 2; x <= 278; x += 9) top += `Q${f1(x + 4.5)} ${f1(4 + r() * 9)} ${f1(x + 9)} ${f1(13 + r() * 6)} `;
      for (let x = 287; x >= 2; x -= 11) bot += `Q${f1(x - 5.5)} ${f1(30 + r() * 4)} ${f1(x - 11)} ${f1(24 + r() * 4)} `;
      let veins = '';
      for (let i = 0; i < 7; i++) { const x = 20 + i * 38 + r() * 10; veins += `<path d="M${f1(x)} 26 Q${f1(x + 6)} 17 ${f1(x + 14)} 10" fill="none" stroke="#e4f7c0" stroke-opacity=".55" stroke-width="1.4"/>`; }
      return `<svg viewBox="0 0 290 34"><path d="${top} L287 24 ${bot} Z" fill="url(#bbgLettuce)"/>
        <path d="${top}" fill="none" stroke="#d9f59f" stroke-width="2" stroke-opacity=".8"/>${veins}</svg>`;
    }
    function tomato(seed) {
      const r = rng(seed); let s = '';
      [10, 88, 166].forEach((x, i) => {
        const y = 3 + r() * 2;
        let seeds = ''; for (let k = 0; k < 6; k++) seeds += `<ellipse cx="${f1(x + 14 + k * 13 + r() * 4)}" cy="${f1(y + 8)}" rx="2.6" ry="1.5" fill="#ffd56b" opacity=".9"/>`;
        s += `<g><rect x="${x}" y="${f1(y)}" width="92" height="16" rx="8" fill="url(#bbgTomato)"/>
          <rect x="${x + 6}" y="${f1(y + 4)}" width="80" height="8" rx="4" fill="#ff7a62" opacity=".55"/>${seeds}
          <rect x="${x + 8}" y="${f1(y + 1.5)}" width="60" height="2" rx="1" fill="#fff" opacity=".3"/></g>`;
      });
      return `<svg viewBox="0 0 260 24">${s}</svg>`;
    }
    function pickles(seed) {
      const r = rng(seed); let s = '';
      for (let i = 0; i < 6; i++) { const cx = 28 + i * 41 + r() * 6, cy = 9 + r() * 2; s += `<g><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="23" ry="6.5" fill="url(#bbgPickle)" stroke="#3f5e18" stroke-width="1.6" stroke-dasharray="3 2.2"/><ellipse cx="${f1(cx)}" cy="${f1(cy - 1)}" rx="15" ry="3.2" fill="#d2e59a" opacity=".55"/></g>`; }
      return `<svg viewBox="0 0 270 18">${s}</svg>`;
    }
    function jalapeno(seed) {
      // شرائح هالبينو: حلقة خضراء غامقة، ولبّ فاتح، وبذور صغيرة
      const r = rng(seed); let s = '';
      for (let i = 0; i < 6; i++) {
        const cx = 26 + i * 43 + r() * 6, cy = 8 + r() * 2.5, rx = 17 + r() * 3;
        let seeds = ''; for (let k = 0; k < 4; k++) seeds += `<ellipse cx="${f1(cx - 7 + k * 4.5 + r() * 2)}" cy="${f1(cy - .5 + r())}" rx="1.6" ry="1" fill="#f4f0c8"/>`;
        s += `<g><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="6" fill="#2f6b1c" stroke="#1f4a12" stroke-width="1.2"/><ellipse cx="${f1(cx)}" cy="${f1(cy - .6)}" rx="${f1(rx - 5)}" ry="3.6" fill="#a9cf5e"/><ellipse cx="${f1(cx)}" cy="${f1(cy - .6)}" rx="${f1(rx - 10)}" ry="2" fill="#dbe9a6"/>${seeds}<path d="M${f1(cx - rx + 4)} ${f1(cy - 3.5)} Q${f1(cx)} ${f1(cy - 6.5)} ${f1(cx + rx - 4)} ${f1(cy - 3.5)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/></g>`;
      }
      return `<svg viewBox="0 0 270 18">${s}</svg>`;
    }
    function onion(seed) {
      const r = rng(seed); let s = '';
      for (let i = 0; i < 5; i++) { const cx = 34 + i * 48 + r() * 8, cy = 8 + r() * 2; s += `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="27" ry="5.2" fill="#f8eef6" fill-opacity=".9" stroke="#7d2a6c" stroke-width="3"/><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="18" ry="3" fill="none" stroke="#a54a91" stroke-width="1.6" stroke-opacity=".8"/>`; }
      return `<svg viewBox="0 0 270 16">${s}</svg>`;
    }
    function drizzle(seed, color) {
      const r = rng(seed); let d = 'M18 8 ';
      for (let x = 18; x < 240; x += 22) d += `Q${f1(x + 11)} ${f1(r() < .5 ? 0 : 17)} ${f1(x + 22)} ${f1(5 + r() * 6)} `;
      return `<svg viewBox="0 0 260 20"><path d="${d}" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round" transform="translate(0 -1.4)"/></svg>`;
    }
  function chicken(seed) {
    // صدر دجاج مقرمش: حواف متعرّجة ولون ذهبي وفتات
    const r = rng(seed); let d = 'M10 20 ';
    for (let x = 10; x <= 262; x += 8) d += `L${x} ${f1(8 + r() * 6)} `;
    for (let y = 12; y < 36; y += 5) d += `L${f1(264 + r() * 5)} ${y} `;
    for (let x = 262; x >= 10; x -= 8) d += `L${x} ${f1(34 + r() * 6)} `;
    for (let y = 36; y > 12; y -= 5) d += `L${f1(6 - r() * 5)} ${y} `;
    let crumbs = '';
    for (let i = 0; i < 44; i++) crumbs += `<circle cx="${f1(16 + r() * 238)}" cy="${f1(12 + r() * 24)}" r="${f1(1 + r() * 2)}" fill="${r() < .5 ? '#ffd27a' : '#b8661c'}" opacity="${f1(.4 + r() * .5)}"/>`;
    return `<svg viewBox="0 0 270 46"><path d="${d}Z" fill="url(#bbgChicken)" stroke="#a65a17" stroke-width="2" stroke-linejoin="round"/>${crumbs}<ellipse cx="96" cy="15" rx="50" ry="3" fill="#fff" opacity=".2"/></svg>`;
  }
  const ART = { bun: bottomBun, patty, chicken, cheese, lettuce, tomato, pickles, jalapeno, onion };
  const GEO = {
    bun: { t: 34, sink: 0, w: 260 }, patty: { t: 21, sink: 7, w: 270 }, chicken: { t: 24, sink: 7, w: 270 },
    cheese: { t: 7, sink: 27, w: 260 }, lettuce: { t: 13, sink: 9, w: 290 }, tomato: { t: 11, sink: 6, w: 260 },
    pickles: { t: 7, sink: 5, w: 270 }, jalapeno: { t: 7, sink: 5, w: 270 }, onion: { t: 6, sink: 5, w: 270 },
    sauce: { t: 2, sink: 9, w: 260 }, top: { t: 0, sink: 16, w: 260 }
  };
  // صورة مصغّرة للبطاقة: المكوّن مكرّر طبقتين/ثلاث
  function thumb(key) {
    const g = (svg, y) => svg.replace(/<svg viewBox="0 0 (\d+) (\d+)">/, `<g transform="translate(${key === 'lettuce' ? -15 : 0} ${y})">`).replace(/<\/svg>$/, '</g>');
    const a = ART[key];
    const parts = key === 'patty' || key === 'chicken' ? [g(a(3), 40), g(a(9), 70)] : [g(a(2), 30), g(a(5), 52), g(a(8), 74)];
    return `<svg viewBox="0 -10 260 140" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
  }
  const sauceThumb = (color) => `<svg viewBox="0 0 120 80"><path d="M14 44 Q30 14 46 44 T78 44 T110 44" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/><path d="M14 42 Q30 12 46 42 T78 42 T110 42" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/></svg>`;

  // ─── اسم الإضافة → رسمة ───
  const has = (t, re) => re.test(t);
  function artFor(groupName, optName) {
    const t = `${groupName} ${optName}`.toLowerCase(), o = String(optName).toLowerCase();
    // الصوصات (من اسم الخيار أو المجموعة)
    const sauceColor = has(o, /كاتشب|ketchup/) ? '#c41a1a' : has(o, /باربكيو|باربيكيو|bbq|barbecue/) ? '#5a2410' : has(o, /جبن|cheese|نتشوز|nacho/) && has(t, /صوص|sauce/) ? '#ffad1f'
      : has(o, /حار|سبايسي|spicy|هوت|hot|سريراتشا|sriracha|بافلو|buffalo/) ? '#e2491f' : has(o, /مايونيز|ميونيز|مايو|ثوم|رانش|mayo|garlic|ranch|ابيض|أبيض|white/) ? '#f6efda'
      : has(o, /مستردة|مسترد|mustard|عسل|honey/) ? '#e8b50f' : has(t, /صوص|sauce|دبس|dip/) ? '#f0a23a' : null;
    if (sauceColor && has(t, /صوص|sauce|كاتشب|ketchup|مايو|mayo|رانش|ranch|باربكيو|bbq|مستردة|mustard|دبس|dip/)) return { sauce: sauceColor };
    if (has(o, /هالبينو|هلابينو|هالابينو|jalap/)) return { layer: 'jalapeno' };
    if (has(o, /مخلل|pickle/)) return { layer: 'pickles' };
    if (has(o, /بصل|onion/) && !has(o, /حلق|ring/)) return { layer: 'onion' };
    if (has(o, /طماط|tomato/)) return { layer: 'tomato' };
    if (has(o, /خس|lettuce|جرجير|arugula/)) return { layer: 'lettuce' };
    if (has(o, /جبن|شيدر|سلايس|cheese|cheddar|موزاريلا|mozz|سويسري|swiss/)) return { layer: 'cheese' };
    if (has(o, /دجاج|كرسبي|chicken|crispy/)) return { layer: 'chicken' };
    if (has(o, /لحم|برقر|بيف|سماش|patty|beef|smash|دبل|double/)) return { layer: 'patty' };
    return null;
  }

  // ─── الألوان ───
  const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => rgbHex(...a.map((v, i) => v + (b[i] - v) * t));
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  function palette(color) {
    let c = hexRgb(color);
    if (!c || lum(c) > .8 || lum(c) < .015) c = [198, 42, 31];   // أبيض/أسود ما يصلح لون أساسي: أحمر البرقر
    const W = [255, 255, 255], K = [20, 16, 14], G = [238, 239, 241];
    // لون رمادي/باهت (تشبّع قليل): نغمّقه عشان الأزرار تنقرا. ولون فاتح: نغمّقه شوي
    const mx = Math.max(...c), mn = Math.min(...c), sat = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
    const brand = sat < .18 ? mix(c, K, .6) : lum(c) > .45 ? mix(c, K, .35) : rgbHex(...c);
    return { brand, deep: mix(c, K, .45), soft: mix(c, W, .9), bg: mix(G, c, .06), paper: mix(W, c, .05), on: lum(hexRgb(brand)) > .5 ? '#1d1a17' : '#ffffff', raw: rgbHex(...c) };
  }

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ─── التنسيق (مرة وحدة) ───
  function injectOnce() {
    if (document.getElementById('bb-css')) return;
    const st = document.createElement('style'); st.id = 'bb-css';
    st.textContent = `
.bb { position: fixed; inset: 0; z-index: 9000; background: var(--bb-bg); color: #1d1a17; direction: rtl; display: flex; flex-direction: column; font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, system-ui, sans-serif; -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; animation: bbIn .3s ease; }
.bb[dir=ltr] { direction: ltr; }
@keyframes bbIn { from { opacity: 0; transform: translateY(16px); } }
.bb * { box-sizing: border-box; }
.bb button { font: inherit; color: inherit; }
.bb [hidden] { display: none !important; }
.bb-top { display: flex; align-items: center; gap: 12px; padding: calc(12px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px)); background: #fff; border-bottom: 1px solid #e4e6e9; }
.bb-logo { width: 42px; height: 42px; border-radius: 12px; object-fit: contain; border: 1px solid #e4e6e9; background: #fff; }
.bb-title { flex: 1; min-width: 0; }
.bb-title b { display: block; font-size: 17px; line-height: 1.3; }
.bb-title small { display: block; font-size: 12.5px; color: #6b655f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bb-x { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #e4e6e9; background: #fff; font-size: 20px; cursor: pointer; flex-shrink: 0; }
.bb-body { flex: 1; min-height: 0; overflow-y: auto; }
.bb-grid { display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 1fr); gap: 18px; max-width: 1180px; margin: 0 auto; padding: 16px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px)); align-items: start; }
.bb-plate { position: sticky; top: 0; background: #fff; border: 1px solid #e4e6e9; border-radius: 20px; padding: 14px; display: grid; gap: 10px; }
.bb-status { margin: 0; font-size: 14px; color: #6b655f; min-height: 1.5em; font-weight: 500; }
.bb-stagebox { position: relative; height: 340px; border-radius: 14px; overflow: hidden; background: var(--bb-paper); }
.bb-stage { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 36px; }
.bb-shadow { position: absolute; bottom: 24px; left: 50%; width: 240px; height: 22px; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(closest-side, rgba(60,30,10,.28), transparent); }
.bb-wrap { position: relative; width: 260px; flex-shrink: 0; transform-origin: 50% 100%; transition: transform .35s ease; }
.bb-stack { position: relative; width: 260px; height: 10px; }
.bb-layer { position: absolute; left: 50%; transform: translateX(calc(-50% + var(--dx, 0px))) rotate(var(--rot, 0deg)); transform-origin: 50% 100%; pointer-events: none; }
.bb-layer svg { display: block; width: 100%; height: auto; overflow: visible; }
.bb-layer.drop { animation: bbDrop .6s cubic-bezier(.2,.75,.35,1) both; }
@keyframes bbDrop {
  0% { transform: translateX(calc(-50% + var(--dx, 0px))) translateY(-300px); opacity: 0; }
  12% { opacity: 1; }
  62% { transform: translateX(calc(-50% + var(--dx, 0px))) translateY(0) rotate(var(--rot, 0deg)) scale(1.07, .82); }
  80% { transform: translateX(calc(-50% + var(--dx, 0px))) translateY(-6px) rotate(var(--rot, 0deg)) scale(.98, 1.04); }
  100% { transform: translateX(calc(-50% + var(--dx, 0px))) translateY(0) rotate(var(--rot, 0deg)); }
}
.bb-layer.sauce path { stroke-dasharray: 900; stroke-dashoffset: 900; animation: bbDraw .7s ease forwards; }
@keyframes bbDraw { to { stroke-dashoffset: 0; } }
.bb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.bb-chip { font-size: 12.5px; font-weight: 500; background: #f3f4f5; border: 1px solid #e4e6e9; border-radius: 999px; padding: 3px 10px; }
.bb-steps { display: grid; gap: 14px; }
.bb-step { background: #fff; border: 1px solid #e4e6e9; border-radius: 20px; padding: 16px; }
.bb-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.bb-num { width: 30px; height: 30px; border-radius: 50%; background: #1d1a17; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.bb-step.ok .bb-num { background: #2e7d32; }
.bb-head h3 { margin: 0; font-size: 17px; }
.bb-rule { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #f3f4f5; color: #6b655f; }
.bb-rule.need { background: var(--bb-soft); color: var(--bb-brand); }
.bb-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(138px, 1fr)); gap: 10px; }
.bb-card { position: relative; display: grid; grid-template-rows: 70px auto; gap: 6px; text-align: start; cursor: pointer; padding: 10px; border-radius: 14px; border: 2px solid #e4e6e9; background: #fff; transition: border-color .15s, transform .15s; }
.bb-card.noart { grid-template-rows: auto; padding-block: 14px; }
.bb-card.noart .bb-art { display: none; }
.bb-card:hover { border-color: #b9bdc3; }
.bb-card:active { transform: scale(.98); }
.bb-card:disabled { opacity: .45; cursor: not-allowed; }
.bb-art { display: grid; place-items: center; overflow: hidden; }
.bb-art svg { width: 100%; height: 70px; display: block; }
.bb-name { display: block; font-size: 15px; font-weight: 700; line-height: 1.3; }
.bb-price { display: block; font-size: 14px; font-weight: 700; color: var(--bb-brand); }
.bb-price.free { color: #2e7d32; }
.bb-card.on { border-color: var(--bb-brand); background: var(--bb-soft); }
.bb-tick { position: absolute; top: 8px; inset-inline-end: 8px; width: 26px; height: 26px; border-radius: 50%; background: var(--bb-brand); color: var(--bb-on); display: grid; place-items: center; font-weight: 700; font-size: 14px; }
.bb-card:not(.on) .bb-tick { display: none; }
.bb-bar { display: flex; align-items: center; gap: 12px; background: #fff; border-top: 1px solid #e4e6e9; padding: 10px max(16px, env(safe-area-inset-right, 0px)) calc(10px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)); }
.bb-sum small { display: block; font-size: 12px; color: #6b655f; }
.bb-sum b { font-size: 21px; }
.bb-qty { display: flex; align-items: center; gap: 4px; border: 1px solid #e4e6e9; border-radius: 12px; padding: 3px; }
.bb-qty button { width: 34px; height: 34px; border: 0; background: #f3f4f5; border-radius: 9px; font-size: 18px; font-weight: 700; cursor: pointer; }
.bb-qty span { min-width: 22px; text-align: center; font-weight: 700; }
.bb-go { flex: 1; border: 0; cursor: pointer; background: var(--bb-brand); color: var(--bb-on); font-weight: 700; font-size: 16px; padding: 14px 16px; border-radius: 14px; box-shadow: inset 0 -3px 0 rgba(0,0,0,.18); }
.bb-go:disabled { opacity: .45; cursor: not-allowed; }
.bb-done { position: absolute; inset: 0; background: rgba(25,20,16,.45); display: grid; place-items: center; padding: 20px; }
.bb-done > div { background: #fff; border-radius: 20px; padding: 22px; width: 360px; max-width: 100%; text-align: center; }
.bb-done h4 { margin: 0 0 8px; font-size: 18px; }
.bb-done p { margin: 0 0 14px; font-size: 14.5px; line-height: 1.8; color: #4a4540; }
@media (max-width: 860px) {
  .bb-grid { grid-template-columns: minmax(0, 1fr); padding-top: 10px; }
  .bb-plate { position: sticky; top: 0; z-index: 2; padding: 10px; border-radius: 0 0 18px 18px; margin: -10px calc(-1 * max(16px, env(safe-area-inset-left, 0px))) 0; border-top: 0; box-shadow: 0 8px 18px rgba(0,0,0,.06); }
  .bb-stagebox { height: 210px; }
  .bb-chips { display: none; }
}
@media (max-width: 440px) { .bb-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .bb-go { font-size: 15px; } }
@media (prefers-reduced-motion: reduce) { .bb, .bb * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }`;
    document.head.appendChild(st);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<defs> <radialGradient id="bbgBunTop" cx="45%" cy="20%" r="85%"> <stop offset="0" stop-color="#f6c06a"/><stop offset=".45" stop-color="#d98a2f"/><stop offset=".85" stop-color="#a95a1c"/><stop offset="1" stop-color="#8a4514"/> </radialGradient> <linearGradient id="bbgBunSide" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#e8a24b"/><stop offset=".6" stop-color="#c47726"/><stop offset="1" stop-color="#93511a"/> </linearGradient> <linearGradient id="bbgCrumb" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#fff0cd"/><stop offset="1" stop-color="#f0d39a"/> </linearGradient> <linearGradient id="bbgPatty" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#7a3f1d"/><stop offset=".4" stop-color="#55280f"/><stop offset="1" stop-color="#2f1407"/> </linearGradient> <linearGradient id="bbgCheese" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#ffc83d"/><stop offset=".55" stop-color="#ffa514"/><stop offset="1" stop-color="#e98300"/> </linearGradient> <linearGradient id="bbgLettuce" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#b9ec73"/><stop offset=".5" stop-color="#6fbf3a"/><stop offset="1" stop-color="#3d8a24"/> </linearGradient> <linearGradient id="bbgTomato" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#ff5a45"/><stop offset=".55" stop-color="#d9231b"/><stop offset="1" stop-color="#a11410"/> </linearGradient> <linearGradient id="bbgPickle" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#a7c95a"/><stop offset=".6" stop-color="#6f9a2e"/><stop offset="1" stop-color="#4a6e1d"/> </linearGradient> <linearGradient id="bbgFry" x1="0" y1="0" x2="1" y2="0"> <stop offset="0" stop-color="#f7c84f"/><stop offset=".5" stop-color="#ffde7a"/><stop offset="1" stop-color="#e3a630"/> </linearGradient> <linearGradient id="bbgRing" x1="0" y1="0" x2="0" y2="1"> <stop offset="0" stop-color="#f3c066"/><stop offset=".6" stop-color="#d48d33"/><stop offset="1" stop-color="#a8641f"/> </linearGradient> <linearGradient id="bbgBucket" x1="0" y1="0" x2="1" y2="0"> <stop offset="0" stop-color="#9e1812"/><stop offset=".35" stop-color="#d1281f"/><stop offset=".7" stop-color="#c2231b"/><stop offset="1" stop-color="#8a130e"/> </linearGradient> <linearGradient id="bbgGloss" x1="0" y1="0" x2="1" y2="0"> <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/> </linearGradient> </defs>`.replace('</defs>', '<linearGradient id="bbgChicken" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c45f"/><stop offset=".55" stop-color="#dc8f2e"/><stop offset="1" stop-color="#a95f1a"/></linearGradient></defs>');
    document.body.appendChild(svg);
  }

  // ─── فتح شاشة التركيب ───
  function open(opts) {
    injectOnce();
    const P = opts.product, ar = (opts.lang || 'ar') === 'ar';
    const T = (a, e) => ar ? a : e;
    const nm = (o) => (!ar && o && o.name_en) || (o && o.name) || '';
    const money = opts.money || ((n) => `${n} ر.س`);
    const pal = palette(opts.store && opts.store.color);
    const groups = (Array.isArray(P.extras) ? P.extras : []).filter(g => g && Array.isArray(g.options) && g.options.length);
    const sizes = Array.isArray(opts.sizes) ? opts.sizes : [];
    const base = (P.builder && Array.isArray(P.builder.base) && P.builder.base.length ? P.builder.base : ['patty']).filter(k => ART[k]);
    let size = sizes.length ? sizes[0].name : null, picked = [], qty = 1, seedN = 21;
    const layerOf = new Map();   // "g::o" -> عنصر الطبقة

    const root = document.createElement('div');
    root.className = 'bb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.dir = ar ? 'rtl' : 'ltr';
    root.style.cssText = `--bb-bg:${pal.bg};--bb-paper:${pal.paper};--bb-brand:${pal.brand};--bb-soft:${pal.soft};--bb-on:${pal.on}`;
    const logo = opts.store && opts.store.logo;
    const steps = [];
    if (sizes.length) steps.push({ kind: 'size' });
    groups.forEach((g, gi) => steps.push({ kind: 'group', g, gi }));
    root.innerHTML = `
      <div class="bb-top">
        ${logo ? `<img class="bb-logo" src="${esc(logo)}" alt="">` : ''}
        <div class="bb-title"><b>${esc(T('ركّب', 'Build your') + ' ' + nm(P))}</b><small>${esc((opts.store && opts.store.name) || '')}</small></div>
        <button class="bb-x" type="button" aria-label="${T('إغلاق', 'Close')}">×</button>
      </div>
      <div class="bb-body"><div class="bb-grid">
        <div class="bb-plate">
          <p class="bb-status" aria-live="polite"></p>
          <div class="bb-stagebox"><div class="bb-stage"><div class="bb-shadow"></div><div class="bb-wrap"><div class="bb-stack"></div></div></div></div>
          <div class="bb-chips"></div>
        </div>
        <div class="bb-steps">${steps.map((s, i) => s.kind === 'size' ? `
          <section class="bb-step" data-step="size"><div class="bb-head"><span class="bb-num">${i + 1}</span><h3>${T('الحجم', 'Size')}</h3><span class="bb-rule">${T('اختر واحد', 'Pick one')}</span></div>
            <div class="bb-cards">${sizes.map((z, zi) => `<button type="button" class="bb-card noart" data-size="${zi}"><span><span class="bb-name">${esc(opts.sizeLabel ? opts.sizeLabel(z) : z.name)}</span><span class="bb-price">${esc(money(opts.unitPrice ? opts.unitPrice(z.name) : z.price))}</span></span><span class="bb-tick">✓</span></button>`).join('')}</div></section>` : `
          <section class="bb-step" data-step="g${s.gi}"><div class="bb-head"><span class="bb-num">${i + 1}</span><h3>${esc(nm(s.g))}</h3><span class="bb-rule ${s.g.required ? 'need' : ''}">${s.g.required ? T('إجباري · اختر واحد', 'Required · pick one') : T('اختياري', 'Optional')}</span></div>
            <div class="bb-cards">${s.g.options.map((o, oi) => { const a = artFor(s.g.name, o.name); const pr = Number(o.price) || 0; return `<button type="button" class="bb-card ${a ? '' : 'noart'}" data-g="${s.gi}" data-o="${oi}" ${o.available === false ? 'disabled' : ''}>
              <span class="bb-art">${a ? (a.sauce ? sauceThumb(a.sauce) : thumb(a.layer)) : ''}</span>
              <span><span class="bb-name">${esc(nm(o))}</span><span class="bb-price ${pr ? '' : 'free'}">${pr ? '+' + esc(money(pr)) : T('مجاناً', 'Free')}</span></span><span class="bb-tick">✓</span></button>`; }).join('')}</div></section>`).join('')}
        </div>
      </div></div>
      <div class="bb-bar">
        <div class="bb-sum"><small>${T('المجموع', 'Total')}</small><b class="bb-total"></b></div>
        ${opts.canOrder ? `<div class="bb-qty"><button type="button" data-q="-1" aria-label="${T('أقل', 'Less')}">−</button><span class="bb-qn">1</span><button type="button" data-q="1" aria-label="${T('أكثر', 'More')}">+</button></div>` : ''}
        <button class="bb-go" type="button">${opts.canOrder ? T('أضف للطلب', 'Add to order') : T('خلّصت', 'Done')}</button>
      </div>`;
    document.body.appendChild(root);
    const $ = (sel) => root.querySelector(sel);
    const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';

    // ─── الكومة ───
    const stack = $('.bb-stack');
    const layers = [];   // { key, el, id }
    function place(key, html, id, extra) {
      const g = GEO[key], el = document.createElement('div');
      el.className = 'bb-layer drop' + (extra ? ' ' + extra : '');
      el.style.width = (g.w / 260 * 100) + '%';
      el.style.setProperty('--dx', `${Math.round((Math.random() - .5) * (key === 'bun' || key === 'top' ? 4 : 10))}px`);
      el.style.setProperty('--rot', `${((Math.random() - .5) * 2.4).toFixed(2)}deg`);
      el.innerHTML = html; stack.appendChild(el);
      const L = { key, el, id }; layers.push(L); layout(); return L;
    }
    function layout() {
      let y = 0;
      layers.forEach((l, i) => { const g = GEO[l.key]; l.el.style.bottom = (y - g.sink) + 'px'; l.el.style.zIndex = i + 1; y += g.t; });
      const box = $('.bb-stagebox'), wrap = $('.bb-wrap');
      const s = Math.min(1, (box.clientHeight - 90) / (y + 110), (box.clientWidth - 24) / 285);
      wrap.style.transform = `scale(${s.toFixed(3)})`;
    }
    // الخبز والطبقات الأساسية تنزل وحدة وحدة
    place('bun', ART.bun(seedN++));
    base.forEach((k, i) => setTimeout(() => { if (root.isConnected) place(k, ART[k](seedN++), 'base:' + k); }, 160 * (i + 1)));

    const key = (g, o) => `${g}::${o}`;
    function addLayer(g, o) {
      const a = artFor(g.name, o.name); if (!a) return;
      const L = a.sauce ? place('sauce', drizzle(seedN++, a.sauce), key(g.name, o.name), 'sauce') : place(a.layer, ART[a.layer](seedN++), key(g.name, o.name));
      if (a.sauce) L.el.classList.remove('drop');
      layerOf.set(key(g.name, o.name), L);
    }
    function removeLayer(g, o) {
      const L = layerOf.get(key(g.name, o.name)); if (!L) return;
      L.el.remove(); layers.splice(layers.indexOf(L), 1); layerOf.delete(key(g.name, o.name)); layout();
    }
    function say(t) { $('.bb-status').textContent = t; }

    // ─── الاختيارات ───
    root.addEventListener('click', (e) => {
      if (e.target.closest('.bb-x')) return close();
      const q = e.target.closest('[data-q]'); if (q) { qty = Math.max(1, Math.min(20, qty + Number(q.dataset.q))); $('.bb-qn').textContent = qty; return refresh(); }
      const sz = e.target.closest('[data-size]'); if (sz) { size = sizes[Number(sz.dataset.size)].name; say(T('تم اختيار الحجم.', 'Size picked.')); return refresh(); }
      const c = e.target.closest('[data-g]'); if (!c || c.disabled) return;
      const g = groups[Number(c.dataset.g)], o = g.options[Number(c.dataset.o)];
      const on = picked.some(x => x.g === g.name && x.o === o.name);
      if (on) { picked = picked.filter(x => !(x.g === g.name && x.o === o.name)); removeLayer(g, o); say(T(`شلنا ${nm(o)}.`, `Removed ${nm(o)}.`)); }
      else {
        if (g.required) picked.filter(x => x.g === g.name).forEach(x => { removeLayer(g, g.options.find(oo => oo.name === x.o) || { name: x.o }); });
        picked = g.required ? [...picked.filter(x => x.g !== g.name), { g: g.name, o: o.name }] : [...picked, { g: g.name, o: o.name }];
        addLayer(g, o);
        say(T(`انضاف ${nm(o)}.`, `Added ${nm(o)}.`));
      }
      refresh();
    });
    const missing = () => groups.find(g => g.required && !picked.some(x => x.g === g.name));
    function refresh() {
      root.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', sizes[Number(b.dataset.size)].name === size));
      root.querySelectorAll('[data-g]').forEach(b => { const g = groups[Number(b.dataset.g)], o = g.options[Number(b.dataset.o)]; b.classList.toggle('on', picked.some(x => x.g === g.name && x.o === o.name)); });
      root.querySelectorAll('[data-step]').forEach(s => { const k = s.dataset.step; s.classList.toggle('ok', k === 'size' ? !!size : picked.some(x => x.g === groups[Number(k.slice(1))].name)); });
      const unit = opts.price ? opts.price(size, picked) : null;
      $('.bb-total').textContent = unit == null ? '—' : money(Math.round(unit * qty * 100) / 100);
      $('.bb-chips').innerHTML = picked.map(x => { const g = groups.find(gg => gg.name === x.g); const o = g && g.options.find(oo => oo.name === x.o); return `<span class="bb-chip">${esc(nm(o) || x.o)}</span>`; }).join('');
      const m = missing();
      $('.bb-go').dataset.miss = m ? '1' : '';
    }
    $('.bb-go').addEventListener('click', () => {
      const m = missing();
      if (m) { say(T(`اختر ${nm(m)} أول.`, `Choose ${nm(m)} first.`)); const s = root.querySelector(`[data-step="g${groups.indexOf(m)}"]`); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      // الخبز العلوي ينزل، وبعدها يقفل
      $('.bb-go').disabled = true;
      place('top', topBun(seedN++));
      say(T('شكله يفتح النفس!', 'Looks delicious!'));
      setTimeout(() => {
        if (opts.canOrder) { opts.onAdd && opts.onAdd({ size, extras: picked.slice(), qty }); close(); return; }
        // المنيو بدون طلب: ملخص يوريه للكاشير
        const list = [size, ...picked.map(x => x.o)].filter(Boolean).join('، ');
        const d = document.createElement('div'); d.className = 'bb-done';
        d.innerHTML = `<div><h4>${T('برقرك جاهز', 'Your burger is ready')}</h4><p>${T('اعرض هذا على الكاشير:', 'Show this to the cashier:')}<br><b>${esc(nm(P))}</b>${list ? ` + ${esc(list)}` : ''}</p><button type="button" class="bb-go">${T('تمام', 'OK')}</button></div>`;
        d.querySelector('button').addEventListener('click', close);
        root.appendChild(d);
      }, 750);
    });
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', layout);
    function close() {
      document.removeEventListener('keydown', onKey); window.removeEventListener('resize', layout);
      document.body.style.overflow = prevOverflow; root.remove();
      opts.onClose && opts.onClose();
    }
    refresh();
    say(groups.length ? T('اختر إضافاتك، وتنضاف للبرقر قدامك.', 'Pick your extras and watch them stack.') : '');
    setTimeout(() => { const f = root.querySelector('.bb-card'); if (f) f.focus({ preventScroll: true }); }, 50);
    return { close };
  }

  window.DMBuilder = { open, artFor };
})();
