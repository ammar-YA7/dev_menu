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
