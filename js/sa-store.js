// =====================================================================
// DEV MENU — صفحة المشتركين: ملف المحل في مكان واحد
//   القائمة: صف مختصر لكل محل (الحالة، الباقة، السعر، التجديد، الطلب). تضغطه ينفتح «ملف المحل»
//   ملف المحل: الاشتراك والخدمات والسعر، وأزرار (تفعيل/تجديد، تعديل الخدمات، عرض سعر، فاتورة)،
//   والفروع، والتواصل، والاستخدام، والإعدادات، والحذف. كل زر يستخدم نفس دوال الصفحة الحالية
//   للرجوع: احذف سطر هذا الملف وسطر css/skin-apple-sa.css من super-admin.html
// =====================================================================
(function () {
  let profileId = null;
  const per = (p) => p === 'month' ? 'بالشهر' : 'بالسنة';
  const date = (d) => d ? new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const plan = (c) => c.subscription_plan === 'month' ? 'month' : 'year';

  // ─── صف المحل في القائمة ───
  window.storeCard = function (c) {
    const id = Number(c.id), s = statusOf(c), logo = safeUrl(c.logo_url);
    const feats = s.key === 'trial' ? reqFeats(c) : planFeats(c);
    const p = c.requested_plan || plan(c);
    const days = s.left === null || s.key === 'free' ? '' : s.left > 0 ? `باقي ${s.left} يوم` : `انتهى من ${Math.abs(s.left)} يوم`;
    const nb = branchesOf(c).length;
    return `
      <article class="sa-row ${c.requested_plan ? 'has-req' : ''}" data-profile="${id}" tabindex="0" role="button" aria-label="ملف ${esc(c.name || '')}">
        <span class="sa-logo">${logo ? `<img src="${esc(logo)}" alt="" loading="lazy">` : esc((c.name || '؟').trim().charAt(0))}</span>
        <span class="sa-main">
          <b>${esc(c.name || 'بدون اسم')}${c.is_featured ? ' <i class="ph-bold ph-star sa-star"></i>' : ''}</b>
          <small>${esc(featNames(feats) || '—')}${nb ? ` · ${nb} ${nb === 1 ? 'فرع' : 'فروع'}` : ''}</small>
          <span class="sa-tags">
            <span class="sa-tag s-${s.key}">${s.label}${s.key === 'paid' ? ` ${c.subscription_plan === 'month' ? 'شهري' : 'سنوي'}` : ''}</span>
            ${days ? `<span class="sa-tag ${isSoon(c) ? 's-soon' : ''}">${days}</span>` : ''}
            ${c.requested_plan ? `<span class="sa-tag s-req"><i class="ph-bold ph-bell-simple-ringing"></i> طلب ${c.requested_plan === 'month' ? 'الشهري' : 'السنوي'}</span>` : ''}
            ${isProspect(c) ? '<span class="sa-tag s-prospect">عميل محتمل</span>' : ''}
            ${DMPlans.special(c) ? `<span class="sa-tag s-disc"><i class="ph-bold ph-tag"></i> خصم ${DMPlans.special(c).type === 'pct' ? `${DMPlans.special(c).value}%` : money(DMPlans.special(c).value)}</span>` : ''}
          </span>
        </span>
        <span class="sa-price">${s.key === 'free' ? 'مجاني' : `${money(totalFor(c, p))}<small>${per(p)}</small>`}</span>
        <i class="ph-bold ph-caret-left sa-chev"></i>
      </article>`;
  };

  // ─── ملف المحل ───
  function openProfile(id) {
    profileId = id;
    let el = document.getElementById('sa-profile');
    if (!el) {
      el = document.createElement('div'); el.id = 'sa-profile'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.innerHTML = '<div class="sa-pf-card"><div class="sa-pf-top"><button type="button" class="sa-x" data-pf-close aria-label="إغلاق"><i class="ph-bold ph-x"></i></button></div><div id="sa-pf-body"></div></div>';
      el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-pf-close]')) closeProfile(); });
      document.body.appendChild(el);
    }
    renderProfile();
    el.classList.add('on'); document.body.style.overflow = 'hidden';
  }
  function closeProfile() { const el = document.getElementById('sa-profile'); if (el) el.classList.remove('on'); document.body.style.overflow = ''; profileId = null; }
  window.saRefreshProfile = () => { if (profileId != null) renderProfile(); };

  function renderProfile() {
    const c = find(profileId) || archived.find(x => x.id === profileId);
    const body = document.getElementById('sa-pf-body');
    if (!c || !body) return closeProfile();
    const id = Number(c.id), s = statusOf(c), logo = safeUrl(c.logo_url), slug = encodeURIComponent(c.client_slug || '');
    const isBranch = !!c.parent_id, prospect = isProspect(c);
    const p = c.requested_plan || plan(c);
    const feats = c.requested_plan ? reqFeats(c) : planFeats(c);
    const pr = isBranch ? null : DMPlans.price(feats, p, branchesOf(c), c);
    const sp = isBranch ? null : DMPlans.special(c);
    const phone = waPhone(c.phone), remind = reminderLink(c);
    const row = (label, value, extra = '') => `<div class="sa-pf-row ${extra}"><span>${label}</span><b>${value}</b></div>`;
    const act = (fn, icon, label, cls = '') => `<button type="button" class="sa-act ${cls}" onclick="${fn}"><i class="ph-bold ${icon}"></i><span>${label}</span></button>`;
    const link = (href, icon, label) => `<a class="sa-act" href="${esc(href)}" target="_blank" rel="noopener"><i class="ph-bold ${icon}"></i><span>${label}</span></a>`;
    body.innerHTML = `
      <div class="sa-pf-head">
        <span class="sa-logo lg">${logo ? `<img src="${esc(logo)}" alt="">` : esc((c.name || '؟').trim().charAt(0))}</span>
        <h2>${esc(c.name || 'بدون اسم')}</h2>
        <p dir="ltr">${esc(c.client_slug || '')}</p>
        <span class="sa-tags center"><span class="sa-tag s-${s.key}">${s.label}</span>${isBranch ? '<span class="sa-tag">فرع</span>' : ''}${prospect ? '<span class="sa-tag s-prospect">عميل محتمل</span>' : ''}</span>
        <div class="sa-quick">
          ${phone ? link(`https://wa.me/${phone}`, 'ph-whatsapp-logo', 'واتساب') : ''}
          ${link(`admin.html?client=${slug}`, 'ph-gauge', 'لوحته')}
          ${link(DM.storeUrl(c.client_slug), 'ph-eye', 'المنيو')}
        </div>
      </div>

      ${c.requested_plan && !isBranch ? `
      <div class="sa-req">
        <p><i class="ph-bold ph-bell-simple-ringing"></i> طلب الباقة ${c.requested_plan === 'month' ? 'الشهرية' : 'السنوية'}: <b>${esc(featNames(reqFeats(c)))}</b></p>
        <p class="sa-req-total">${money(totalFor(c, c.requested_plan, reqFeats(c)))} ${per(c.requested_plan)}</p>
        <div class="sa-btns">${act(`activate(${id}, '${c.requested_plan}')`, 'ph-check-circle', 'فعّل بعد الدفع', 'fill')}${!prospect ? act(`sendInvoiceDlg(${id})`, 'ph-receipt', 'فاتورة مستحقة') : ''}</div>
      </div>` : ''}

      <p class="sa-h">الاشتراك</p>
      <div class="sa-group">
        ${row('الحالة', `${s.label}${s.key === 'paid' ? ` ${c.subscription_plan === 'month' ? 'شهري' : 'سنوي'}` : ''}`)}
        ${s.key === 'free' ? row('الحد', `${DMPlans.FREE.pager} رقم بالشهر`) : row(s.key === 'trial' ? 'التجربة تنتهي' : 'يتجدد', `${s.endText}${s.left !== null ? ` (${s.left > 0 ? `باقي ${s.left} يوم` : `منذ ${Math.abs(s.left)} يوم`})` : ''}`, isSoon(c) ? 'warn' : '')}
        ${row('سجّل', date(c.created_at))}
        ${c.heard_from ? row('سمع عنا من', esc(HEARD_FROM[c.heard_from] || c.heard_from)) : ''}
      </div>

      ${pr ? `
      <p class="sa-h">الخدمات والسعر ${c.requested_plan ? '(حسب الطلب)' : ''}</p>
      <div class="sa-group">
        ${pr.lines.map(l => row(esc(l.label), money(l.amount))).join('')}
        ${pr.discounts.map(d => row(esc(d.label), `- ${money(d.amount)}`, 'disc')).join('')}
        ${row(`المجموع ${per(p)}`, money(pr.total), 'total')}
        <button type="button" class="sa-pf-row link" onclick="saDiscount(${id})"><span><i class="ph-bold ph-tag"></i> الخصم الخاص</span><b>${sp ? `${discText(sp)} <i class="ph-bold ph-caret-left"></i>` : 'بدون <i class="ph-bold ph-caret-left"></i>'}</b></button>
      </div>
      <div class="sa-btns">
        ${act(`activate(${id}, '${p}')`, 'ph-check-circle', s.key === 'paid' ? 'تجديد' : 'تفعيل', 'fill')}
        ${act(`openFeatures(${id})`, 'ph-sliders-horizontal', 'تعديل الخدمات')}
        ${!prospect ? act(`saQuote(${id})`, 'ph-file-text', 'عرض سعر') : ''}
        ${!prospect ? act(`sendInvoiceDlg(${id})`, 'ph-receipt', 'فاتورة مستحقة') : ''}
      </div>` : `
      <div class="sa-btns">${act(`openFeatures(${id})`, 'ph-sliders-horizontal', 'مميزات الفرع')}</div>`}

      ${!isBranch ? `
      <p class="sa-h">الفروع</p>
      <div class="sa-group">
        ${branchesOf(c).map(b => `<button type="button" class="sa-pf-row link" data-profile="${Number(b.id)}"><span>${esc(b.name || b.client_slug)}${b.is_active === false ? ' <em class="sa-tag s-suspended">موقوف</em>' : ''}</span><b>${money(totalFor(b, plan(c)))} <i class="ph-bold ph-caret-left"></i></b></button>`).join('')}
        <button type="button" class="sa-pf-row link add" onclick="addBranch(${id})"><span><i class="ph-bold ph-plus"></i> إضافة فرع</span><b>${money(plan(c) === 'month' ? PLAN_PRICE.branchMonth : PLAN_PRICE.branch)} ربط</b></button>
      </div>` : ''}

      ${usage && !prospect && !isBranch ? `<p class="sa-h">الاستخدام (آخر 30 يوم)</p><div class="sa-group sa-usage">${usageLine(c)}</div>` : ''}

      <p class="sa-h">التواصل</p>
      <div class="sa-group">
        ${row('الجوال', c.phone ? (phone ? `<a href="https://wa.me/${phone}" target="_blank" rel="noopener" dir="ltr">${esc(c.phone)}</a>` : `<span dir="ltr">${esc(c.phone)}</span>`) : '—')}
        ${row('البريد', prospect ? 'ما تسلّمه صاحبه بعد' : c.email ? `<span dir="ltr">${esc(c.email)}</span>` : '—')}
      </div>
      <div class="sa-btns">
        ${remind && !isBranch ? link(remind, 'ph-whatsapp-logo', 'تذكير بالتجديد') : ''}
        ${prospect ? link(pitchLink(c), 'ph-whatsapp-logo', 'أرسل له المنيو') + act(`transferStore(${id})`, 'ph-key', 'تسليمه لصاحبه') : ''}
        ${act(`openNotify(${id})`, 'ph-bell', 'إشعار في لوحته')}
      </div>

      <p class="sa-h">الإدارة</p>
      <div class="sa-group">
        <button type="button" class="sa-pf-row link" onclick="exportStore(${id})"><span><i class="ph-bold ph-download-simple"></i> بيانات المحل</span><i class="ph-bold ph-caret-left"></i></button>
        <button type="button" class="sa-pf-row link" onclick="renameStore(${id})"><span><i class="ph-bold ph-pencil-simple"></i> تعديل الاسم</span><i class="ph-bold ph-caret-left"></i></button>
        ${!isBranch ? `<button type="button" class="sa-pf-row link" onclick="openTypeDlg(${id})"><span><i class="ph-bold ph-storefront"></i> نوع النشاط</span><b>${esc(DMSectors.label(c))} <i class="ph-bold ph-caret-left"></i></b></button>` : ''}
        <button type="button" class="sa-pf-row link" onclick="openWhatsapp(${id})"><span><i class="ph-bold ph-whatsapp-logo"></i> ربط واتساب</span><i class="ph-bold ph-caret-left"></i></button>
        ${DMPlans.has(c, 'pager') ? `<button type="button" class="sa-pf-row link" onclick="setPagerCard(${id}, ${c.pager_card_off !== true})"><span><i class="ph-bold ph-wallet"></i> بطاقة النداء</span><b>${c.pager_card_off ? 'موقوفة' : 'شغّالة'} <i class="ph-bold ph-caret-left"></i></b></button>` : ''}
        ${!isBranch ? `<button type="button" class="sa-pf-row link" onclick="setFeatured(${id}, ${!c.is_featured})"><span><i class="ph-bold ph-star"></i> أمثلة الصفحة الرئيسية</span><b>${c.is_featured ? 'معروض' : 'مو معروض'} <i class="ph-bold ph-caret-left"></i></b></button>` : ''}
        <button type="button" class="sa-pf-row link" onclick="openAudit(${id})"><span><i class="ph-bold ph-clock-counter-clockwise"></i> سجل العمليات</span><i class="ph-bold ph-caret-left"></i></button>
      </div>
      <div class="sa-group sa-danger">
        <button type="button" class="sa-pf-row link" onclick="setActive(${id}, ${c.is_active === false})"><span>${c.is_active === false ? 'إعادة التشغيل' : 'إيقاف مؤقت'}</span></button>
        <button type="button" class="sa-pf-row link red" onclick="deleteClient(${id})"><span>${isBranch ? 'حذف الفرع' : 'حذف المتجر'}</span></button>
      </div>`;
  }

  // ─── الخصم الخاص: نسبة أو مبلغ ينقص من السعر الحقيقي لهالعميل (وفروعه)، دائم أو لمدة ───
  const discText = (d) => `${d.type === 'pct' ? `${d.value}%` : `${money(d.value)} من كل فاتورة`}${d.until ? ` لين ${date(d.until)}` : ''}`;
  window.saDiscount = async function (id) {
    const c = find(id); if (!c) return;
    const cur = DMPlans.special(c), feats = c.requested_plan ? reqFeats(c) : planFeats(c), p = c.requested_plan || plan(c);
    const months = { forever: 0, m3: 3, m6: 6, m12: 12 };
    const r = await DMDialog.form({
      title: 'الخصم الخاص', subtitle: c.name, icon: 'ph-tag', confirmText: 'حفظ',
      fields: [
        { name: 'type', label: 'نوع الخصم', type: 'choice', value: cur ? cur.type : 'pct', cols: 3, options: [
          { value: 'pct', label: 'نسبة %' }, { value: 'amount', label: 'مبلغ بالريال' }, { value: 'none', label: 'بدون خصم' }] },
        { name: 'value', label: 'قيمة الخصم', value: cur ? String(cur.value) : '', dir: 'ltr', required: true, placeholder: '10',
          showIf: (v) => v.type !== 'none',
          hint: 'النسبة من المجموع بعد خصم الجمع. والمبلغ ينقص من كل فاتورة (شهرية أو سنوية).',
          validate: (v) => { if (!String(v).trim()) return ''; const n = Number(String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); return !(n > 0) ? 'اكتب رقم أكبر من صفر' : ''; } },
        { name: 'span', label: 'المدة', type: 'choice', value: cur && cur.until ? 'keep' : 'forever', cols: cur && cur.until ? 5 : 4,
          showIf: (v) => v.type !== 'none', options: [
          ...(cur && cur.until ? [{ value: 'keep', label: `لين ${date(cur.until)}` }] : []),
          { value: 'forever', label: 'دائم' }, { value: 'm3', label: '3 شهور' }, { value: 'm6', label: '6 شهور' }, { value: 'm12', label: 'سنة' }] }
      ],
      live: (v) => {
        if (v.type === 'none') return cur ? 'يرجع لسعره الحقيقي.' : '';
        const n = Number(String(v.value || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        if (!(n > 0)) return '';
        const d = { type: v.type, value: n };
        const line = (per2) => { const before = DMPlans.price(feats, per2, branchesOf(c)).total, after = DMPlans.price(feats, per2, branchesOf(c), d).total; return `${per2 === 'year' ? 'السنوي' : 'الشهري'}: <s style="opacity:.55">${money(before)}</s> <b>${money(after)}</b>`; };
        return `${line(p)}<br><span style="opacity:.75">${line(p === 'year' ? 'month' : 'year')}</span>`;
      },
      note: 'يطلع له في لوحته وفي الطلب والفواتير ورسائل التذكير، ويشمل فروعه.'
    });
    if (!r) return;
    const body = { id, type: r.type };
    if (r.type !== 'none') {
      body.value = Number(String(r.value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
      if (r.span === 'keep') body.until = cur.until;
      else if (months[r.span]) { const u = new Date(); u.setMonth(u.getMonth() + months[r.span]); body.until = u.toISOString(); }
    }
    try {
      const res = await DM.post(A('discount'), body, true);
      const i = clients.findIndex(x => x.id === id); if (i >= 0 && res.client) clients[i] = { ...clients[i], ...res.client };
      renderAll(); window.saRefreshProfile();
      showToast(r.type === 'none' ? 'انشال الخصم الخاص' : 'انحفظ الخصم الخاص');
    } catch (e) { showToast(`ما انحفظ: ${e.message}`, true); }
  };

  // ─── عرض سعر: الخدمات والمدة وخصم خاص اختياري (الخصم الكلي ما يتعدى 20%)، بالبريد وواتساب ───
  function quoteTotal(c, feats, period, pct) {
    const pr = DMPlans.price(feats, period, branchesOf(c), c);
    const f = DMPlans.clean(feats), base = f.reduce((a, k) => a + DMPlans.FEATURES[k][period], 0);
    const full = period === 'month' ? base : base * 12 / 11, net = base - pr.discount;
    const extra = Math.max(0, Math.min(Math.round(net * Math.min(20, pct) / 100), net - Math.ceil(full * 0.8)));
    return { pr, extra, total: pr.total - extra, off: base ? Math.round((1 - (net - extra) / full) * 100) : 0 };
  }
  window.saQuote = async function (id) {
    const c = find(id); if (!c) return;
    const base = reqFeats(c).length ? reqFeats(c) : planFeats(c);
    const r = await DMDialog.form({
      title: 'عرض سعر', subtitle: `${c.name} · ${c.email || 'بدون بريد'}`, icon: 'ph-file-text', confirmText: c.email ? 'أرسل العرض' : 'جهّز رسالة واتساب',
      fields: [
        { name: 'features', label: 'الخدمات', type: 'multi', value: base, required: true, requiredText: 'اختر خدمة وحدة على الأقل',
          options: DMPlans.ORDER.map(k => ({ value: k, label: DMPlans.FEATURES[k].name, icon: DMPlans.FEATURES[k].icon })) },
        { name: 'period', label: 'المدة', type: 'choice', value: c.requested_plan || c.subscription_plan || 'year', options: [
          { value: 'year', label: 'سنوي', icon: 'ph-calendar' }, { value: 'month', label: 'شهري', icon: 'ph-calendar-blank' }] },
        { name: 'extra', label: 'خصم خاص (اختياري)', type: 'choice', value: '0', cols: 5, options: ['0', '5', '10', '15', '20'].map(v => ({ value: v, label: v === '0' ? 'بدون' : `${v}%` })) },
        { name: 'note', label: 'ملاحظة في العرض (اختياري)', value: '', maxlength: 300, multiline: true }
      ],
      live: (v) => {
        const f = DMPlans.clean(v.features); if (!f.length) return '';
        const q = quoteTotal(c, f, v.period, Number(v.extra) || 0);
        return `<b>${money(q.total)} ${per(v.period)}</b>${q.extra ? ` بعد خصم خاص ${money(q.extra)}` : ''}<br><span style="opacity:.7">الخصم الكلي ${q.off}% (الحد 20%)${Number(v.extra) && q.extra < Math.round((q.pr.total) * Number(v.extra) / 100) ? '، والخصم الخاص انقص عشان ما يتعدى الحد' : ''}</span>`;
      },
      note: 'العرض صالح 14 يوماً، وما يتغيّر اشتراكه لين تفعّله بعد الدفع.'
    });
    if (!r) return;
    const feats = DMPlans.clean(r.features), q = quoteTotal(c, feats, r.period, Number(r.extra) || 0);
    let sentTo = '';
    if (c.email) {
      try { const res = await DM.post(A('send-invoice'), { id, period: r.period, features: feats, kind: 'quote', extra_pct: Number(r.extra) || 0, note: r.note }, true); if (res.invoice && res.invoice.sent) sentTo = res.invoice.to; }
      catch (e) { return showToast(`تعذر إرسال العرض: ${e.message}`, true); }
    }
    const phone = waPhone(c.phone);
    const msg = `مرحباً، معك فريق DEV MENU\nعرض سعر لـ "${c.name}":\n${featNames(feats)} (${r.period === 'month' ? 'شهري' : 'سنوي'})\nالمجموع: ${q.total} ر.س${q.extra ? ` (بعد خصم خاص ${q.extra} ر.س)` : ''}\nالعرض صالح 14 يوماً.${r.note ? `\n${r.note}` : ''}`;
    const go = await DMDialog.confirm({ title: sentTo ? 'انرسل العرض' : 'العرض جاهز', tone: '', icon: 'ph-file-text',
      message: `${sentTo ? `انرسل على ${sentTo}.\n\n` : ''}المجموع: ${money(q.total)} ${per(r.period)}`, confirmText: phone ? 'أرسله واتساب' : 'تم', cancelText: 'إغلاق' });
    if (go && phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  // ─── «المزيد» في الجوال: السجل والإشعارات واللغة والخروج ───
  window.saMore = function () {
    let el = document.getElementById('sa-sheet');
    if (!el) {
      el = document.createElement('div'); el.id = 'sa-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'المزيد');
      const cell = (fn, icon, title, sub) => `<button type="button" class="sa-cell-link" onclick="${fn}"><span class="sa-cell-ic"><i class="ph-bold ${icon}"></i></span><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><i class="ph-bold ph-caret-left"></i></button>`;
      el.innerHTML = `<div class="sa-sheet-box"><span class="sa-grab"></span>
        <div class="sa-group">${cell("saSheet(false); showTab('log')", 'ph-clock-counter-clockwise', 'السجل', 'كل عملية: مين سوّاها ومتى')}${cell("saSheet(false); showTab('notify')", 'ph-megaphone', 'الإشعارات', 'رسالة لكل المشتركين')}</div>
        <div class="sa-group">${cell("saSheet(false); document.querySelector('.sa-nav-foot [data-lang-toggle]').click()", 'ph-translate', 'English / عربي', '')}${cell('logout()', 'ph-sign-out', 'تسجيل الخروج', esc(document.getElementById('admin-email').textContent || ''))}</div>
      </div>`;
      el.addEventListener('click', (e) => { if (e.target === el) saSheet(false); });
      document.body.appendChild(el);
    }
    saSheet(true);
  };
  // الجوال: اسم القسم يطلع في الشريط العلوي لما يختفي العنوان الكبير (مثل تطبيقات أبل)
  const top = document.querySelector('.sa-top');
  if (top) { const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 56); window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
  window.saSheet = (on) => { const el = document.getElementById('sa-sheet'); if (el) el.classList.toggle('on', on); };

  // الضغط على صف محل يفتح ملفه (وأي تحديث للقائمة يحدّث الملف المفتوح)
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-profile]');
    if (r && !e.target.closest('a, button:not([data-profile])')) { e.preventDefault(); openProfile(Number(r.dataset.profile)); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && profileId != null) closeProfile();
    if (e.key === 'Escape') saSheet(false);
    const r = e.target.closest && e.target.closest('.sa-row[data-profile]');
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openProfile(Number(r.dataset.profile)); }
  });
  if (typeof window.renderStores === 'function') { const f = window.renderStores; window.renderStores = function () { const out = f.apply(this, arguments); window.saRefreshProfile(); return out; }; }
})();
