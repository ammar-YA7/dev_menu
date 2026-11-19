// =====================================================================
// DEV MENU — لوحة التحكم: رسائل الواتساب (المحل المربوط بواتساب) ورقم الفاتورة الإجباري
//   صاحب المحل يختار رسالة جاهزة أو يكتب رسالته بدون أقواس: يضغط «رقم الطلب» أو «اسم المحل» وتنضاف للنص،
//   ويشوف معاينة بالقيم الحقيقية. في الخادم تنحفظ {number} و {store} و {greet}
// =====================================================================
  // ─── رقم الفاتورة إجباري ───
  function applyInvReq() {
    const el = document.getElementById('info-pager-invreq');
    if (el) el.checked = !!client && client.pager_invoice_req === true;
  }
  async function togglePagerInvReq(on) {
    if (await updateClient({ pager_invoice_req: on })) showToast(on ? 'صار رقم الفاتورة إجبارياً قبل أخذ الرقم' : 'رقم الفاتورة صار اختيارياً');
    else { document.getElementById('info-pager-invreq').checked = !on; showToast('تعذر حفظ الإعداد', true); }
  }

  // ─── المتغيرات: تظهر لصاحب المحل بأسمائها، وتنحفظ بالأقواس ───
  const WA_TOK = [
    { label: 'رقم الطلب', key: 'number', icon: 'ph-receipt' },
    { label: 'اسم المحل', key: 'store', icon: 'ph-storefront' },
    { label: 'التحية', key: 'greet', icon: 'ph-sun-horizon' }
  ];
  const waToUi = (t) => WA_TOK.reduce((s, x) => s.split(`{${x.key}}`).join(`«${x.label}»`), String(t || ''));
  const waToDb = (t) => WA_TOK.reduce((s, x) => s.split(`«${x.label}»`).join(`{${x.key}}`), String(t || ''));
  const waGreet = () => (new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير');
  // المعاينة: القيم الحقيقية بدل الأسماء (رقم فاتورة مثال)
  const waFill = (t) => String(t || '').split('«رقم الطلب»').join('1045').split('«اسم المحل»').join((client && client.name) || 'محلك').split('«التحية»').join(waGreet());
  const waBubble = (t) => `<div class="wa-bubble">${esc(t).replace(/\n/g, '<br>')}<span class="wa-time">${new Date().toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' })}</span></div>`;

  // رسائل «طلبك جاهز» الجاهزة (الأولى هي الافتراضية)
  const WA_READY = [
    'طلبك رقم «رقم الطلب» جاهز، تفضّل استلمه من «اسم المحل»',
    'أبشرك، طلبك رقم «رقم الطلب» جاهز ☕ تفضّل استلمه من الكاشير',
    '«التحية»! طلبك «رقم الطلب» صار جاهز، ننتظرك في «اسم المحل» 🌿',
    'تم تجهيز طلبك رقم «رقم الطلب» في «اسم المحل». تفضّل، وبالعافية مقدماً 🙏'
  ];
  let waState = null, waReadyPick = 0, waThanksMode = 'auto', waLoadedFor = null;

  async function loadWaMsgs(force) {
    const rc = document.getElementById('wa-ready-card'), tc = document.getElementById('wa-thanks-card');
    if (!rc || !client) return;
    if (!force && waLoadedFor === client.id) return;
    waLoadedFor = client.id;
    applyInvReq();
    let r = null;
    if (DMPlans.has(client, 'pager')) { try { r = await api('wa-msgs', {}); } catch { r = null; } }
    const on = !!(r && r.linked);
    rc.classList.toggle('hidden', !on); tc.classList.toggle('hidden', !on);
    if (!on) return;
    waState = r;
    // «طلبك جاهز»: نعرف أي رسالة جاهزة مختارة، وإلا «رسالتي الخاصة»
    const cur = waToUi(r.message || r.default_message);
    const i = WA_READY.indexOf(cur);
    waReadyPick = i >= 0 ? i : 'own';
    document.getElementById('wa-ready-text').value = i >= 0 ? '' : cur;
    renderWaReady();
    // الشكر
    document.getElementById('wa-thanks-on').checked = r.thanks === true;
    document.getElementById('wa-thanks-text').value = waToUi(r.thanks_msgs || '');
    waThanksMode = r.thanks_msgs ? 'own' : 'auto';
    renderWaThanks();
  }

  function renderWaReady() {
    document.getElementById('wa-ready-opts').innerHTML = WA_READY.map((t, i) => `<button type="button" role="radio" aria-checked="${waReadyPick === i}" class="wa-opt" onclick="pickWaReady(${i})"><span>${esc(waFill(t))}</span></button>`).join('')
      + `<button type="button" role="radio" aria-checked="${waReadyPick === 'own'}" class="wa-opt" onclick="pickWaReady('own')"><b><i class="ph-bold ph-pencil-simple"></i> رسالتي الخاصة</b></button>`;
    document.getElementById('wa-ready-own').classList.toggle('hidden', waReadyPick !== 'own');
    const t = waReadyPick === 'own' ? document.getElementById('wa-ready-text').value : WA_READY[waReadyPick];
    document.getElementById('wa-ready-prev').innerHTML = waBubble(waFill(t || '…'));
  }
  function pickWaReady(i) {
    waReadyPick = i; renderWaReady();
    if (i === 'own') { const ta = document.getElementById('wa-ready-text'); if (!ta.value.trim()) ta.value = WA_READY[0]; renderWaReady(); ta.focus(); }
  }
  async function saveWaReady() {
    const t = waReadyPick === 'own' ? document.getElementById('wa-ready-text').value.trim() : WA_READY[waReadyPick];
    if (!t) return showToast('اكتب الرسالة أولاً', true);
    try { await api('wa-msgs-save', { message: waToDb(t) }); showToast('تم حفظ رسالة «طلبك جاهز»'); }
    catch { showToast('تعذر حفظ الرسالة', true); }
  }

  function setThanksMode(m) { waThanksMode = m; renderWaThanks(); if (m === 'own') document.getElementById('wa-thanks-text').focus(); }
  function renderWaThanks() {
    const on = document.getElementById('wa-thanks-on').checked;
    document.getElementById('wa-thanks-body').classList.toggle('hidden', !on);
    document.querySelectorAll('[data-tmode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.tmode === waThanksMode)));
    document.getElementById('wa-thanks-own').classList.toggle('hidden', waThanksMode !== 'own');
    const lines = document.getElementById('wa-thanks-text').value.split('\n').map(x => x.trim()).filter(Boolean);
    const list = waThanksMode === 'own' ? lines.slice(0, 3).map(waFill) : ((waState && waState.samples) || []);
    document.getElementById('wa-thanks-prev').innerHTML = list.length ? list.map(waBubble).join('') : '<p class="text-[11px] text-ink">اكتب صيغة واحدة على الأقل لتظهر هنا.</p>';
  }
  async function toggleWaThanks(on) {
    renderWaThanks();
    try { await api('wa-msgs-save', { thanks: on }); showToast(on ? 'تم تفعيل رسالة الشكر' : 'تم إيقاف رسالة الشكر'); }
    catch { document.getElementById('wa-thanks-on').checked = !on; renderWaThanks(); showToast('تعذر حفظ الإعداد', true); }
  }
  async function saveWaThanks() {
    const own = waThanksMode === 'own' ? document.getElementById('wa-thanks-text').value.trim() : '';
    if (waThanksMode === 'own' && !own) return showToast('اكتب صيغة واحدة على الأقل', true);
    try { await api('wa-msgs-save', { thanks_msgs: waToDb(own) }); showToast('تم حفظ رسالة الشكر'); }
    catch { showToast('تعذر حفظ رسالة الشكر', true); }
  }

  // أزرار «+ رقم الطلب» و«+ اسم المحل» تحت الخانة: تضيف الاسم مكان المؤشر
  document.querySelectorAll('.wa-chips').forEach(box => {
    const ta = document.getElementById(box.dataset.for);
    box.innerHTML = WA_TOK.map(x => `<button type="button" data-tok="${x.label}"><i class="ph-bold ph-plus"></i> ${x.label}</button>`).join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tok]'); if (!b) return;
      const ins = `«${b.dataset.tok}»`, a = ta.selectionStart ?? ta.value.length, z = ta.selectionEnd ?? a;
      ta.value = ta.value.slice(0, a) + ins + ta.value.slice(z);
      ta.focus(); ta.setSelectionRange(a + ins.length, a + ins.length);
      ta.dispatchEvent(new Event('input'));
    });
  });
  document.getElementById('wa-ready-text').addEventListener('input', renderWaReady);
  document.getElementById('wa-thanks-text').addEventListener('input', renderWaThanks);
