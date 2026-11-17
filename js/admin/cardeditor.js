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

  // التباين بين لونين (WCAG): أقل من 3 = الكتابة ما تنقرا
  const cdLum = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 1; const n = parseInt(m[1], 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cdContrast = (a, b) => { const [x, y] = [cdLum(a), cdLum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const cdSame = (t, d) => Object.entries(t).every(([k, v]) => (d[k] ?? null) === (v ?? null));

  function renderCardEditor() {
    const block = document.getElementById('ly-design-block');
    if (!block || typeof ly === 'undefined' || !ly.design) return;
    document.body.classList.add('ap-cd');
    let box = document.getElementById('cd-editor');
    if (!box) {
      box = document.createElement('div'); box.id = 'cd-editor';
      block.firstElementChild.prepend(box);
      const bar = document.createElement('div'); bar.id = 'cd-savebar';
      bar.innerHTML = '<div><button type="button" class="cd-undo" data-cd="undo">تراجع</button><button type="button" class="cd-save" data-cd="save">حفظ</button></div>';
      document.body.appendChild(bar);
    }
    const d = ly.design, bgImg = d.bg === 'image' && d.bg_image;
    const ink = d.text_color || (typeof DMLoyaltyCard !== 'undefined' ? DMLoyaltyCard.inkFor(d.color || '#233d2c') : '#ffffff');
    const tabs = [['colors', 'الألوان', 'ph-palette'], ['stamp', 'الختم', 'ph-seal-check'], ['logo', 'الشعار', 'ph-image']];
    let body = '';
    if (cdTab === 'colors') {
      const rows = CD_COLOR_ROWS.filter(([k]) => k !== 'color2' || (!bgImg && ['gradient', 'glass'].includes(d.style)));
      body = `
        <p class="cd-head">أشكال جاهزة</p>
        <div class="cd-themes">${CD_THEMES.map(([n, t], i) => `<button type="button" class="cd-theme" data-cd-theme="${i}" aria-pressed="${!bgImg && cdSame(t, d)}"><span class="cd-mini" style="background:${t.color2 ? `linear-gradient(135deg, ${t.color}, ${t.color2})` : t.color}">${`<i style="background:${t.stamp_color}"></i>`.repeat(3)}<i class="o" style="border-color:${t.text_color || '#fff'}"></i></span>${n}</button>`).join('')}</div>
        <p class="cd-head">الخلفية</p>
        <div class="cd-group">
          <div class="cd-row"><span>الخلفية</span><span class="cd-pills">${[['color', 'لون'], ['image', 'صورة']].map(([k, t]) => `<button type="button" data-cd-bg="${k}" aria-pressed="${(bgImg ? 'image' : 'color') === k}">${t}</button>`).join('')}</span></div>
          ${bgImg ? `<button type="button" class="cd-row" data-cd-file="#ly-bg-file"><span>تغيير الصورة</span><i class="ph-bold ph-caret-left cd-chev"></i></button>` : `
          <div class="cd-row"><span>الشكل</span><span class="cd-pills">${LY_STYLES.map(([k, t]) => `<button type="button" data-cd-style="${k}" aria-pressed="${d.style === k}">${t}</button>`).join('')}</span></div>`}
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
      const logo = d.logo || client.logo_url || '';
      body = `
        <div class="cd-tiles">
          <div class="cd-tile"><div class="cd-pic">${logo ? `<img src="${esc(logo)}" alt="">` : '<i class="ph-bold ph-storefront"></i>'}</div><b>الشعار</b>
            <div class="cd-acts"><button type="button" data-cd-file="input[onchange=&quot;uploadLyImage(this, 'logo')&quot;]">${d.logo ? 'تغيير' : 'رفع'}</button>${d.logo ? '<button type="button" class="cd-del" data-cd-clear="logo">إزالة</button>' : ''}</div></div>
          <div class="cd-tile"><div class="cd-pic sq">${d.reward_image ? `<img src="${esc(d.reward_image)}" alt="">` : '<i class="ph-bold ph-gift"></i>'}</div><b>صورة المكافأة</b>
            <div class="cd-acts"><button type="button" data-cd-file="input[onchange=&quot;uploadLyImage(this, 'reward_image')&quot;]">${d.reward_image ? 'تغيير' : 'رفع'}</button>${d.reward_image ? '<button type="button" class="cd-del" data-cd-clear="reward_image">إزالة</button>' : ''}</div></div>
        </div>
        <p class="cd-note">${d.logo ? 'شعار البطاقة يطلع بدل شعار المنيو.' : 'بدون شعار خاص، يطلع شعار المنيو.'} صورة المكافأة تطلع مكان آخر ختم.</p>`;
    }
    box.innerHTML = `<div class="cd-seg" role="tablist">${tabs.map(([k, t, ic]) => `<button type="button" role="tab" aria-selected="${cdTab === k}" data-cd-tab="${k}"><i class="ph-bold ${ic}"></i> ${t}</button>`).join('')}</div>${body}`;
    document.getElementById('cd-savebar').classList.toggle('on', !!ly.dirty && location.hash === '#carddesign');
  }

  function cdOpenPicker(k) {
    cdPicking = k;
    const label = (CD_COLOR_ROWS.find(r => r[0] === k) || [])[1] || '';
    const cur = ly.design[k] || '';
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
    const tab = t.closest('[data-cd-tab]'); if (tab) { cdTab = tab.dataset.cdTab; return renderCardEditor(); }
    const th = t.closest('[data-cd-theme]'); if (th) return setLyDesign({ ...CD_THEMES[Number(th.dataset.cdTheme)][1], bg: 'color' });
    const bg = t.closest('[data-cd-bg]'); if (bg) return pickCardBg(bg.dataset.cdBg);
    const sty = t.closest('[data-cd-style]'); if (sty) return setLyDesign({ style: sty.dataset.cdStyle });
    const pk = t.closest('[data-cd-pick]'); if (pk) return cdOpenPicker(pk.dataset.cdPick);
    const sw = t.closest('[data-cd-c]'); if (sw && cdPicking) { setLyDesign({ [cdPicking]: sw.dataset.cdC || null }); return cdClose(); }
    const ic = t.closest('[data-cd-icon]'); if (ic) return setLyDesign({ icon: ic.dataset.cdIcon, stamp_image: null });
    const fl = t.closest('[data-cd-file]'); if (fl) { const inp = document.querySelector(fl.dataset.cdFile); if (inp) inp.click(); return; }
    const cl = t.closest('[data-cd-clear]'); if (cl) return setLyDesign({ [cl.dataset.cdClear]: null });
    const act = t.closest('[data-cd]'); if (act) { if (act.dataset.cd === 'save') document.getElementById('ly-design-save').click(); else undoLyDesign(); }
  });
  document.addEventListener('input', (e) => { if (e.target.matches('[data-cd-custom]') && cdPicking) pickLyColor(cdPicking, e.target.value); });
  document.addEventListener('change', (e) => { if (e.target.matches('[data-cd-custom]') && cdPicking) setLyDesign({ [cdPicking]: e.target.value }); });
  // نرسم المحرّر كل مرة يتحدّث الشكل (اختيار، رفع صورة، تراجع، حفظ)
  if (typeof renderDesign === 'function') { const f = renderDesign; renderDesign = function () { f.apply(this, arguments); renderCardEditor(); }; }
  if (typeof renderPhone === 'function') { const f = renderPhone; renderPhone = function () { f.apply(this, arguments); const b = document.getElementById('cd-savebar'); if (b) b.classList.toggle('on', !!ly.dirty && location.hash === '#carddesign'); }; }
  addEventListener('hashchange', () => { const b = document.getElementById('cd-savebar'); if (b) b.classList.toggle('on', typeof ly !== 'undefined' && !!ly.dirty && location.hash === '#carddesign'); });
