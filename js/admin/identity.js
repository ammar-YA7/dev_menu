// =====================================================================
// DEV MENU — لوحة التحكم: هوية المنشأة: صفحة الروابط، QR، واتساب، معلومات المنشأة، تطبيقات التوصيل، الرابط المختصر، المظهر، أرقام الطلبات، شكل الأطباق، السعرات
// (ملفات js/admin/ تتحمّل بالترتيب، وتتشارك نفس المتغيرات العامة)
// =====================================================================
  // ─── ترتيب أقسام صفحة الروابط: سحب أو أسهم، إخفاء، تعديل، وحفظ تلقائي ───
  const LINKS_SECTIONS = {
    services: ['خدماتك', 'المنيو، البيجر، بطاقة الولاء، قائمة الانتظار', 'ph-squares-four'],
    branches: ['فروعنا', 'كل فروعك: المنيو والموقع لكل فرع', 'ph-storefront'],
    contact:  ['الطلبات والتواصل', 'أرقام الطلبات وواتساب', 'ph-phone'],
    delivery: ['تطبيقات التوصيل', 'روابط تطبيقات التوصيل', 'ph-moped'],
    social:   ['تابعنا', 'انستجرام، تيك توك، سناب شات، الموقع', 'ph-instagram-logo'],
    custom:   ['روابط أخرى', 'الروابط اللي أضفتها بنفسك', 'ph-link-simple'],
    location: ['زورونا', 'موقعك على الخريطة', 'ph-map-pin']
  };
  // هل القسم فيه روابط تظهر في الصفحة؟
  const LINKS_FILLED = {
    services: () => true,
    branches: () => branches.length > 1,
    contact:  () => (client.order_numbers || []).some(n => n && String(n.phone || '').replace(/\D/g, '').length >= 9) || !!String(client.whatsapp_number || '').replace(/\D/g, ''),
    delivery: () => (client.delivery_apps || []).some(d => d && d.url),
    social:   () => ['instagram_url', 'tiktok_url', 'snapchat_url', 'website_url'].some(k => client[k]),
    custom:   () => (client.custom_links || []).some(l => l && l.title && l.url),
    location: () => !!client.location_url
  };
  // وين يعدّل روابط كل قسم (أول بطاقة ظاهرة)
  const LINKS_EDITORS = { contact: ['order-numbers-list', 'social-whatsapp'], delivery: ['delivery-picker'], social: ['social-tiktok'], custom: ['custom-links-list'], location: ['info-location'] };
  let linksOrder = [], linksHidden = new Set(), linksDrag = null, linksSaveTimer = null;
  function linksEditorCard(k) {
    for (const id of LINKS_EDITORS[k] || []) {
      const el = document.getElementById(id), card = el && (el.closest('.pro-card') || el);
      if (card && !card.closest('.hidden:not([data-page])')) return card;   // البطاقة ظاهرة (مو مخفية لأن الخدمة مقفلة)
    }
    return null;
  }
  function renderLinksOrder(fromClient = true) {
    if (fromClient) {
      const saved = Array.isArray(client.links_order) ? client.links_order.filter(k => LINKS_SECTIONS[k]) : [];
      linksOrder = [...new Set([...saved, ...Object.keys(LINKS_SECTIONS)])];
      linksHidden = new Set((client.links_hidden || []).filter(k => LINKS_SECTIONS[k]));
    }
    const last = linksOrder.length - 1;
    const iconBtn = (attrs, icon, label, extra = '') => `<button type="button" ${attrs} aria-label="${label}" title="${label}" class="w-8 h-8 shrink-0 rounded-lg bg-white border border-brand/20 hover:bg-brand/10 text-ink transition disabled:opacity-30 disabled:hover:bg-white ${extra}"><i class="ph-bold ${icon}"></i></button>`;
    document.getElementById('links-order').innerHTML = linksOrder.map((k, i) => {
      const [name, hint, icon] = LINKS_SECTIONS[k];
      const hidden = linksHidden.has(k), empty = !LINKS_FILLED[k]();
      const state = hidden ? '<span class="text-[11px] font-bold text-ink bg-brand/10 px-1.5 py-0.5 rounded">مخفي</span>'
        : empty ? '<span class="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">فاضي، ما يظهر</span>' : '';
      const edit = linksEditorCard(k) ? `<button type="button" onclick="editLinksSection('${k}')" class="h-8 shrink-0 px-2.5 rounded-lg bg-brand/10 border border-brand/45 hover:bg-brand/10 text-ink text-[11px] font-bold transition"><i class="ph-bold ph-pencil-simple"></i><span> ${empty ? 'أضف روابط' : 'تعديل'}</span></button>` : '';
      return `<li draggable="true" data-i="${i}" class="links-row flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white rounded-xl border border-brand/15 px-2.5 py-2 transition ${hidden || empty ? 'opacity-60' : ''}">
        <i class="ph-bold ph-dots-six-vertical text-ink cursor-grab hidden sm:inline" aria-hidden="true"></i>
        <span class="w-4 text-[11px] font-bold text-ink">${i + 1}</span>
        <i class="ph-bold ${icon} text-ink"></i>
        <span class="flex-1 min-w-0"><span class="flex flex-wrap items-center gap-1.5"><b class="text-xs text-ink">${name}</b>${state}</span><span class="block text-[11px] text-ink truncate">${hint}</span></span>
        <span class="flex items-center gap-1.5 w-full sm:w-auto ps-6 sm:ps-0">
        ${edit}
        ${iconBtn(`onclick="toggleLinksSection('${k}')"`, hidden ? 'ph-eye-slash' : 'ph-eye', hidden ? 'إظهار في الصفحة' : 'إخفاء من الصفحة', hidden ? '!bg-brand/10' : '')}
        ${iconBtn(`onclick="moveLinksSection(${i}, -1)" ${i === 0 ? 'disabled' : ''}`, 'ph-arrow-up', 'لفوق')}
        ${iconBtn(`onclick="moveLinksSection(${i}, 1)" ${i === last ? 'disabled' : ''}`, 'ph-arrow-down', 'لتحت')}
        </span>
      </li>`;
    }).join('');
  }
  function linksOrderStatus(html) { document.getElementById('links-order-status').innerHTML = html; }
  function queueLinksSave() {
    renderLinksOrder(false);
    linksOrderStatus('<span class="text-ink"><i class="ph-bold ph-spinner-gap ph-spin"></i> جاري الحفظ…</span>');
    clearTimeout(linksSaveTimer);
    linksSaveTimer = setTimeout(async () => {
      const isDefault = linksOrder.join() === Object.keys(LINKS_SECTIONS).join();
      const ok = await updateClient({ links_order: isDefault ? null : linksOrder, links_hidden: linksHidden.size ? [...linksHidden] : null });
      linksOrderStatus(ok ? '<span class="text-emerald-700"><i class="ph-bold ph-check-circle"></i> تم الحفظ</span>' : '<span class="text-red-600"><i class="ph-bold ph-warning-circle"></i> تعذر الحفظ</span>');
      if (!ok) showToast('تعذر حفظ ترتيب صفحة الروابط', true);
    }, 500);
  }
  function moveLinksSection(i, d) {
    const j = i + d;
    if (j < 0 || j >= linksOrder.length) return;
    [linksOrder[i], linksOrder[j]] = [linksOrder[j], linksOrder[i]];
    queueLinksSave();
  }
  function toggleLinksSection(k) { linksHidden.has(k) ? linksHidden.delete(k) : linksHidden.add(k); queueLinksSave(); }
  function resetLinksOrder() { linksOrder = Object.keys(LINKS_SECTIONS); linksHidden.clear(); queueLinksSave(); }
  function editLinksSection(k) {
    const card = linksEditorCard(k);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('ring-2', 'ring-brand');
    setTimeout(() => card.classList.remove('ring-2', 'ring-brand'), 1800);
  }
  // من بطاقة صفحة الروابط في الرئيسية: يفتح الخلفية والترتيب على طول
  function openLinksSettings() {
    if (location.hash === '#settings') showPage('settings'); else location.hash = 'settings';
    setTimeout(() => document.getElementById('links-bg-card').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }
  (() => {
    const list = document.getElementById('links-order');
    const rowOf = e => e.target.closest && e.target.closest('.links-row');
    list.addEventListener('dragstart', e => { const r = rowOf(e); if (!r) return; linksDrag = +r.dataset.i; e.dataTransfer.effectAllowed = 'move'; r.classList.add('opacity-40'); });
    list.addEventListener('dragover', e => { const r = rowOf(e); if (r == null || linksDrag == null) return; e.preventDefault(); list.querySelectorAll('.links-row').forEach(x => x.classList.toggle('!border-brand', x === r)); });
    list.addEventListener('drop', e => {
      const r = rowOf(e); if (!r || linksDrag == null) return; e.preventDefault();
      const to = +r.dataset.i, from = linksDrag; linksDrag = null;
      if (to === from) return renderLinksOrder(false);
      linksOrder.splice(to, 0, linksOrder.splice(from, 1)[0]);
      queueLinksSave();
    });
    list.addEventListener('dragend', () => { linksDrag = null; renderLinksOrder(false); });
  })();
  async function resetLinksBg() {
    if (await updateClient({ links_bg_image_url: null, links_bg_video_url: null })) { renderBgPreview(); showToast('صفحة الروابط رجعت تاخذ خلفية المنيو'); }
  }
  async function uploadMedia(type) {
    const cfg = {
      logo:     { input: 'logo-file',     kind: 'image', maxDim: 800,  payload: url => ({ logo_url: url }), done: 'تم تحديث الشعار' },
      bg_image: { input: 'bg-img-file',   kind: 'image', maxDim: 1920, payload: url => ({ bg_image_url: url, bg_video_url: null }), done: 'تم رفع الخلفية' },
      bg_video: { input: 'bg-video-file', kind: 'video', maxDim: 0,    payload: url => ({ bg_video_url: url, bg_image_url: null }), done: 'تم رفع الفيديو' },
      links_bg_image: { input: 'links-bg-img-file',   kind: 'image', maxDim: 1920, payload: url => ({ links_bg_image_url: url, links_bg_video_url: null }), done: 'تم رفع الخلفية', where: 'صفحة الروابط' },
      links_bg_video: { input: 'links-bg-video-file', kind: 'video', maxDim: 0,    payload: url => ({ links_bg_video_url: url, links_bg_image_url: null }), done: 'تم رفع الفيديو', where: 'صفحة الروابط' }
    }[type];
    const fileInput = document.getElementById(cfg.input);
    const file = fileInput.files[0];
    const problem = validateFile(file, cfg.kind);
    if (problem) return showToast(problem, true);

    const ui = uploadBtn(type);
    ui.busy(cfg.kind === 'image' ? 'جاري تجهيز الصورة…' : 'جاري تجهيز الفيديو…');
    const url = await uploadFile(file, type, cfg.maxDim, (pct) => ui.progress(pct));
    if (!url) { ui.fail(); return showToast(`فشل رفع الملف: ${lastUploadError}`, true); }

    ui.busy('جاري الحفظ…');
    if (await updateClient(cfg.payload(url))) {
      if (type === 'logo') setLogo(url);
      fileInput.value = '';
      renderBgPreview();
      ui.done(cfg.done);
      showToast(`${cfg.done}، ويظهر في ${cfg.where || (type === 'logo' || !(client.links_bg_image_url || client.links_bg_video_url) ? 'المنيو وصفحة الروابط' : 'المنيو')}`);
    } else { ui.fail(); showToast('تم رفع الملف لكن تعذر حفظه في المتجر', true); }
  }

  // ─── بطاقة QR جاهزة للطباعة ───
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFittedText(ctx, text, x, y, maxWidth, weight, size, family) {
    let s = size;
    do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxWidth && s > 20);
    ctx.fillText(text, x, y);
  }

  // ذيل بطاقات الطباعة: شعار ديف منيو المفرغ بدل كلمة DEV MENU
  async function drawBrandFooter(ctx, cx, y, h = 70) {
    const mark = await loadImage('/images/logo-mark.png').catch(() => null);
    if (mark) { const w = mark.width * (h / mark.height); ctx.drawImage(mark, cx - w / 2, y, w, h); return; }
    ctx.save(); ctx.direction = 'ltr'; ctx.fillStyle = '#233d2c'; ctx.font = '700 26px "IBM Plex Sans Arabic", sans-serif'; ctx.fillText('DEV MENU', cx, y + h / 2); ctx.restore();
  }

  async function downloadQrCard(opts = {}) {
    const btn = opts.button || document.getElementById('qr-download-btn');
    btn.disabled = true;
    try {
      const W = 1200, H = 1700, cx = W / 2;
      const FONT = '"IBM Plex Sans Arabic", Tahoma, Arial, sans-serif';
      try { await Promise.all([document.fonts.load(`700 64px "IBM Plex Sans Arabic"`), document.fonts.load(`600 36px "IBM Plex Sans Arabic"`)]); } catch {}

      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#233d2c';   // أخضر الشعار
      ctx.fillRect(0, 0, W, 430);

      const logoUrl = safeUrl(client.logo_url);
      const logo = logoUrl ? await loadImage(logoUrl).catch(() => null) : null;
      if (logo) {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, 170, 104, 0, Math.PI * 2); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, 170, 96, 0, Math.PI * 2); ctx.clip();
        const s = Math.max(192 / logo.width, 192 / logo.height);
        ctx.drawImage(logo, cx - (logo.width * s) / 2, 170 - (logo.height * s) / 2, logo.width * s, logo.height * s);
        ctx.restore();
      }

      ctx.direction = 'rtl';
      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, client.name || 'المنيو', cx, logo ? 355 : 250, W - 160, 800, 66, FONT);

      const tmp = document.createElement('div');
      new QRCode(tmp, { text: opts.url || qrUrl(), width: 740, height: 740, correctLevel: QRCode.CorrectLevel.H });
      const qr = tmp.querySelector('canvas');
      const qx = (W - 740) / 2, qy = 540;
      ctx.fillStyle = '#e2e8f0';   // إطار رمادي رفيع حول الرمز
      roundRectPath(ctx, qx - 40, qy - 40, 820, 820, 48); ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, qx - 37, qy - 37, 814, 814, 45); ctx.fill();
      ctx.drawImage(qr, qx, qy, 740, 740);

      ctx.fillStyle = '#233d2c';
      drawFittedText(ctx, opts.caption || 'امسح الرمز لعرض المنيو', cx, 1470, W - 160, 800, 58, FONT);
      ctx.direction = 'ltr';
      ctx.fillStyle = '#64748b';
      ctx.font = `600 36px ${FONT}`;
      ctx.fillText(opts.captionEn || 'Scan to view our menu', cx, 1535);
      await drawBrandFooter(ctx, cx, 1590, 72);

      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${opts.filePrefix || 'qr'}-${client.client_slug}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      showToast('تم تحميل بطاقة QR، اطبعها بمقاس A6 أو A5');
    } catch (e) {
      console.error(e);
      showToast('تعذر إنشاء بطاقة الطباعة', true);
    } finally {
      btn.disabled = false;
    }
  }

  // ─── رقم واتساب الطلبات ───
  // الخانة تعرض الرقم المحلي، ورمز الدولة في القائمة جنبها
  function setWaInput(intl) {
    const { code, local } = intl ? DM.splitPhone(intl) : { code: '966', local: '' };
    const cc = document.getElementById('social-whatsapp-cc');
    cc.innerHTML = DM.countryOptions(code);
    document.getElementById('social-whatsapp').value = local;
    document.getElementById('social-whatsapp').placeholder = code === '966' ? '05xxxxxxxx' : 'رقم الواتساب';
  }
  // رقم صالح: جوال سعودي 9665xxxxxxxx، أو رقم دولي كامل (11–15 رقم)
  function isValidWa(n) {
    const d = String(n || '');
    if (d.startsWith('966')) return /^9665\d{8}$/.test(d);
    return /^[1-9]\d{10,14}$/.test(d);
  }
  const prettyWa = (d) => d.startsWith('966') ? `0${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : `+${d}`;

  function renderWaOrderState() {
    const cb = document.getElementById('info-wa-orders');
    const status = document.getElementById('wa-orders-status');
    const label = document.getElementById('wa-orders-label');
    const wa = String(client.whatsapp_number || '');
    const ok = isValidWa(wa);

    cb.disabled = !ok;
    if (!ok) cb.checked = false;
    label.classList.toggle('opacity-50', !ok);

    status.innerHTML = ok
      ? `<div class="flex flex-wrap items-center justify-between gap-2 bg-green-500/10 border border-green-500/25 rounded-lg px-3 py-2">
           <span class="text-green-800">الطلبات تصل إلى: <b dir="ltr">${esc(prettyWa(wa))}</b></span>
           <a href="https://wa.me/${esc(wa)}?text=${encodeURIComponent('رسالة تجريبية من DEV MENU ✅')}" target="_blank" rel="noopener"
              class="bg-green-600 hover:bg-green-500 text-ink font-bold px-2.5 py-1 rounded-md text-[11px] transition">
             <i class="ph-bold ph-whatsapp-logo"></i> اختبر الرقم
           </a>
         </div>
         <p class="text-[11px] text-ink mt-1.5">اضغط "اختبر الرقم": إذا فتحت محادثة في واتساب فالرقم شغال. وإذا ظهرت رسالة إن الرقم غير صالح، صحّحه في روابط التواصل.</p>`
      : `<div class="flex flex-wrap items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
           <span class="text-amber-800"><i class="ph-bold ph-info"></i> لتفعيل الطلبات، أضف رقم واتساب المنشأة واحفظه أولاً.</span>
           <button type="button" onclick="location.hash='settings'; setTimeout(() => { const w = document.getElementById('social-whatsapp'); w.scrollIntoView({behavior:'smooth', block:'center'}); w.focus({ preventScroll: true }); }, 150)"
                   class="bg-brand/10 hover:bg-brand/15 text-ink font-bold px-2.5 py-1 rounded-md text-[11px] border border-brand/25 transition">إضافة الرقم</button>
         </div>`;
  }

  // ─── الطلب عبر واتساب: يتحفظ على طول ───
  async function saveWaOrders(box) {
    if (box.checked && !isValidWa(client.whatsapp_number)) { box.checked = false; renderWaOrderState(); return showToast('أضف رقم واتساب صحيح في هوية المنشأة ← حساباتك في التواصل أولاً', true); }
    if (await updateClient({ whatsapp_orders: box.checked })) { showToast(box.checked ? 'صارت الطلبات توصل واتساب المحل' : 'تم إيقاف الطلب عبر واتساب'); renderOrderMode(); }
    else { box.checked = !box.checked; showToast('تعذر حفظ الإعداد', true); }
  }
  // ─── معلومات المنشأة ───
  async function updateRestaurantInfo() {
    const hours = document.getElementById('info-hours').value.trim();
    const loc = document.getElementById('info-location').value.trim();
    if (loc && !safeUrl(loc)) return showToast('رابط الموقع غير صحيح، يجب أن يبدأ بـ https://', true);
    const review = document.getElementById('info-review').value.trim();
    if (review && !/^https:\/\/(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl|goo\.gl|maps\.google\.com|g\.co)\//i.test(review)) return showToast('رابط التقييم لازم يكون من قوقل، مثل g.page/r/.../review', true);
    if (await updateClient({ opening_hours: hours, location_url: loc, google_review_url: review })) showToast('تم حفظ معلومات المنشأة');
    else showToast('تعذر حفظ معلومات المنشأة', true);
  }

  // ─── تطبيقات التوصيل ───
  // الشعار يُجلب من موقع التطبيق نفسه (أيقونة الموقع الرسمية)
  const DELIVERY_APPS = {
    hungerstation: { name: 'هنقرستيشن', domain: 'hungerstation.com' },
    jahez:         { name: 'جاهز',       domain: 'jahez.net' },
    keeta:         { name: 'كيتا',       domain: 'keeta.com' },
    toyou:         { name: 'تويو',       domain: 'toyou.io' },
    mrsool:        { name: 'مرسول',      domain: 'mrsool.co' },
    thechefz:      { name: 'ذا شفز',     domain: 'thechefz.co' },
    careem:        { name: 'كريم',       domain: 'careem.com' },
    shgardi:       { name: 'شقردي',      domain: 'shgardi.app' },
    other:         { name: 'تطبيق آخر',  domain: '' }
  };
  const LOCAL_LOGOS = { 'jahez.net': '/images/delivery/jahez.png', 'keeta.com': '/images/delivery/keeta.png' };   // شعار جاهز وكيتا من Google ما يطلع
  const favicon = (domain) => domain ? LOCAL_LOGOS[domain] || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : '';
  const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
  let deliveryApps = [];

  function appLogo(item, size = 'w-8 h-8') {
    const meta = DELIVERY_APPS[item.app] || DELIVERY_APPS.other;
    const src = favicon(meta.domain || hostOf(item.url));
    const letter = ((item.app === 'other' ? item.name : meta.name) || '').replace(/[^\p{L}\p{N}]/gu, '').charAt(0) || '•';
    // إذا ما تحمّل الشعار نعرض أول حرف من الاسم
    return src
      ? `<span class="${size} rounded-lg bg-white border border-brand/15 flex items-center justify-center overflow-hidden shrink-0 text-xs font-black text-ink"><img src="${esc(src)}" alt="" data-l="${esc(letter)}" class="w-3/4 h-3/4 object-contain" onerror="this.parentNode.textContent=this.dataset.l"></span>`
      : `<span class="${size} rounded-lg bg-brand/10 flex items-center justify-center shrink-0 text-xs font-black text-ink">${esc(letter)}</span>`;
  }

  function renderDeliveryPicker() {
    const chosen = new Set(deliveryApps.map(d => d.app));
    document.getElementById('delivery-picker').innerHTML = Object.entries(DELIVERY_APPS).map(([key, meta]) => {
      const on = key !== 'other' && chosen.has(key);
      return `
        <button type="button" onclick="toggleDeliveryApp('${key}')"
          class="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold transition ${on ? 'bg-brand text-cream border-brand' : 'bg-brand/5 border-brand/15 text-ink hover:bg-brand/10'}">
          ${appLogo({ app: key, url: '' })}
          <span class="truncate max-w-full">${meta.name}</span>
          ${key === 'other' ? '<span class="text-[10px] opacity-60">+ إضافة</span>' : on ? '<i class="ph-bold ph-check text-[10px]"></i>' : ''}
        </button>`;
    }).join('');

    document.getElementById('delivery-list').innerHTML = deliveryApps.length ? deliveryApps.map((d, i) => `
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 bg-brand/5 border border-brand/15 rounded-xl p-2.5">
        <div class="flex items-center gap-2 sm:w-40 shrink-0">
          ${appLogo(d)}
          ${d.app === 'other'
            ? `<input type="text" maxlength="30" value="${esc(d.name || '')}" oninput="deliveryApps[${i}].name=this.value" placeholder="اسم التطبيق" class="input-pro !py-1.5 text-xs">`
            : `<b class="text-xs text-ink">${DELIVERY_APPS[d.app].name}</b>`}
        </div>
        <div class="flex items-center gap-2 flex-1">
          <input type="url" dir="ltr" value="${esc(d.url || '')}" oninput="deliveryApps[${i}].url=this.value.trim()" placeholder="رابط صفحة منشأتك في التطبيق https://..." class="input-pro !py-1.5 text-xs flex-1">
          <button type="button" onclick="removeDeliveryApp(${i})" aria-label="إزالة" class="shrink-0 w-9 h-9 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20"><i class="ph-bold ph-x"></i></button>
        </div>
      </div>`).join('')
      : '<p class="text-[11px] text-ink text-center py-2">ما اخترت أي تطبيق توصيل بعد.</p>';
  }

  function toggleDeliveryApp(key) {
    if (key === 'other') {
      deliveryApps.push({ app: 'other', name: '', url: '' });
    } else {
      const i = deliveryApps.findIndex(d => d.app === key);
      if (i >= 0) deliveryApps.splice(i, 1);
      else deliveryApps.push({ app: key, url: '' });
    }
    renderDeliveryPicker();
    // التركيز على خانة الرابط الجديدة
    const inputs = document.querySelectorAll('#delivery-list input[type="url"]');
    if (inputs.length && deliveryApps.length && !deliveryApps[deliveryApps.length - 1].url) inputs[inputs.length - 1].focus();
  }
  function removeDeliveryApp(i) { deliveryApps.splice(i, 1); renderDeliveryPicker(); }

  async function saveDeliveryApps() {
    for (const d of deliveryApps) {
      const label = d.app === 'other' ? (d.name || 'التطبيق') : DELIVERY_APPS[d.app].name;
      if (d.app === 'other' && !String(d.name || '').trim()) return showToast('اكتب اسم التطبيق الإضافي', true);
      if (!safeUrl(d.url)) return showToast(`أضف رابط صحيح لـ ${label} (يبدأ بـ https://)`, true);
    }
    if (await updateClient({ delivery_apps: deliveryApps.map(d => ({ ...d })) })) {
      deliveryApps = (client.delivery_apps || []).map(d => ({ ...d }));
      renderDeliveryPicker();
      showToast(deliveryApps.length ? 'تم الحفظ، وتظهر التطبيقات في المنيو' : 'تمت إزالة تطبيقات التوصيل من المنيو');
    } else showToast('تعذر حفظ تطبيقات التوصيل', true);
  }

  // ─── رابط المتجر المختصر (slug.devmenu.digital) ───
  const SLUG_OK = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
  function copyShortLink() {
    navigator.clipboard.writeText(shortUrl())
      .then(() => showToast('تم نسخ رابط متجرك'))
      .catch(() => showToast('تعذر النسخ، انسخ الرابط يدوياً', true));
  }
  async function saveSlug() {
    const input = document.getElementById('slug-input');
    const slug = input.value.trim().toLowerCase();
    if (slug === client.client_slug) return showToast('هذا هو رابطك الحالي');
    if (!SLUG_OK.test(slug) || slug.includes('--')) return showToast('الرابط من 3 إلى 30 حرف: حروف إنجليزية صغيرة وأرقام وشرطة في الوسط فقط', true);
    const btn = document.getElementById('slug-save-btn');
    btn.disabled = true;
    try {
      const res = await api('update-slug', { slug });
      Object.assign(client, res.store);
      // المدير العام يدير المتجر عبر ?client= فلازم نحدّث الرابط للاسم الجديد
      if (requestedSlug) return location.replace(`admin.html?client=${encodeURIComponent(client.client_slug)}#settings`);
      fillClientUI();
      showToast(`صار رابطك: ${client.client_slug}.devmenu.digital`);
    } catch (e) {
      showToast('تعذر تغيير الرابط', true);
    } finally {
      btn.disabled = false;
    }
  }

  // ─── مظهر المنيو: الثيم ولون الهوية ───
  let themeDraft = { theme: 'dark', accent: null };

  function renderAppearance(reset = true) {
    if (reset) themeDraft = { theme: DMTheme.THEMES[client.theme] ? client.theme : 'dark', accent: DMTheme.isHex(client.accent_color) ? client.accent_color : null };
    document.getElementById('theme-picker').innerHTML = Object.entries(DMTheme.THEMES).map(([key, t]) => {
      const v = DMTheme.resolve(key, themeDraft.accent).vars;
      const on = key === themeDraft.theme;
      const dish = (name, price) => `
        <div class="rounded-lg px-2 py-1.5 flex items-center justify-between" style="background:${esc(v.surface)};border:1px solid ${esc(v['surface-line'])}">
          <span class="text-[11px] font-bold" style="color:${esc(v.fg)}">${name}</span>
          <span class="text-[11px] font-black" style="color:${esc(v.price)}">${price}</span>
        </div>`;
      return `
        <button type="button" onclick="pickTheme('${key}')" aria-pressed="${on}"
          class="text-right rounded-2xl p-1.5 border-2 transition ${on ? 'border-brand bg-brand/5' : 'border-transparent hover:border-brand/20'}">
          <div class="rounded-xl p-2.5 space-y-1.5 shadow-inner" style="background:${esc(v.bg)}">
            <div class="flex gap-1">
              <span class="text-[10px] font-black rounded-md px-2 py-0.5" style="background:${esc(v.accent)};color:${esc(v['accent-fg'])}">مشروبات</span>
              <span class="text-[10px] font-bold rounded-md px-2 py-0.5" style="background:${esc(v.chip)};color:${esc(v.fg)}">حلى</span>
            </div>
            <p class="text-[11px] font-bold pb-0.5" style="color:${esc(v.fg)};border-bottom:1px solid ${esc(v['sec-line'])}">القهوة</p>
            ${dish('لاتيه', '18')}
            ${dish('كابتشينو', '16')}
          </div>
          <p class="text-[11px] font-bold text-ink mt-1.5 px-1 flex items-center gap-1.5">${on ? '<i class="ph-bold ph-check-circle text-brand"></i>' : ''} ${esc(t.name)}</p>
        </button>`;
    }).join('');

    const accent = themeDraft.accent;
    document.getElementById('accent-input').value = accent || DMTheme.resolve(themeDraft.theme).vars.accent;
    document.getElementById('accent-label').textContent = accent ? accent.toUpperCase() : 'لون الثيم';
    document.getElementById('accent-presets').innerHTML = DMTheme.PRESETS.map(c => `
      <button type="button" onclick="pickAccent('${c}')" aria-label="${c}" title="${c}"
        class="w-9 h-9 rounded-full border-2 transition ${accent === c ? 'border-ink scale-110' : 'border-white shadow'}" style="background:${c}"></button>`).join('');
    document.getElementById('appearance-preview').href = menuUrl();
    document.getElementById('appearance-links-preview').href = linksUrl();
    // بدون باقة المنيو: المعاينة لصفحة الروابط بس
    document.getElementById('appearance-preview').classList.toggle('hidden', featureLocked('menu'));
  }
  function pickTheme(key) { themeDraft.theme = key; renderAppearance(false); }
  function pickAccent(c) { themeDraft.accent = DMTheme.isHex(c) ? c.toLowerCase() : null; renderAppearance(false); }

  async function saveAppearance() {
    if (await updateClient({ theme: themeDraft.theme, accent_color: themeDraft.accent })) {
      renderAppearance();
      showToast('تم حفظ المظهر، ويظهر في المنيو وصفحة الروابط');
    } else showToast('تعذر حفظ المظهر', true);
  }

  // ─── أرقام الطلبات والروابط المخصصة (نفس أسلوب تطبيقات التوصيل) ───
  const MAX_ORDER_NUMBERS = 5, MAX_CUSTOM_LINKS = 30;
  let orderNumbers = [], customLinks = [];
  const cleanPhone = (v) => String(v || '').replace(/[\s\-()]/g, '');
  const validPhone = (v) => /^\+?\d{9,15}$/.test(cleanPhone(v));

  // أزرار الترتيب والحذف لكل صف
  function rowTools(listName, i, total) {
    const btn = 'shrink-0 w-9 h-9 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed';
    return `
      <button type="button" onclick="moveItem('${listName}', ${i}, -1)" ${i === 0 ? 'disabled' : ''} aria-label="لأعلى" class="${btn} bg-white border-brand/20 text-ink hover:bg-brand/10"><i class="ph-bold ph-arrow-up text-[11px]"></i></button>
      <button type="button" onclick="moveItem('${listName}', ${i}, 1)" ${i === total - 1 ? 'disabled' : ''} aria-label="لأسفل" class="${btn} bg-white border-brand/20 text-ink hover:bg-brand/10"><i class="ph-bold ph-arrow-down text-[11px]"></i></button>
      <button type="button" onclick="removeItem('${listName}', ${i})" aria-label="إزالة" class="${btn} bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"><i class="ph-bold ph-x"></i></button>`;
  }
  const LISTS = { orderNumbers: () => orderNumbers, customLinks: () => customLinks };
  const RENDER = { orderNumbers: () => renderOrderNumbers(), customLinks: () => renderCustomLinks() };
  function moveItem(name, i, d) {
    const list = LISTS[name](), j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    RENDER[name]();
  }
  function removeItem(name, i) { LISTS[name]().splice(i, 1); RENDER[name](); }

  function renderOrderNumbers() {
    document.getElementById('order-numbers-list').innerHTML = orderNumbers.length ? orderNumbers.map((n, i) => `
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 bg-brand/5 border border-brand/15 rounded-xl p-2.5">
        <input type="text" maxlength="40" value="${esc(n.label || '')}" oninput="orderNumbers[${i}].label=this.value" placeholder="العنوان: الطلبات الخارجية" class="input-pro !py-1.5 text-xs sm:w-44">
        <div class="flex items-center gap-2 flex-1">
          <input type="tel" dir="ltr" maxlength="20" value="${esc(n.phone || '')}" oninput="orderNumbers[${i}].phone=this.value.trim()" placeholder="0501234567" class="input-pro !py-1.5 text-xs flex-1 min-w-0">
          ${rowTools('orderNumbers', i, orderNumbers.length)}
        </div>
      </div>`).join('')
      : '<p class="text-[11px] text-ink text-center py-2">ما أضفت أي رقم بعد.</p>';
    document.getElementById('order-numbers-count').textContent = `${orderNumbers.length}/${MAX_ORDER_NUMBERS}`;
    document.getElementById('order-numbers-add').disabled = orderNumbers.length >= MAX_ORDER_NUMBERS;
  }
  function addOrderNumber() {
    if (orderNumbers.length >= MAX_ORDER_NUMBERS) return;
    orderNumbers.push({ label: '', phone: '' });
    renderOrderNumbers();
    const inputs = document.querySelectorAll('#order-numbers-list input[type="text"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }
  async function saveOrderNumbers() {
    for (const n of orderNumbers) {
      if (!validPhone(n.phone)) return showToast(`رقم غير صحيح${n.label ? ` في "${n.label}"` : ''}: أرقام فقط من 9 إلى 15 رقم`, true);
    }
    const payload = orderNumbers.map(n => ({ label: String(n.label || '').trim(), phone: cleanPhone(n.phone) }));
    if (await updateClient({ order_numbers: payload })) {
      orderNumbers = (client.order_numbers || []).map(n => ({ ...n }));
      renderOrderNumbers();
      showToast(orderNumbers.length ? 'تم الحفظ، وتظهر الأرقام في المنيو' : 'تمت إزالة أرقام الطلبات');
    } else showToast('تعذر حفظ أرقام الطلبات', true);
  }

  function renderCustomLinks() {
    document.getElementById('custom-links-list').innerHTML = customLinks.length ? customLinks.map((l, i) => `
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 bg-brand/5 border border-brand/15 rounded-xl p-2.5">
        <input type="text" maxlength="40" value="${esc(l.title || '')}" oninput="customLinks[${i}].title=this.value" placeholder="عنوان الرابط" class="input-pro !py-1.5 text-xs sm:w-44">
        <div class="flex items-center gap-2 flex-1">
          <input type="url" dir="ltr" value="${esc(l.url || '')}" oninput="customLinks[${i}].url=this.value.trim()" placeholder="https://..." class="input-pro !py-1.5 text-xs flex-1 min-w-0">
          ${rowTools('customLinks', i, customLinks.length)}
        </div>
      </div>`).join('')
      : '<p class="text-[11px] text-ink text-center py-2">ما أضفت أي رابط بعد.</p>';
    document.getElementById('custom-links-count').textContent = `${customLinks.length}/${MAX_CUSTOM_LINKS}`;
    // وين تطلع: اللي بدون منيو تطلع له في صفحة الروابط بس، فننبهه يحطها في البايو
    document.getElementById('custom-links-where').textContent = featureLocked('menu')
      ? 'تطلع لزبائنك في صفحة روابطك (الرابط الرئيسي). حطه في البايو عشان يشوفونها.'
      : 'تطلع لزبائنك أسفل المنيو وفي صفحة روابطك (الرابط الرئيسي).';
    if (client) document.getElementById('custom-links-open').href = DM.storeUrl(client.client_slug, 'links');
    renderPagerStatus();
    document.getElementById('custom-links-add').disabled = customLinks.length >= MAX_CUSTOM_LINKS;
  }
  function addCustomLink() {
    if (customLinks.length >= MAX_CUSTOM_LINKS) return;
    customLinks.push({ title: '', url: '' });
    renderCustomLinks();
    const inputs = document.querySelectorAll('#custom-links-list input[type="text"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }
  async function saveCustomLinks() {
    for (const l of customLinks) {
      const title = String(l.title || '').trim();
      if (!title) return showToast('اكتب عنوان لكل رابط', true);
      if (!safeUrl(l.url)) return showToast(`أضف رابط صحيح لـ "${title}" (يبدأ بـ https://)`, true);
    }
    const payload = customLinks.map(l => ({ title: String(l.title).trim(), url: l.url }));
    if (await updateClient({ custom_links: payload })) {
      customLinks = (client.custom_links || []).map(l => ({ ...l }));
      renderCustomLinks();
      showToast(customLinks.length ? 'تم حفظ الروابط' : 'تمت إزالة الروابط');
    } else showToast('تعذر حفظ الروابط', true);
  }

  // ─── صفحة الروابط السريعة ───
  function downloadLinksQr() {
    downloadQrCard({
      url: linksUrl(), caption: 'امسح الرمز لكل روابطنا', captionEn: 'Scan for all our links',
      filePrefix: 'links-qr', button: document.getElementById('links-qr-btn')
    });
  }

  // ─── نوع المنيو: عادي (قائمة أو صور كبيرة، يختار الزبون) أو تفاعلي ───
  // ─── المنيو العادي والمنيو التفاعلي: بطاقتين، وفي التفاعلي «أين يظهر؟» (التابلت بس، أو التابلت ورمز QR) ───
  // حالة الإضافة: هدية (للمشتركين قبل ما يصير إضافة)، أو مفعّلة (في الباقة أو التجربة)، أو مو موجودة
  function ixState() {
    if (!ixHas()) return 'off';
    const paid = !window.DMPlans || DMPlans.featuresOf(client).includes('ixpro');
    return !paid && client.ix_gift_until && Date.parse(client.ix_gift_until) > Date.now() ? 'gift' : 'on';
  }
  const ixDate = (d) => new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
  function renderMenuLayout() {
    if (!document.getElementById('menu-layout')) return;
    const state = ixState(), main = client.menu_layout === 'interactive' && state !== 'off';
    // بطاقة المنيو العادي: هل هو الرئيسي (اللي يطلع من رمز QR)؟
    const ns = document.getElementById('normal-status');
    if (ns) ns.innerHTML = main
      ? '<p class="text-[11px] text-ink/70 leading-relaxed">المنيو التفاعلي هو الرئيسي حالياً، ويمكنك إرجاع المنيو العادي من بطاقة المنيو التفاعلي.</p>'
      : '<span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><i class="ph-bold ph-qr-code"></i> المنيو الرئيسي حالياً: يظهر لعملائك عند مسح رمز QR.</span>';
    // شارة المنيو التفاعلي
    const badge = document.getElementById('ix-badge'), note = document.getElementById('ix-gift-note');
    if (badge) badge.innerHTML = state === 'gift'
      ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-400/20 border border-amber-500/30 px-2.5 py-1 rounded-full"><i class="ph-bold ph-gift"></i> هدية حتى ${ixDate(client.ix_gift_until)}</span>`
      : state === 'on'
      ? '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full"><i class="ph-bold ph-check-circle"></i> مفعّل</span>'
      : '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-brand/5 border border-brand/20 px-2.5 py-1 rounded-full"><i class="ph-bold ph-lock-simple"></i> إضافة</span>';
    if (note) { note.classList.toggle('hidden', state !== 'gift'); note.textContent = 'المنيو التفاعلي هدية لاشتراكك الحالي، وبعد التجديد يمكنك إضافته إلى باقتك.'; }
    // أين يظهر؟
    const off = state === 'off';
    const opt = (k, label) => `
      <label class="flex items-start gap-2.5 rounded-lg border p-2.5 transition ${off ? 'opacity-60 cursor-not-allowed border-brand/15' : (main ? k === 'interactive' : k === 'tablet') ? 'border-brand bg-brand/5 cursor-pointer' : 'border-brand/15 hover:border-brand/35 cursor-pointer'}">
        <input type="radio" name="ix-where" value="${k}" ${(main ? k === 'interactive' : k === 'tablet') ? 'checked' : ''} ${off ? 'disabled' : ''} onchange="setMenuLayout(this.value)" class="w-4 h-4 mt-0.5 accent-[#384f3d] shrink-0">
        <span class="text-[12px] font-bold text-ink leading-relaxed">${label}</span>
      </label>`;
    document.getElementById('menu-layout').innerHTML =
      opt('tablet', 'على الجهاز اللوحي فقط') +
      opt('interactive', 'على الجهاز اللوحي ورمز QR للطاولات (يصبح المنيو الرئيسي)');
    renderIxLook();
  }

  // ─── شكل المنيو التفاعلي (menu_ix): القالب، الألوان، شكل البطاقات، الملمس، وجملة تحت الشعار ───
  // الألوان الفاضية = ألوان القالب (نفس القيم اللي في menu.html)، و«شبكة» بدون ألوان تاخذ ثيم المنيو
  const IX_DEF = { grid: { bg: null, accent: null, texture: 'none', shape: 'soft' }, zigzag: { bg: '#1f4d3a', accent: '#e9dfc4', texture: 'grain', shape: 'round' }, thread: { bg: '#1e4a3a', accent: '#d9c49a', texture: 'paper', shape: 'round' } };
  // سجل القوالب من js/plans.js، وألوانها الافتراضية من IX_DEF
  const ixTemplates = () => (window.DMPlans && DMPlans.IX_TEMPLATES) || { grid: { name: 'Nova' }, zigzag: { name: 'Sage' } };
  const ixTexture = (t) => t === true ? 'grain' : t === false ? 'none' : ['grain', 'paper', 'none'].includes(t) ? t : null;
  const ixCfg = () => {
    const o = client.menu_ix && typeof client.menu_ix === 'object' ? client.menu_ix : {};
    return { style: ixTemplates()[o.style] ? o.style : 'grid', bg: o.bg || null, accent: o.accent || null, texture: ixTexture(o.texture),
      shape: ['round', 'soft', 'square'].includes(o.shape) ? o.shape : null, tagline: o.tagline || '',
      bg_mode: ['color', 'image', 'video'].includes(o.bg_mode) ? o.bg_mode : 'color', bg_image: o.bg_image || null, bg_video: o.bg_video || null };
  };
  // المنيو التفاعلي إضافة (ixpro): بدونها نعرض الشكل كمعاينة مقفولة مع طريقة الإضافة
  const ixHas = () => !window.DMPlans || DMPlans.has(client, 'ixpro');
  const ixLockBadge = '<span class="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold bg-white/95 text-ink px-2 py-0.5 rounded-full border border-brand/20"><i class="ph-bold ph-lock-simple"></i> إضافة</span>';
  function addIxpro() { lockedKey = 'ixpro'; addFeature(); }
  function ixColors(c) {
    const th = window.DMTheme ? DMTheme.resolve(client.theme, client.accent_color).vars : { bg: '#f6f6f3', accent: '#384f3d' };
    const d = IX_DEF[c.style] || IX_DEF.grid;
    return { bg: c.bg || d.bg || th.bg, accent: c.accent || d.accent || th.accent, texture: c.texture || d.texture, shape: c.shape || d.shape };
  }
  const ixShade = (hex, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 + k)).toString(16).padStart(2, '0')).join('');
  // معاينة صغيرة بالألوان والشكل والملمس: «متعرج» خط بالنص وصور وألسنة بالتناوب، و«شبكة» مربعات
  function ixArt(style, col) {
    const tab = ixShade(col.bg, -0.28);
    const r = { round: '50%', soft: '4px', square: '1px' }[col.shape] || '4px', tr = { round: '6px', soft: '3px', square: '1px' }[col.shape] || '3px';
    const tex = col.texture === 'grain' ? 'background-image:radial-gradient(60% 50% at 20% 10%, rgba(255,255,255,.14), transparent 70%), radial-gradient(60% 50% at 90% 90%, rgba(0,0,0,.2), transparent 70%);'
      : col.texture === 'paper' ? 'background-image:repeating-linear-gradient(115deg, rgba(255,255,255,.06) 0 2px, transparent 2px 5px), radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.22));' : '';
    const box = (inner) => `<span style="display:block;position:relative;height:64px;border-radius:8px;overflow:hidden;background-color:${col.bg};${tex}">${inner}</span>`;
    if (style === 'thread') {
      // «خيط»: خيط ذهبي متموج وأطباق يمين ويسار وجنبها سطور الاسم
      const plate = { round: '47% 53% 50% 50% / 52% 47% 53% 48%', soft: '5px', square: '2px' }[col.shape] || '50%';
      const rows = [0, 1, 2].map(i => {
        const y = 6 + i * 19, right = i % 2 === 0;
        return `<span style="position:absolute;top:${y}px;${right ? 'right' : 'left'}:22%;width:16px;height:16px;border-radius:${plate};background:${ixShade(col.bg, 0.6)};box-shadow:0 0 0 2px #efe7d4"></span>` +
          `<span style="position:absolute;top:${y + 4}px;${right ? 'left' : 'right'}:20%;width:28px;height:4px;border-radius:2px;background:${col.accent};opacity:.9"></span>` +
          `<span style="position:absolute;top:${y + 10}px;${right ? 'left' : 'right'}:20%;width:20px;height:3px;border-radius:2px;background:#efe7d4;opacity:.45"></span>`;
      }).join('');
      return box(`<svg viewBox="0 0 100 64" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><path d="M48 0 C 70 10, 74 14, 70 14 S 30 22, 30 33 S 72 44, 70 52 S 50 62, 52 64" fill="none" stroke="${col.accent}" stroke-width="1.2"/></svg>${rows}`);
    }
    if (style === 'zigzag') {
      const rows = [0, 1, 2].map(i => {
        const y = 7 + i * 19, right = i % 2 === 0;
        return `<span style="position:absolute;top:${y}px;${right ? 'right' : 'left'}:calc(50% - 15px);width:14px;height:14px;border-radius:${r};background:${col.accent};opacity:.85"></span>` +
          `<span style="position:absolute;top:${y + 2}px;${right ? 'left' : 'right'}:calc(50% - 30px);width:30px;height:10px;border-radius:${tr};background:${tab}"></span>`;
      }).join('');
      return box(`<span style="position:absolute;top:4px;bottom:4px;left:50%;width:4px;margin-left:-2px;border-radius:4px;background:${col.accent}"></span>${rows}`);
    }
    const cell = `<span style="display:block;border-radius:${r === '50%' ? '50%' : r};background:${ixShade(col.bg, -0.12)}"></span>`;
    return box(`<span style="position:absolute;inset:7px 12px;display:grid;grid-template-columns:repeat(3,22px);justify-content:center;gap:5px">${cell.repeat(6)}</span><span style="position:absolute;bottom:4px;left:50%;width:26px;height:5px;margin-left:-13px;border-radius:3px;background:${col.accent}"></span>`);
  }
  function renderIxLook() {
    const box = document.getElementById('menu-ix-look');
    if (!box) return;
    renderTabletLink();
    const c = ixCfg(), col = ixColors(c), T = ixTemplates();
    const has = ixHas();
    const SUB = { grid: 'الأصناف في شبكة بصور كبيرة، بألوان المنيو وخلفيته.', zigzag: 'خط في المنتصف والأصناف على جانبيه بالتناوب، بصور دائرية وخلفية داكنة.', thread: 'الأطباق يمين ويسار يربطها خيط ذهبي يرتسم بحركة، بخلفية خضراء داكنة.' };
    // القوالب كلها ضمن الإضافة
    const keys = Object.keys(T);
    const opt = (k) => {
      const cur = c.style === k;
      return `
      <button type="button" role="radio" aria-checked="${cur}" onclick="setIxStyle('${k}')" class="relative rounded-xl border-2 p-2 text-right transition ${cur ? 'border-brand bg-white' : 'border-brand/15 bg-white/60 hover:border-brand/35'}">
        <span id="ix-art-${k}" class="block mb-2">${ixArt(k, cur ? col : ixColors({ style: k }))}</span>
        <b class="block text-[12px] text-ink">${T[k].name}</b><span class="block text-[11px] text-ink leading-relaxed">${SUB[k] || T[k].desc || ''}</span>
      </button>`;
    };
    // بدون الإضافة: القوالب كمعاينة مقفولة، وسطر الإضافة وزرها (نفس مسار إضافة المميزات في صفحة الاشتراك)
    if (!has) {
      const f = DMPlans.FEATURES.ixpro;
      box.innerHTML = `
        <b class="block text-xs text-ink">شكل المنيو التفاعلي</b>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 opacity-60 pointer-events-none select-none" aria-hidden="true">${keys.map(k => `
          <div class="rounded-xl border-2 border-brand/15 bg-white p-2"><span class="block mb-2">${ixArt(k, ixColors({ style: k }))}</span><b class="block text-[12px] text-ink">${T[k].name}</b></div>`).join('')}
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 bg-brand/5 rounded-lg border border-brand/15 p-2.5">
          <span class="flex-1 text-[11px] font-bold text-ink leading-relaxed"><i class="ph-bold ph-lock-simple"></i> أضف المنيو التفاعلي لباقتك: ${f.month} ر.س بالشهر أو ${f.year} ر.س بالسنة. يشمل كل القوالب، وخلفية بصورة أو فيديو أو لون، ومنيو التابلت.</span>
          <button type="button" onclick="addIxpro()" class="shrink-0 bg-brand text-cream font-bold px-3 py-2 rounded-lg text-[12px]"><i class="ph-bold ph-plus"></i> أضف المنيو التفاعلي</button>
        </div>`;
      return;
    }
    // الخلفية: لون، أو صورة، أو فيديو (رفع ومعاينة وإزالة)
    const bgFile = (kind) => {
      const url = c[`bg_${kind}`], on = c.bg_mode === kind;
      const prev = !url ? '' : kind === 'image' ? `<img src="${esc(url)}" alt="" class="w-20 h-12 object-cover rounded-lg border border-brand/15 shrink-0">` : `<video src="${esc(url)}" muted loop autoplay playsinline class="w-20 h-12 object-cover rounded-lg border border-brand/15 shrink-0"></video>`;
      return `
        <div class="flex items-center gap-2 bg-brand/5 rounded-lg border ${on ? 'border-brand' : 'border-brand/15'} p-2">
          ${prev || `<span class="w-20 h-12 rounded-lg bg-white border border-dashed border-brand/25 grid place-items-center text-ink/60 shrink-0"><i class="ph-bold ${kind === 'image' ? 'ph-image' : 'ph-film-strip'}"></i></span>`}
          <span class="flex-1 min-w-0 text-[11px] text-ink leading-relaxed">${kind === 'image' ? 'صورة (حتى 5 ميجا)' : 'فيديو قصير بدون صوت (MP4، حتى 30 ميجا)'}</span>
          <input type="file" id="ix-bg-${kind}-file" accept="${kind === 'image' ? 'image/*' : 'video/mp4,video/webm,video/quicktime'}" class="hidden" onchange="uploadIxBg('${kind}')">
          <button type="button" id="upl-ix_bg_${kind}" onclick="document.getElementById('ix-bg-${kind}-file').click()" class="shrink-0 bg-brand text-cream font-bold px-2.5 py-1.5 rounded-lg text-[11px]">${url ? 'تغيير' : 'رفع'}</button>
          ${url ? `<button type="button" onclick="removeIxBg('${kind}')" class="shrink-0 bg-red-500/10 text-red-700 border border-red-500/25 hover:bg-red-500/15 font-bold px-2.5 py-1.5 rounded-lg text-[11px]"><i class="ph-bold ph-trash"></i> إزالة</button>` : ''}
        </div>`;
    };
    const bgModes = [['color', 'لون'], ['image', 'صورة'], ['video', 'فيديو']];
    const color = (key, label) => `
      <div class="flex items-center gap-2 bg-brand/5 rounded-lg border border-brand/15 p-2">
        <input type="color" id="ix-${key}" value="${col[key]}" oninput="previewIxLook()" onchange="saveIxLook({ ${key}: this.value })" aria-label="${label}" class="w-9 h-9 rounded-lg border border-brand/20 cursor-pointer shrink-0 bg-white">
        <span class="flex-1 text-[11px] font-bold text-ink">${label}</span>
        ${c[key] ? `<button type="button" onclick="saveIxLook({ ${key}: null })" class="text-[11px] font-bold text-ink underline">افتراضي</button>` : ''}
      </div>`;
    // اختيار من ثلاثة (شكل البطاقات والملمس): أزرار صغيرة
    const seg = (field, label, opts) => `
      <div class="space-y-1.5">
        <span class="block text-[11px] font-bold text-ink">${label}</span>
        <div role="radiogroup" class="grid grid-cols-3 gap-1.5">${opts.map(([v, t]) => `
          <button type="button" role="radio" aria-checked="${col[field] === v}" onclick="saveIxLook({ ${field}: '${v}' })" class="rounded-lg border px-2 py-2 text-[11px] font-bold transition ${col[field] === v ? 'border-brand bg-brand text-cream' : 'border-brand/20 bg-white text-ink hover:border-brand/40'}">${t}</button>`).join('')}
        </div>
      </div>`;
    // مجموعات واضحة: القالب، الخلفية، الألوان، الشكل، النص. كل مجموعة بعنوانها وخط يفصلها
    const group = (title, hint, body) => `
      <div class="space-y-2 pt-3 border-t border-brand/10 first:border-t-0 first:pt-0">
        <div><b class="block text-[12px] text-ink">${title}</b>${hint ? `<span class="block text-[11px] text-ink/70 leading-relaxed">${hint}</span>` : ''}</div>
        ${body}
      </div>`;
    const bgBody = `
      <div role="radiogroup" class="grid grid-cols-3 gap-1.5">${bgModes.map(([v, t]) => `
        <button type="button" role="radio" aria-checked="${c.bg_mode === v}" onclick="setIxBgMode('${v}')" class="rounded-lg border px-2 py-2 text-[11px] font-bold transition ${c.bg_mode === v ? 'border-brand bg-brand text-cream' : 'border-brand/20 bg-white text-ink hover:border-brand/40'}">${t}</button>`).join('')}
      </div>
      ${c.bg_mode === 'image' ? bgFile('image') : c.bg_mode === 'video' ? bgFile('video') : ''}
      ${color('bg', c.bg_mode === 'color' ? 'لون الخلفية' : 'لون فوق الصورة أو الفيديو')}
      ${c.bg_mode !== 'color' ? '<span class="block text-[11px] text-ink/70 leading-relaxed">يظهر هذا اللون بشفافية فوق الصورة أو الفيديو حتى تبقى النصوص واضحة.</span>' : ''}`;
    box.innerHTML = `
      <b class="block text-xs text-ink">شكل المنيو التفاعلي</b>
      ${group('1. القالب', 'اختر تصميم المنيو، وتتغير الألوان والشكل إلى إعدادات القالب.', `<div role="radiogroup" class="grid grid-cols-2 gap-2">${keys.map(opt).join('')}</div>`)}
      ${group('2. الخلفية', 'لون سادة، أو صورة، أو فيديو قصير.', bgBody)}
      ${group('3. لون التمييز', 'لون العناوين والأزرار والأسعار.', color('accent', 'لون التمييز'))}
      ${group('4. الشكل', '', seg('shape', 'شكل البطاقات', [['round', 'دائري'], ['soft', 'حواف ناعمة'], ['square', 'حواف حادة']])
        + seg('texture', 'الملمس', [['grain', 'حبيبات'], ['paper', 'ورق'], ['none', 'بدون']]))}
      ${group('5. جملة تحت الشعار', 'اختيارية، حتى 40 حرفاً، وتظهر تحت اسم المحل في شاشة الترحيب.', `
        <input id="ix-tagline" type="text" maxlength="40" aria-label="جملة تحت الشعار" value="${(c.tagline || '').replace(/"/g, '&quot;').replace(/</g, '&lt;')}" placeholder="مثال: قهوة مختصة منذ 2015" onchange="saveIxLook({ tagline: this.value })" class="input-pro text-xs">`)}`;
  }
  // ─── منيو التابلت: رابط مستقل يفتح المنيو التفاعلي دائماً (?mode=tablet) ───
  const tabletUrl = () => DM.storeUrl(client.client_slug, 'menu', { mode: 'tablet' });
  function renderTabletLink() {
    const input = document.getElementById('tablet-link'), open = document.getElementById('tablet-open');
    if (!input || !client) return;
    input.value = tabletUrl(); open.href = tabletUrl();
    const lock = document.getElementById('tablet-lock');
    if (lock) lock.classList.toggle('hidden', ixHas());
  }
  function copyTabletLink() {
    navigator.clipboard.writeText(tabletUrl())
      .then(() => showToast('تم نسخ رابط منيو التابلت'))
      .catch(() => { const i = document.getElementById('tablet-link'); if (i) i.select(); showToast('تعذر النسخ، انسخ الرابط من الخانة', true); });
  }
  // المعاينة الصغيرة تتلوّن وهو يختار اللون، والحفظ لما يقفل منتقي الألوان
  function previewIxLook() {
    const c = ixCfg(), col = ixColors(c);
    const bg = document.getElementById('ix-bg'), ac = document.getElementById('ix-accent'), art = document.getElementById(`ix-art-${c.style}`);
    if (art) art.innerHTML = ixArt(c.style, { ...col, bg: bg ? bg.value : col.bg, accent: ac ? ac.value : col.accent });
  }
  async function saveIxLook(patch) {
    if (await updateClient({ menu_ix: { ...ixCfg(), ...patch } })) { renderIxLook(); showToast('تم حفظ شكل المنيو التفاعلي'); }
    else { renderIxLook(); showToast('تعذر حفظ الإعداد', true); }
  }
  // نوع الخلفية: الصورة أو الفيديو لو ما انرفع للحين نفتح اختيار الملف، وينحفظ النوع بعد الرفع
  function setIxBgMode(mode) {
    const c = ixCfg();
    if (mode !== 'color' && !c[`bg_${mode}`]) return document.getElementById(`ix-bg-${mode}-file`) ? document.getElementById(`ix-bg-${mode}-file`).click() : (renderIxLookWith(mode));
    saveIxLook({ bg_mode: mode });
  }
  // نرسم الخانة (عشان يطلع زر الرفع) قبل ما ينحفظ شي
  function renderIxLookWith(mode) {
    const o = client.menu_ix || {}; client.menu_ix = { ...o, bg_mode: mode }; renderIxLook(); client.menu_ix = o;
    const f = document.getElementById(`ix-bg-${mode}-file`); if (f) f.click();
  }
  async function uploadIxBg(kind) {
    const input = document.getElementById(`ix-bg-${kind}-file`), file = input && input.files[0];
    const problem = validateFile(file, kind);
    if (problem) return showToast(problem, true);
    const url = await uploadFile(file, `ix_bg_${kind}`, 1920);
    input.value = '';
    if (!url) return showToast(`فشل رفع الملف: ${lastUploadError}`, true);
    saveIxLook({ bg_mode: kind, [`bg_${kind}`]: url });
  }
  function removeIxBg(kind) { saveIxLook({ bg_mode: 'color', [`bg_${kind}`]: null }); }
  // تغيير القالب يرجّع الألوان والملمس وشكل البطاقات لافتراضي القالب الجديد
  // «أين يظهر؟»: interactive = التابلت ورمز QR (يصير الرئيسي)، وغيره = التابلت بس (يرجع المنيو العادي بعرضه السابق: قائمة أو صور)
  async function setMenuLayout(k) {
    const want = k === 'interactive' ? 'interactive' : 'normal', cur = client.menu_layout === 'interactive' ? 'interactive' : 'normal';
    if (cur === want) return;
    if (want === 'interactive' && !ixHas()) { renderMenuLayout(); showToast('المنيو التفاعلي إضافة على المنيو، أضفها لباقتك أولاً', true); return addIxpro(); }
    const key = `dm_prev_layout_${client.id}`;
    let back = 'list'; try { back = localStorage.getItem(key) === 'photos' ? 'photos' : 'list'; } catch {}
    if (want === 'interactive') { try { localStorage.setItem(key, client.menu_layout === 'photos' ? 'photos' : 'list'); } catch {} }
    if (await updateClient({ menu_layout: want === 'interactive' ? 'interactive' : back })) { renderMenuLayout(); showToast(want === 'interactive' ? 'صار المنيو التفاعلي هو الرئيسي، ويظهر عند مسح رمز QR' : 'رجع المنيو العادي رئيسياً، والتفاعلي على الجهاز اللوحي فقط'); }
    else { renderMenuLayout(); showToast('تعذر حفظ الإعداد', true); }
  }

  function setIxStyle(k) {
    if (ixCfg().style === k) return;
    saveIxLook({ style: k, bg: null, accent: null, texture: null, shape: null });
  }

  // ─── عرض السعرات (خيار المتجر) ───
  const showCalories = () => !client || client.show_calories !== false;
  function applyCaloriesSetting() {
    document.getElementById('info-show-calories').checked = showCalories();
    document.getElementById('info-kiosk-call').checked = !!client && client.kiosk_call === true;
    document.getElementById('info-pager-car').checked = !!client && client.pager_car === true;
    document.getElementById('info-pager-upsell').checked = !!client && client.pager_upsell === true;
    document.getElementById('info-pager-chat').checked = !!client && client.pager_chat === true;
    document.getElementById('info-pager-game').checked = !client || client.pager_game !== false;
    if (client) {
      document.getElementById('info-game-reward').value = client.pager_game_reward || '';
      const mv = String(client.pager_game_moves || 20), sel = document.getElementById('info-game-moves');
      if (![...sel.options].some(o => o.value === mv)) sel.add(new Option(mv, mv));
      sel.value = mv;
      document.getElementById('info-quiz-need').value = String(client.pager_quiz_need || 4);
    }
    renderPagerStatus();
    document.getElementById('calories-field').classList.toggle('hidden', !showCalories());
  }
  // حالة كل إعداد في البيجر: جاهز / مو مفعّل / ناقص
  function pgChip(id, kind, text) {
    const el = document.getElementById(id); if (!el) return;
    const cls = { ok: 'bg-emerald-50 text-emerald-800 border-emerald-200', off: 'bg-ink/5 text-ink border-ink/15', warn: 'bg-amber-50 text-amber-800 border-amber-300' }[kind];
    const icon = { ok: 'ph-check-circle', off: 'ph-circle', warn: 'ph-warning-circle' }[kind];
    el.className = `shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${cls}`;
    el.innerHTML = `<i class="ph-bold ${icon}"></i> ${text}`;
  }
  function renderPagerStatus() {
    if (!client) return;
    const prev = document.getElementById('pg-preview');
    if (prev) prev.href = DM.storeUrl(client.client_slug, 'pager');
    const pin = client.loyalty_lat != null && client.loyalty_lng != null;
    pgChip('pg-st-pin', pin ? 'ok' : 'off', pin ? 'محدد' : 'اختياري');
    pgChip('pg-st-car', client.pager_car ? 'ok' : 'off', client.pager_car ? 'مفعّل' : 'مو مفعّل');
    pgChip('pg-st-kiosk', client.kiosk_call ? 'ok' : 'off', client.kiosk_call ? 'مفعّل' : 'مو مفعّل');
    pgChip('pg-st-upsell', client.pager_upsell ? 'ok' : 'off', client.pager_upsell ? 'مفعّل' : 'مو مفعّل');
    pgChip('pg-st-game', client.pager_game_reward ? 'ok' : 'off', client.pager_game_reward ? 'مفعّلة' : 'بدون جائزة');
    pgChip('pg-st-chat', client.pager_chat ? 'ok' : 'off', client.pager_chat ? 'مفعّل' : 'مو مفعّل');
    pgChip('pg-st-gameon', client.pager_game !== false ? 'ok' : 'off', client.pager_game !== false ? 'مفعّلة' : 'موقفة');
    const gb = document.getElementById('info-game-box'); if (gb) gb.classList.toggle('hidden', client.pager_game === false);
    if (client.google_review_url) pgChip('pg-st-review', 'ok', 'جاهز');
    else if (client.location_url) pgChip('pg-st-review', 'ok', 'يفتح موقعك في الخريطة');
    else pgChip('pg-st-review', 'warn', 'ناقص: زبائنك ما يقدرون يقيّمونك');
    const n = ['instagram_url', 'tiktok_url', 'snapchat_url', 'website_url'].filter(k => client[k]).length;
    pgChip('pg-st-social', n ? 'ok' : 'warn', n ? `${n} ${n === 1 ? 'حساب' : 'حسابات'}` : 'ناقص');
    const cl = (client.custom_links || []).filter(l => l && l.title && l.url).length;
    pgChip('cl-st', cl ? 'ok' : 'off', cl === 1 ? 'رابط واحد' : cl === 2 ? 'رابطين' : cl ? `${cl} روابط` : 'ما فيه');
  }
  async function saveReviewLink() {
    const review = document.getElementById('info-review').value.trim();
    if (review && !/^https:\/\/(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl|goo\.gl|maps\.google\.com|g\.co)\//i.test(review)) return showToast('رابط التقييم لازم يكون من قوقل، مثل g.page/r/.../review', true);
    if (await updateClient({ google_review_url: review })) showToast(review ? 'تم حفظ رابط التقييم' : 'انحذف رابط التقييم');
    else showToast('تعذر حفظ الرابط', true);
  }
  async function togglePagerCar(on) {
    if (await updateClient({ pager_car: on })) showToast(on ? 'الزبون يقدر يحدد سيارته بعد ما ياخذ رقم' : 'تم إيقاف تسليم الطلب للسيارة');
    else { document.getElementById('info-pager-car').checked = !on; showToast('تعذر حفظ الإعداد', true); }
  }
  // معاينة صفحة الانتظار في الجوال (شاشة كبيرة بس)
  // الجوال يعرض المنيو عند إعدادات الطلب (واتساب، الطلب للكاشير)، وصفحة الانتظار عند إعدادات البيجر
  let phoneView = 'pager';
  function reloadPagerPhone() {
    const f = document.getElementById('pg-phone'); if (!f || !client || !window.matchMedia('(min-width: 1280px)').matches) return;
    if (featureLocked('pager')) phoneView = 'menu';
    else if (featureLocked('menu')) phoneView = 'pager';
    const menu = phoneView === 'menu';
    f.src = `${menu ? 'menu' : 'pager'}.html?client=${encodeURIComponent(client.client_slug)}&preview=1&v=${Date.now()}`;
    document.getElementById('pg-phone-title').innerHTML = `<i class="ph-bold ph-device-mobile"></i> ${menu ? 'كما يراه الزبون في المنيو' : 'كما يراها الزبون وهو ينتظر'}`;
    document.getElementById('pg-phone-note').textContent = menu
      ? (client.menu_order_mode ? 'جرّب تضيف صنف وتفتح الطلب. في المعاينة الطلب ما ينرسل للكاشير.' : 'المنيو كما يظهر للزبون الحين.')
      : 'رقم تجريبي للمعاينة فقط، ولا يُسجَّل عندك.';
  }
  function setPhoneView(v) { if (v !== phoneView) { phoneView = v; reloadPagerPhone(); } }
