// =====================================================================
// DEV MENU — «كيف سمعت عنا؟» بعد ما يدخل صاحب المتجر لوحته (مرة وحدة)
//   يطلع للمتجر الرئيسي اللي ما جاوب، ومو للمدير العام وهو يتصفح متجر
//   إجباري: ما يتسكّر إلا بعد ما يختار ويحفظ. الجواب ينحفظ على المتجر (heard-from في api/_lib/owner/account.js)
// =====================================================================
(function () {
  const OPTIONS = [
    ['instagram', 'ph-instagram-logo', 'انستقرام'], ['tiktok', 'ph-tiktok-logo', 'تيك توك'],
    ['snapchat', 'ph-snapchat-logo', 'سناب شات'], ['google', 'ph-google-logo', 'بحث قوقل'],
    ['x', 'ph-x-logo', 'إكس (تويتر)'], ['friend', 'ph-users', 'صديق أو محل'],
    ['visit', 'ph-handshake', 'زيارة أو اتصال منا'], ['other', 'ph-dots-three-circle', 'أخرى']
  ];
  const T = (s) => (window.DMi18n && DMi18n.t) ? DMi18n.t(s) : s;

  function open() {
    let pick = '';
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-[80] bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3';
    wrap.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="heard-title" class="pro-card w-full max-w-md p-5 space-y-4">
        <div>
          <h3 id="heard-title" class="text-[16px] font-bold text-ink"></h3>
          <p class="text-[13px] text-ink mt-1"></p>
        </div>
        <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="heard-title"></div>
        <input type="text" maxlength="80" class="input-pro hidden">
        <button type="button" data-save disabled class="w-full bg-brand text-cream hover:bg-brand-dark py-2.5 rounded-xl text-xs font-black disabled:opacity-50"></button>
      </div>`;
    wrap.querySelector('h3').textContent = T('كيف سمعت عن ديف منيو؟');
    wrap.querySelector('p').textContent = T('سؤال واحد ويساعدنا نوصل لمحلات مثلك.');
    const grid = wrap.querySelector('[role="radiogroup"]'), note = wrap.querySelector('input'), save = wrap.querySelector('[data-save]');
    note.placeholder = T('وين سمعت عنا؟ (اختياري)');
    save.textContent = T('حفظ');
    OPTIONS.forEach(([v, icon, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.dataset.v = v;
      b.className = 'heard-opt flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-semibold text-ink text-right transition';
      b.innerHTML = `<i class="ph-bold ${icon} text-base"></i><span></span>`;
      b.querySelector('span').textContent = T(label);
      grid.appendChild(b);
    });
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      pick = b.dataset.v;
      grid.querySelectorAll('[data-v]').forEach(x => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.classList.toggle('heard-on', on); });
      note.classList.toggle('hidden', pick !== 'other');
      if (pick === 'other') note.focus();
      save.disabled = false;
    });
    const close = () => wrap.remove();
    save.onclick = async () => {
      if (!pick) return;
      save.disabled = true;
      try {
        await api('heard-from', { heard_from: pick, note: pick === 'other' ? note.value.trim() : '' });
        try { client.heard_from = pick; } catch {}
        close();
        if (typeof showToast === 'function') showToast(T('شكراً لك'));
      } catch {
        // ما نعلّق صاحب المحل برا لوحته لو الحفظ فشل: تتسكّر، وتطلع له مرة ثانية أول ما يدخل
        close();
        if (typeof showToast === 'function') showToast(T('ما انحفظ الجواب، بنسألك مرة ثانية'), true);
      }
    };
    document.body.appendChild(wrap);
  }

  // ننتظر لين تتحمّل بيانات المتجر (client في js/admin/core.js)
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    let c = null, admin = false;
    try { c = client; admin = isSuperAdmin; } catch {}
    if (c) {
      clearInterval(timer);
      // المدير العام يدخل لوحات المتاجر: ما نسأله
      if (admin || c.parent_id || c.heard_from) return;
      setTimeout(open, 1500);   // بعد ما تستقر اللوحة
    } else if (tries > 60) clearInterval(timer);
  }, 500);
})();
