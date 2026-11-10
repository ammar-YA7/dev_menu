// =====================================================================
// DEV MENU — تثبيت لوحة التحكم على شاشة الجوال (PWA)
//   أندرويد: زر «ثبّت» يفتح نافذة التثبيت حقت المتصفح بضغطة وحدة
//   آيفون: آبل ما تسمح بالتثبيت من الصفحة، فنعرض الخطوات (المشاركة ← إضافة إلى الشاشة الرئيسية)
//   داخل متصفح انستقرام/سناب/تيك توك: لازم يفتح الرابط في سفاري أو كروم أول
// البطاقة تختفي لو اللوحة مثبّتة، أو على الكمبيوتر، أو لو صاحب المحل أخفاها (ترجع بعد 14 يوم)
// =====================================================================
(function () {
  const HIDE_KEY = 'dm_install_hide';
  const HIDE_DAYS = 14;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const inApp = /Instagram|FBAN|FBAV|Snapchat|TikTok|musical_ly|Bytedance|Line\//i.test(ua);
  const standalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  // أيقونة زر المشاركة في آيفون (مربع وسهم لفوق) عشان يعرفها على طول
  const SHARE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand shrink-0 mt-0.5" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>';
  const T = (s) => (window.DMi18n && DMi18n.t) ? DMi18n.t(s) : s;

  // عشان أندرويد يعتبر الصفحة تطبيق قابل للتثبيت
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; show(); });
  window.addEventListener('appinstalled', () => { deferred = null; hideCard(); });

  const hiddenByOwner = () => {
    try { const t = +localStorage.getItem(HIDE_KEY) || 0; return t && Date.now() - t < HIDE_DAYS * 864e5; } catch { return false; }
  };
  const card = () => document.getElementById('install-card');
  const hideCard = () => { const c = card(); if (c) c.classList.add('hidden'); };

  function show() {
    const c = card();
    if (!c || standalone() || hiddenByOwner()) return;
    if (!isIOS && !isAndroid && !deferred) return;   // كمبيوتر
    c.classList.remove('hidden');
  }

  // ─── نافذة الخطوات ───
  function guide() {
    let steps, title = 'ثبّت لوحة التحكم على جوالك';
    if (inApp) {
      title = 'افتح الرابط في المتصفح أول';
      steps = [
        ['ph-dots-three-outline', isIOS ? 'اضغط النقاط الثلاث فوق، واختر «فتح في سفاري».' : 'اضغط النقاط الثلاث فوق، واختر «فتح في كروم».'],
        ['ph-sign-in', 'سجّل دخولك، وارجع لهذي الصفحة واضغط «ثبّت».']
      ];
    } else if (isIOS) {
      steps = [
        [SHARE_SVG, 'اضغط زر المشاركة (المربع الذي فيه سهم للأعلى). في iOS 26 تجده داخل زر النقاط الثلاث في الأسفل.'],
        ['ph-plus-circle', 'انزل شوي واختر «إضافة إلى الشاشة الرئيسية».'],
        ['ph-check-circle', 'اضغط «إضافة». بتطلع أيقونة ديف منيو على شاشتك، افتح منها اللوحة وسجّل دخولك مرة وحدة.']
      ];
    } else {
      steps = [
        ['ph-dots-three-vertical', 'اضغط النقاط الثلاث فوق في المتصفح.'],
        ['ph-download-simple', 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'],
        ['ph-check-circle', 'اضغط «تثبيت». بتطلع أيقونة ديف منيو على شاشتك.']
      ];
    }
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-[80] bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3';
    wrap.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="install-title" class="pro-card w-full max-w-sm p-5 space-y-4">
        <div class="flex items-center gap-3">
          <img src="/images/apple-touch-icon.png" alt="" width="40" height="40" class="w-10 h-10 rounded-xl border border-[#e3e3e3]">
          <h3 id="install-title" class="text-[15px] font-bold text-ink flex-1"></h3>
        </div>
        <ol class="space-y-3"></ol>
        ${inApp ? '<button type="button" data-copy class="w-full bg-brand/10 hover:bg-brand/15 text-ink font-bold py-2.5 rounded-xl text-xs border border-brand/25"><i class="ph-bold ph-copy"></i> <span></span></button>' : ''}
        <button type="button" data-close class="w-full bg-brand text-cream hover:bg-brand-dark py-2.5 rounded-xl text-xs font-black"></button>
      </div>`;
    wrap.querySelector('#install-title').textContent = T(title);
    const ol = wrap.querySelector('ol');
    steps.forEach(([icon, text], i) => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-3';
      li.innerHTML = `<span class="w-7 h-7 rounded-full bg-brand text-cream text-xs font-black flex items-center justify-center shrink-0">${i + 1}</span>
        ${icon.startsWith('<svg') ? icon : `<i class="ph-bold ${icon} text-xl text-brand shrink-0 mt-0.5"></i>`}<p class="text-[12.5px] text-ink leading-relaxed"></p>`;
      li.querySelector('p').textContent = T(text);
      ol.appendChild(li);
    });
    const close = () => wrap.remove();
    const btn = wrap.querySelector('[data-close]'); btn.textContent = T('تمام');
    btn.onclick = close;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    const cp = wrap.querySelector('[data-copy]');
    if (cp) {
      const label = cp.querySelector('span'); label.textContent = T('انسخ الرابط');
      cp.onclick = async () => {
        try { await navigator.clipboard.writeText(location.origin + '/admin.html'); label.textContent = T('انسخ الرابط، والصقه في المتصفح'); } catch {}
      };
    }
    document.body.appendChild(wrap);
    btn.focus();
  }

  function init() {
    const go = document.getElementById('install-go'), x = document.getElementById('install-x');
    if (!go) return;
    go.onclick = async () => {
      if (deferred && !inApp) {
        deferred.prompt();
        const r = await deferred.userChoice.catch(() => null);
        deferred = null;
        if (r && r.outcome === 'accepted') hideCard();
        return;
      }
      guide();
    };
    if (x) x.onclick = () => { try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch {} hideCard(); };
    show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
