// =====================================================================
// DEV MENU — لوحة التحكم: محرّر شكل بطاقة الأختام (زي تخصيص وجه ساعة أبل)
//   البطاقة ثابتة فوق (نفس المعاينة الحالية #ly-phone)، وتحتها تبويب واحد في كل مرة:
//   الألوان (أشكال جاهزة + تخصيص)، الختم (أيقونات كبيرة أو صورة)، الشعار (الشعار وصورة المكافأة)
//   وشريط «حفظ / تراجع» تحت يطلع لما يتغيّر شي
//   ما يغيّر طريقة الحفظ: يستخدم نفس setLyDesign و saveLyDesign و undoLyDesign من loyalty.js
//   الكروت القديمة تنخفي بـ body.ap-cd (css/skin-apple.css)، وللرجوع: احذف سطر هذا الملف من admin.html
// =====================================================================
  // أشكال جاهزة: كل وحدة مجموعة ألوان متناسقة (البطاقة، الختم، الكتابة، الشكل)
  const CD_THEMES = [
    ['أخضر كلاسيك', { color: '#233d2c', stamp_color: '#f3e9d2', text_color: null, style: 'gradient', color2: '#3f7a4a' }],
    ['أسود فاخر', { color: '#111413', stamp_color: '#d9b56a', text_color: null, style: 'solid', color2: null }],
    ['بيج دافئ', { color: '#efe4d2', stamp_color: '#6b4a2f', text_color: '#3a2a1c', style: 'paper', color2: null }],
    ['قهوة', { color: '#4a2f22', stamp_color: '#e8cfa8', text_color: null, style: 'gradient', color2: '#6b4a2f' }],
    ['أبيض نظيف', { color: '#ffffff', stamp_color: '#233d2c', text_color: '#1d2a21', style: 'solid', color2: null }],
    ['كحلي', { color: '#1b2a44', stamp_color: '#9fc0ff', text_color: null, style: 'gradient', color2: '#2f5d8a' }],
    ['وردي', { color: '#f6dfe3', stamp_color: '#b23a5a', text_color: '#4a1d2a', style: 'solid', color2: null }],
    ['زجاجي', { color: '#0f766e', stamp_color: '#ffffff', text_color: null, style: 'glass', color2: '#38bdf8' }]
  ];
  const CD_SWATCHES = ['#233d2c', '#3f7a4a', '#0f766e', '#111413', '#1f2937', '#4a2f22', '#7c2d12', '#1b2a44', '#1e3a8a', '#831843', '#b23a5a', '#b45309',
    '#d9b56a', '#f4c27a', '#f3e9d2', '#efe4d2', '#f6dfe3', '#eaf3ec', '#9fc0ff', '#38bdf8', '#ffffff', '#1b1b1b'];
  const CD_COLOR_ROWS = [['color', 'لون البطاقة'], ['color2', 'اللون الثاني'], ['stamp_color', 'لون الختم'], ['text_color', 'لون الكتابة']];
  let cdTab = 'colors', cdPicking = null;
  // أي بطاقة نعدّل؟ الأختام (ومعها الباقة لو عنده الاثنين) أو الاشتراكات لحالها
  function cdCtx() {
    const lyBlock = document.getElementById('ly-design-block'), pkBlock = document.getElementById('pkd-card');
    if (lyBlock && !lyBlock.classList.contains('hidden') && typeof ly !== 'undefined' && ly.design) return {
      kind: 'ly', block: lyBlock, d: ly.design, dirty: !!ly.dirty, stamp: true,
      set: (p) => setLyDesign(p), pick: (k, v) => pickLyColor(k, v), bg: (k) => pickCardBg(k), bgFile: '#ly-bg-file',
      save: () => document.getElementById('ly-design-save').click(), undo: () => undoLyDesign(),
      images: [['logo', 'الشعار', "input[onchange=&quot;uploadLyImage(this, 'logo')&quot;]", 'ph-storefront', true], ['reward_image', 'صورة المكافأة', "input[onchange=&quot;uploadLyImage(this, 'reward_image')&quot;]", 'ph-gift', false]],
      note: (d) => `${d.logo ? 'شعار البطاقة يطلع بدل شعار المنيو.' : 'بدون شعار خاص، يطلع شعار المنيو.'} صورة المكافأة تطلع مكان آخر ختم.`
    };
    if (pkBlock && !pkBlock.classList.contains('hidden') && typeof pk !== 'undefined' && pk.design) return {
      kind: 'pkd', block: pkBlock, d: pk.design, dirty: !!pk.dirty, stamp: false,
      set: (p) => setPkd(p), pick: (k, v) => pickPkdColor(k, v), bg: (k) => pickPkdBg(k), bgFile: '#pkd-bg-file',
      save: () => document.getElementById('pkd-save').click(), undo: () => document.getElementById('pkd-undo').click(),
      images: [['logo', 'الشعار', "input[onchange=&quot;uploadPkdImage(this, 'logo')&quot;]", 'ph-storefront', true], ['strip', 'صورة الغلاف', "input[onchange=&quot;uploadPkdImage(this, 'strip')&quot;]", 'ph-image', false]],
      note: () => 'صورة الغلاف تطلع وسط بطاقة المحفظة، مثل أطباقك أو واجهة المحل.'
    };
    return null;
  }

  // التباين بين لونين (WCAG): أقل من 3 = الكتابة ما تنقرا
  const cdLum = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 1; const n = parseInt(m[1], 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cdContrast = (a, b) => { const [x, y] = [cdLum(a), cdLum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const cdSame = (t, d) => Object.entries(t).every(([k, v]) => (d[k] ?? null) === (v ?? null));

  function renderCardEditor() {
    const C = cdCtx();
    if (!C) return;
    const block = C.block;
    document.body.classList.add('ap-cd');
    if (C.kind !== cdKind) { cdKind = C.kind; if (!C.stamp && cdTab === 'stamp') cdTab = 'colors'; }
    let box = document.getElementById('cd-editor');
    if (box && box.parentElement !== block.firstElementChild) box.remove(), box = null;
    if (!document.getElementById('cd-savebar')) {
      const bar = document.createElement('div'); bar.id = 'cd-savebar';
      bar.innerHTML = '<div><button type="button" class="cd-undo" data-cd="undo">تراجع</button><button type="button" class="cd-save" data-cd="save">حفظ</button></div>';
      document.body.appendChild(bar);
    }
    if (!box) {
      box = document.createElement('div'); box.id = 'cd-editor';
      block.firstElementChild.prepend(box);
    }
    const d = C.d, bgImg = d.bg === 'image' && d.bg_image;
    const ink = d.text_color || (typeof DMLoyaltyCard !== 'undefined' ? DMLoyaltyCard.inkFor(d.color || '#233d2c') : '#ffffff');
    const tabs = [['colors', 'الألوان', 'ph-palette'], ...(C.stamp ? [['stamp', 'الختم', 'ph-seal-check']] : []), ['logo', C.stamp ? 'الشعار' : 'الصور', 'ph-image']];
    let body = '';
    if (cdTab === 'colors') {
      const style = d.style || 'gradient';
      const rows = CD_COLOR_ROWS.filter(([k]) => (k !== 'stamp_color' || C.stamp) && (k !== 'color2' || (!bgImg && ['gradient', 'glass'].includes(style))));
      body = `
        <p class="cd-head">أشكال جاهزة</p>
        <div class="cd-themes">${CD_THEMES.map(([n, t], i) => `<button type="button" class="cd-theme" data-cd-theme="${i}" aria-pressed="${!bgImg && cdSame(C.stamp ? t : cdNoStamp(t), d)}"><span class="cd-mini" style="background:${t.color2 ? `linear-gradient(135deg, ${t.color}, ${t.color2})` : t.color}">${C.stamp ? `${`<i style="background:${t.stamp_color}"></i>`.repeat(3)}<i class="o" style="border-color:${t.text_color || '#fff'}"></i>` : ''}</span>${n}</button>`).join('')}</div>
        <p class="cd-head">الخلفية</p>
        <div class="cd-group">
          <div class="cd-row"><span>الخلفية</span><span class="cd-pills">${[['color', 'لون'], ['image', 'صورة']].map(([k, t]) => `<button type="button" data-cd-bg="${k}" aria-pressed="${(bgImg ? 'image' : 'color') === k}">${t}</button>`).join('')}</span></div>
          ${bgImg ? `<button type="button" class="cd-row" data-cd-file="${C.bgFile}"><span>تغيير الصورة</span><i class="ph-bold ph-caret-left cd-chev"></i></button>` : `
          <div class="cd-row"><span>الشكل</span><span class="cd-pills">${LY_STYLES.map(([k, t]) => `<button type="button" data-cd-style="${k}" aria-pressed="${style === k}">${t}</button>`).join('')}</span></div>`}
        </div>
        <p class="cd-head">الألوان</p>
        <div class="cd-group">${rows.map(([k, t]) => `
          <button type="button" class="cd-row" data-cd-pick="${k}"><span>${t}</span>${d[k] ? `<i class="cd-dot" style="background:${d[k]}"></i>` : `<em>${k === 'text_color' ? 'تلقائي' : 'بدون'}</em>`}<i class="ph-bold ph-caret-left cd-chev"></i></button>`).join('')}
        </div>
        ${!bgImg && cdContrast(d.color || '#233d2c', ink) < 3 ? '<p class="cd-warn"><i class="ph-bold ph-warning"></i> الكتابة ما تنقرا على هالخلفية، جرّب لون أفتح أو أغمق.</p>' : ''}`;
    } else if (cdTab === 'stamp') {
      const foodIco = ['coffee', 'fork-knife', 'hamburger', 'pizza', 'ice-cream', 'bread', 'cookie', 'cake', 'bowl-food', 'popcorn'];
      const isF = DMSectors.isFood(client), mine = DMSectors.loyal(client).stamp;
      const rank = (k) => k === mine ? 0 : (foodIco.includes(k) === isF ? 1 : 2);
      const icons = Object.entries(DMLoyaltyCard.ICONS).sort((a, b) => rank(a[0]) - rank(b[0])).slice(0, 15);
      body = `
        <p class="cd-head">شكل الختم</p>
        <div class="cd-icons">${icons.map(([k, cls]) => `<button type="button" class="cd-icon" data-cd-icon="${k}" aria-pressed="${!d.stamp_image && d.icon === k}" aria-label="${k}"><i class="ph-bold ${cls}"></i></button>`).join('')}
          <button type="button" class="cd-icon cd-up" data-cd-file="#ly-stamp-file" aria-pressed="${!!d.stamp_image}">${d.stamp_image ? `<img src="${esc(d.stamp_image)}" alt="">` : '<i class="ph-bold ph-upload-simple"></i><small>صورتك</small>'}</button>
        </div>
        ${d.stamp_image ? '<button type="button" class="cd-link cd-del" data-cd-clear="stamp_image">إزالة صورة الختم</button>' : ''}`;
    } else {
      // بطاقة الولاء: خيار إخفاء الشعار من البطاقة (الصفحة والمحفظة)
      const hideRow = C.kind === 'ly' ? `<button type="button" class="cd-hide-logo" data-cd-hidelogo role="switch" aria-checked="${!d.hide_logo}"><span><b>الشعار في البطاقة</b><small>${d.hide_logo ? 'مخفي: يظهر اسم المحل فقط' : 'ظاهر في صفحة البطاقة ومحفظة الجوال'}</small></span><i></i></button>` : '';
      body = `${hideRow}
        <div class="cd-tiles ${C.kind === 'ly' && d.hide_logo ? 'cd-dim' : ''}">${C.images.map(([k, t, sel, ic, round]) => { const url = d[k] || (k === 'logo' ? client.logo_url || '' : ''); return `
          <div class="cd-tile"><div class="cd-pic ${round ? '' : 'sq'}">${url ? `<img src="${esc(url)}" alt="">` : `<i class="ph-bold ${ic}"></i>`}</div><b>${t}</b>
            <div class="cd-acts"><button type="button" data-cd-file="${sel}">${d[k] ? 'تغيير' : 'رفع'}</button>${d[k] ? `<button type="button" class="cd-del" data-cd-clear="${k}">إزالة</button>` : ''}</div></div>`; }).join('')}
        </div>
        <p class="cd-note">${C.note(d)}</p>`;
    }
    box.innerHTML = `<div class="cd-seg" role="tablist">${tabs.map(([k, t, ic]) => `<button type="button" role="tab" aria-selected="${cdTab === k}" data-cd-tab="${k}"><i class="ph-bold ${ic}"></i> ${t}</button>`).join('')}</div>${body}`;
    cdBar();
  }
  let cdKind = null;
  const cdNoStamp = (t) => { const { stamp_color, ...rest } = t; return rest; };
  function cdBar() { const b = document.getElementById('cd-savebar'), C = cdCtx(); if (b) b.classList.toggle('on', !!C && C.dirty && location.hash === '#carddesign'); }

  function cdOpenPicker(k) {
    cdPicking = k;
    const label = (CD_COLOR_ROWS.find(r => r[0] === k) || [])[1] || '';
    const cur = (cdCtx() || { d: {} }).d[k] || '';
    const none = k === 'text_color' ? 'تلقائي' : k === 'color2' ? 'بدون' : null;
    apSheetHtml(label, `
      <div class="cd-swatches">${none ? `<button type="button" class="cd-sw cd-none" data-cd-c="" aria-pressed="${!cur}">${none}</button>` : ''}${CD_SWATCHES.map(c => `<button type="button" class="cd-sw" style="background:${c}" data-cd-c="${c}" aria-pressed="${cur === c}" aria-label="${c}"></button>`).join('')}</div>
      <label class="cd-custom"><span>لون آخر</span><input type="color" value="${cur || '#ffffff'}" data-cd-custom aria-label="لون آخر"></label>`);
  }
  // نافذة من تحت بمحتوى حر (نفس شكل قائمة الخيارات)
  function apSheetHtml(title, html) {
    document.getElementById('ap-sheet')?.remove();
    const el = document.createElement('div'); el.id = 'ap-sheet'; el.className = 'ap-asheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
    el.innerHTML = `<div class="ap-asheet-card cd-sheet"><p class="ap-asheet-title">${esc(title)}</p><div class="ap-asheet-list cd-sheet-body">${html}</div><button type="button" class="ap-asheet-cancel">تم</button></div>`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.ap-asheet-cancel')) { el.classList.remove('on'); setTimeout(() => el.remove(), 250); } });
    document.body.appendChild(el); void el.offsetWidth; el.classList.add('on');
  }
  const cdClose = () => { const s = document.getElementById('ap-sheet'); if (s) { s.classList.remove('on'); setTimeout(() => s.remove(), 250); } };

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.closest('#cd-editor, #cd-savebar, #ap-sheet')) return;
    const C = cdCtx(); if (!C) return;
    const tab = t.closest('[data-cd-tab]'); if (tab) { cdTab = tab.dataset.cdTab; return renderCardEditor(); }
    const th = t.closest('[data-cd-theme]'); if (th) { const tm = CD_THEMES[Number(th.dataset.cdTheme)][1]; return C.set({ ...(C.stamp ? tm : cdNoStamp(tm)), bg: 'color' }); }
    const bg = t.closest('[data-cd-bg]'); if (bg) return C.bg(bg.dataset.cdBg);
    const sty = t.closest('[data-cd-style]'); if (sty) return C.set({ style: sty.dataset.cdStyle });
    const pk = t.closest('[data-cd-pick]'); if (pk) return cdOpenPicker(pk.dataset.cdPick);
    const sw = t.closest('[data-cd-c]'); if (sw && cdPicking) { C.set({ [cdPicking]: sw.dataset.cdC || null }); return cdClose(); }
    const ic = t.closest('[data-cd-icon]'); if (ic) return C.set({ icon: ic.dataset.cdIcon, stamp_image: null });
    const fl = t.closest('[data-cd-file]'); if (fl) { const inp = document.querySelector(fl.dataset.cdFile); if (inp) inp.click(); return; }
    const hl = t.closest('[data-cd-hidelogo]'); if (hl) return C.set({ hide_logo: !C.d.hide_logo });
    const cl = t.closest('[data-cd-clear]'); if (cl) return C.set({ [cl.dataset.cdClear]: null });
    const act = t.closest('[data-cd]'); if (act) { if (act.dataset.cd === 'save') C.save(); else C.undo(); }
  });
  document.addEventListener('input', (e) => { if (e.target.matches('[data-cd-custom]') && cdPicking) { const C = cdCtx(); if (C) C.pick(cdPicking, e.target.value); } });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-cd-custom]') && cdPicking) { const C = cdCtx(); if (C) C.set({ [cdPicking]: e.target.value }); } });
  // نرسم المحرّر كل مرة يتحدّث الشكل (اختيار، رفع صورة، تراجع، حفظ) في البطاقتين
  const cdWrap = (name) => { if (typeof window[name] === 'function') { const f = window[name]; window[name] = function () { const r = f.apply(this, arguments); renderCardEditor(); return r; }; } };
  ['renderDesign', 'renderPkd'].forEach(cdWrap);
  ['renderPhone', 'renderPkdPreview'].forEach(n => { if (typeof window[n] === 'function') { const f = window[n]; window[n] = function () { const r = f.apply(this, arguments); cdBar(); return r; }; } });
  addEventListener('hashchange', cdBar);
