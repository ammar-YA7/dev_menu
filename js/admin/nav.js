// =====================================================================
// DEV MENU — لوحة التحكم: التنقل بخمس أقسام (زي تطبيقات أبل)
//   الرئيسية، المنيو، البيجر، العملاء، الإعدادات. وكل قسم فيه أكثر من صفحة تطلع له تبويبات فرعية فوق
//   الصلاحيات ما تتغيّر: الصفحة تطلع بس لو زرّها القديم في القائمة (#nav-legacy) ظاهر بعد applyFeatureLocks
// =====================================================================
  const NAV_GROUPS = [
    { id: 'home', label: 'الرئيسية', icon: 'ph-house', pages: ['dashboard'] },
    { id: 'menu', label: 'المنيو', icon: 'ph-fork-knife', pages: ['menu'] },
    { id: 'pager', label: 'البيجر', icon: 'ph-bell-ringing', pages: ['pagerset', 'waitlist'] },
    { id: 'people', label: 'العملاء', icon: 'ph-users', pages: ['customers', 'loyalty', 'subs', 'carddesign', 'messages'] },
    { id: 'settings', label: 'الإعدادات', icon: 'ph-gear-six', pages: ['settings', 'branches', 'devices', 'account'] }
  ];
  const SEG_LABELS = { pagerset: 'البيجر', waitlist: 'قائمة الانتظار', customers: 'العملاء', loyalty: 'الأختام', subs: 'الاشتراكات', carddesign: 'تصميم البطاقة', messages: 'الرسائل', settings: 'الهوية', branches: 'الفروع', devices: 'الأجهزة', account: 'الاشتراك' };
  // اختصارات كل قسم: تنسخ نفس الأزرار القديمة (بصلاحياتها) بشكل كبسولة
  const NAV_ACTIONS = {
    home: [['[data-page="dashboard"] [onclick="goAddDish()"]', 'ph-plus', 'أضف طبق']],
    menu: [['#sidebar-preview', 'ph-eye', 'معاينة المنيو'], ['[onclick="copyMenuLink()"]', 'ph-link-simple', 'نسخ الرابط']],
    pager: [['#nav-legacy a[href="pager-desk.html"]', 'ph-arrow-square-out', null]],
    people: [['#nav-legacy a[href="cashier.html"]', 'ph-cash-register', 'شاشة الكاشير']]
  };

  // الصفحة متاحة لهالمشترك؟ (زرها القديم ما انخفى بالصلاحيات)
  function navPageOn(page) {
    if (page === 'dashboard') return true;
    // الصفحة اللي مو ضمن باقته ما تطلع أبداً (حتى لو زرّها القديم رجع ظاهر)
    const key = typeof PAGE_FEATURE[page] === 'function' ? PAGE_FEATURE[page]() : PAGE_FEATURE[page];
    if (key && featureLocked(key)) return false;
    const el = document.querySelector(`#nav-legacy [data-nav="${page}"]`);
    if (!el) return false;
    for (let n = el; n && n.id !== 'nav-legacy'; n = n.parentElement) if (n.style && n.style.display === 'none') return false;
    return true;
  }
  const groupOf = (page) => NAV_GROUPS.find(g => g.pages.includes(page)) || NAV_GROUPS[0];
  const groupPages = (g) => g.pages.filter(navPageOn);

  function goGroup(id) {
    const g = NAV_GROUPS.find(x => x.id === id);
    const cur = location.hash.slice(1);
    const pages = groupPages(g);
    const target = pages.includes(cur) ? cur : pages[0] || g.pages[0];
    if (location.hash === '#' + target) return showPage(target);
    location.hash = target;
  }

  function renderNavGroups(page) {
    const g = groupOf(page);
    document.querySelectorAll('[data-group]').forEach(b => {
      const grp = NAV_GROUPS.find(x => x.id === b.dataset.group), on = groupPages(grp);
      b.style.display = on.length ? '' : 'none';
      b.classList.toggle('nav-active', grp === g);
      // قائمة الانتظار بدون البيجر: القسم يتسمّى باسمها
      if (grp.id === 'pager') {
        const wl = on.length === 1 && on[0] === 'waitlist';
        const label = wl ? 'الانتظار' : 'البيجر', icon = wl ? 'ph-users-three' : 'ph-bell-ringing';
        const span = b.querySelector('span:not(.ap-badge)');
        if (span) span.textContent = label; else b.lastChild.textContent = ' ' + (wl ? 'قائمة الانتظار' : label);
        b.querySelector('i').className = `ph-bold ${icon}`;
      }
    });
    const bar = document.getElementById('seg-bar');
    if (!bar) return;
    const pages = groupPages(g);
    // الرئيسية: العنوان الكبير ترحيب باسم المحل، وتبويب «اليوم» و«روابطك» (الروابط والباركود وأرقام المنيو)
    if (page === 'dashboard') {
      const name = (typeof client !== 'undefined' && client && client.name) || '';
      document.getElementById('page-title').textContent = name ? `أهلاً، ${name}` : 'الرئيسية';
      document.getElementById('page-subtitle').textContent = homeTab() === 'links' ? 'روابط خدماتك وباركود المنيو' : 'شغل اليوم وأرقام خدماتك';
      markHomeLinks();
      const sec = document.querySelector('[data-page="dashboard"]');
      if (sec) sec.dataset.homeTab = homeTab();
      const segHome = homeHasLinks() ? `<div class="ap-seg" role="tablist">${[['today', 'اليوم'], ['links', 'روابطك وباركودك']].map(([k, t]) => `<button type="button" role="tab" aria-selected="${homeTab() === k}" data-home="${k}">${t}</button>`).join('')}</div>` : '';
      bar.innerHTML = segHome + navActionsHtml(g);
      return;
    }
    const seg = pages.length > 1 ? `<div class="ap-seg" role="tablist">${pages.map(p => `<button type="button" role="tab" aria-selected="${p === page}" data-seg="${p}">${SEG_LABELS[p] || PAGES[p][0]}</button>`).join('')}</div>` : '';
    bar.innerHTML = seg + navActionsHtml(g);
  }
  function navActionsHtml(g) {
    const acts = (NAV_ACTIONS[g.id] || []).map(([sel, icon, label], i) => {
      const src = document.querySelector(sel);
      if (!src || src.style.display === 'none' || (src.closest('[style*="display: none"]'))) return '';
      return `<button type="button" class="ap-chip" data-act="${g.id}:${i}"><i class="ph-bold ${icon}"></i> ${label || src.textContent.trim()}</button>`;
    }).join('');
    return acts ? `<div class="ap-actions">${acts}</div>` : '';
  }

  // ─── الرئيسية: «اليوم» و«روابطك وباركودك» ───
  let homeTabNow = null;
  function homeTab() {
    if (!homeTabNow) { try { homeTabNow = localStorage.getItem('dm_home_tab') || 'today'; } catch { homeTabNow = 'today'; } }
    return homeHasLinks() ? homeTabNow : 'today';
  }
  // كروت الروابط: روابط الخدمات، وباركود المنيو، وأرقام المنيو
  function markHomeLinks() {
    ['svc-links', 'qrcode', 'quick-counts'].forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      const card = el.classList.contains('pro-card') ? el : el.closest('.pro-card');
      if (card) { card.classList.add('home-link'); card.parentElement.classList.add('home-links-wrap'); }
    });
  }
  const homeHasLinks = () => { markHomeLinks(); return [...document.querySelectorAll('.home-link')].some(c => c.style.display !== 'none' && !c.classList.contains('hidden')); };


  document.addEventListener('click', (e) => {
    const grp = e.target.closest('[data-group]');
    if (grp) return goGroup(grp.dataset.group);
    const home = e.target.closest('[data-home]');
    if (home) { homeTabNow = home.dataset.home; try { localStorage.setItem('dm_home_tab', homeTabNow); } catch {} renderNavGroups('dashboard'); window.scrollTo({ top: 0 }); return; }
    const seg = e.target.closest('[data-seg]');
    if (seg) { location.hash = seg.dataset.seg; return; }
    const act = e.target.closest('[data-act]');
    if (act) {
      const [gid, i] = act.dataset.act.split(':');
      const src = document.querySelector(NAV_ACTIONS[gid][Number(i)][0]);
      if (src) src.click();
    }
  });
  // العنوان الكبير: خط فاصل تحته أول ما تنزل
  addEventListener('scroll', () => { const h = document.querySelector('header.sticky'); if (h) h.classList.toggle('ap-scrolled', scrollY > 4); }, { passive: true });

  // ─── إضافة وتعديل الطبق في الجوال: نافذة تطلع من تحت بدل ما ينزل لآخر الصفحة ───
  const dishMQ = matchMedia('(max-width: 1023px)');
  function dishSheet(on) {
    const col = document.getElementById('product-form-col');
    if (!col || (on && !dishMQ.matches)) return;
    if (!document.getElementById('ap-dish-bd')) {
      const bd = document.createElement('div'); bd.id = 'ap-dish-bd'; bd.className = 'ap-backdrop';
      bd.addEventListener('click', closeDishSheet); document.body.appendChild(bd);
      const form = document.getElementById('add-product-form');
      const top = document.createElement('div'); top.className = 'ap-sheet-top';
      top.innerHTML = '<span class="ap-grabber"></span><button type="button" class="ap-sheet-x" aria-label="إغلاق"><i class="ph-bold ph-x"></i></button>';
      top.querySelector('button').addEventListener('click', closeDishSheet);
      form.prepend(top);
    }
    document.body.classList.toggle('ap-dish-open', on);
    if (on) col.scrollTop = 0;
  }
  function closeDishSheet() {
    if (typeof editingProductId !== 'undefined' && editingProductId) cancelEdit(); else dishSheet(false);
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('ap-dish-open')) closeDishSheet(); });
  dishMQ.addEventListener('change', () => { if (!dishMQ.matches) dishSheet(false); });
  // نلف دوال المنيو: فتح الإضافة والتعديل يفتح النافذة، والإلغاء أو الحفظ يقفلها
  if (typeof goAddDish === 'function') { const f = goAddDish; goAddDish = function () { f.apply(this, arguments); dishSheet(true); }; }
  if (typeof startEdit === 'function') { const f = startEdit; startEdit = function () { f.apply(this, arguments); dishSheet(true); }; }
  if (typeof cancelEdit === 'function') { const f = cancelEdit; cancelEdit = function () { f.apply(this, arguments); dishSheet(false); }; }

  // ─── الإعدادات في الجوال: قائمة صفوف زي «الإعدادات» في الآيفون، والضغط يفتح تفاصيل الصف مع زر رجوع ───
  //   كل [data-sttab] في صفحة المنشأة = صف. الصفوف مقسومة حسب التبويب (بيانات المنشأة، التواصل والتوصيل، صفحة الروابط)
  const ST_TABS = [['info', 'بيانات المنشأة'], ['contact', 'التواصل والتوصيل'], ['links', 'صفحة الروابط']];
  const stMQ = matchMedia('(max-width: 1023px)');
  let stOpen = null;   // رقم الصف المفتوح، أو null = القائمة
  const stUnits = () => [...document.querySelectorAll('[data-page="settings"] [data-sttab]')];
  const stVisible = (el) => el.style.display !== 'none' && !el.classList.contains('hidden') && !(el.closest('[style*="display: none"]'));
  function stInfo(el) {
    const h = el.querySelector('h3, h4');
    const icon = h && h.querySelector('i') ? [...h.querySelector('i').classList].find(c => c.startsWith('ph-') && c !== 'ph-bold') : 'ph-gear-six';
    const title = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    const p = el.querySelector('#slug-hint') || [...el.querySelectorAll('p, span.block')].find(x => x.textContent.trim().length > 12 && !x.closest('label'));
    const sub = p ? p.textContent.replace(/\s+/g, ' ').trim() : '';
    return { icon, title, sub: sub.length > 70 ? sub.slice(0, 68) + '…' : sub };
  }
  function renderStList() {
    const sec = document.querySelector('[data-page="settings"]');
    if (!sec) return;
    let list = document.getElementById('ap-st-list');
    if (!list) { list = document.createElement('div'); list.id = 'ap-st-list'; sec.prepend(list); }
    let back = document.getElementById('ap-st-back');
    if (!back) {
      back = document.createElement('button'); back.type = 'button'; back.id = 'ap-st-back';
      back.innerHTML = '<i class="ph-bold ph-caret-left ap-flip"></i> <span>هوية المنشأة</span>';
      back.addEventListener('click', () => history.state && history.state.apSt != null ? history.back() : stShow(null));
      sec.prepend(back);
    }
    const units = stUnits();
    units.forEach((u, i) => { u.dataset.apUnit = i; });
    const tabOn = (t) => { const b = document.querySelector(`[data-stt="${t}"]`); return !b || b.style.display !== 'none'; };
    list.innerHTML = ST_TABS.filter(([t]) => tabOn(t)).map(([t, label]) => {
      const rows = units.filter(u => u.dataset.sttab === t && stVisible(u)).map(u => ({ u, ...stInfo(u) })).filter(r => r.title);
      if (!rows.length) return '';
      return `<p class="ap-st-head">${label}</p><div class="ap-st-group">${rows.map(r => `
        <button type="button" class="ap-st-row" data-st-open="${r.u.dataset.apUnit}">
          <span class="ap-st-ic"><i class="ph-bold ${r.icon}"></i></span>
          <span class="ap-st-txt"><b>${esc(r.title)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
          <i class="ph-bold ph-caret-left ap-st-chev"></i>
        </button>`).join('')}</div>`;
    }).join('');
  }
  function stShow(i, push) {
    const sec = document.querySelector('[data-page="settings"]');
    if (!sec) return;
    stOpen = i;
    sec.classList.toggle('ap-st-mode', stMQ.matches);
    sec.classList.toggle('ap-st-detail', stMQ.matches && i != null);
    stUnits().forEach(u => u.classList.toggle('ap-st-cur', String(u.dataset.apUnit) === String(i)));
    if (i != null) {
      const u = stUnits().find(x => String(x.dataset.apUnit) === String(i));
      if (u && typeof setStTab === 'function') setStTab(u.dataset.sttab);
      if (push) history.pushState({ apSt: i }, '', location.href);
      window.scrollTo({ top: 0 });
    } else renderStList();
  }
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-st-open]');
    if (r) stShow(r.dataset.stOpen, true);
  });
  addEventListener('popstate', () => { if (stOpen != null && location.hash === '#settings') stShow(null); });
  stMQ.addEventListener('change', () => stShow(stMQ.matches ? stOpen : null));
  // كل مرة تنفتح صفحة المنشأة: ترجع للقائمة (إلا لو فيه طلب يفتح بطاقة معيّنة)
  if (typeof showPage === 'function') {
    const f = showPage;
    showPage = function (page) { f.apply(this, arguments); if (page === 'settings') { renderStList(); stShow(null); } };
  }
  // goStoreCard (من الرئيسية وخطوات التجهيز): يفتح تفاصيل البطاقة اللي فيها العنصر
  if (typeof goStoreCard === 'function') {
    const f = goStoreCard;
    goStoreCard = function (id) {
      f.apply(this, arguments);
      const el = document.getElementById(id), u = el && el.closest('[data-sttab]');
      if (u && stMQ.matches) { renderStList(); stShow(u.dataset.apUnit, true); setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }
    };
  }
