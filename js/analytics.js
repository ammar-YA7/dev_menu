// =====================================================================
// DEV MENU — تحليلات المنتج (PostHog، خوادم أوروبا)
//   في لوحة صاحب المحل وصفحة الدخول بس، مو في صفحات الزبائن (المنيو، البيجر، الولاء)
//   يحسب: الصفحات والتبويبات، الضغطات، الأخطاء، وتسجيل الجلسات
//   الخصوصية: كل الخانات مخفية، وأي قسم فيه بيانات زبائن المحل (أسماء، جوالات، ملاحظات)
//   نصّه يطلع نجوم في التسجيل وضغطاته ما تنحسب، وأي رقم جوال أو بريد في أي مكان ينخفى
//   الإرسال يمر من /ingest على نطاقنا (تحويلة في vercel.json) عشان سياسة الأمان ومانع الإعلانات
//   لو PostHog ما اشتغل أو انحجب: الموقع يشتغل عادي، كل الاستدعاءات هنا آمنة
// =====================================================================
(function () {
  const KEY = '';   // Project API key من PostHog (عام، مكانه في الموقع)
  const host = location.hostname;
  const env = /(^|\.)devmenu\.digital$/.test(host) ? 'production' : /^devmenu-staging\.vercel\.app$/.test(host) ? 'staging' : '';
  const off = !KEY || !env
    || new URLSearchParams(location.search).has('client');   // المدير العام يتصفح لوحة محل: ما نحسبه
  const noop = () => {};
  window.DMAnalytics = { identify: noop, track: noop, reset: noop };
  if (off) return;

  // ─── الخصوصية ───
  // أقسام فيها بيانات زبائن المحل: نصها مخفي في التسجيل، وضغطاتها ما تنحسب
  const PRIVATE_IDS = ['ly-recent', 'ly-top', 'ly-rows', 'ly-msg-list', 'ly-member', 'ly-fb-stats', 'li-rows',
    'wl-list', 'wlh-rows', 'wlh-guest-rows', 'wlh-guests-wrap', 'wlh-visits-wrap', 'sales-body', 'notif-list'];
  const markPrivate = () => PRIVATE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('data-ph-private', ''); el.classList.add('ph-no-capture'); }
  });
  const PHONE = /\+?\d[\d\s\-]{6,}\d/g, EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/gi;
  const scrub = (s) => typeof s === 'string' ? s.replace(PHONE, m => '•'.repeat(m.length)).replace(EMAIL, '•••@•••') : s;
  const maskText = (text, el) => {
    const node = el && el.nodeType === 3 ? el.parentElement : el;
    if (node && node.closest && node.closest('[data-ph-private]')) return text.replace(/\S/g, '•');
    return scrub(text);
  };

  // ─── تحميل PostHog (المقتطف الرسمي، يحمّل المكتبة من /ingest/static) ───
  /* eslint-disable */
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags on onFeatureFlags onSessionId identify setPersonProperties group resetGroups reset get_distinct_id get_session_id alias set_config startSessionRecording stopSessionRecording captureException opt_in_capturing opt_out_capturing has_opted_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  /* eslint-enable */

  posthog.init(KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',   // ما نسوي ملف لزائر ما سجّل دخول
    capture_pageview: false,               // اللوحة تتنقل بالـ # : نحسبها بنفسنا تحت
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,              // الأخطاء اللي تطلع عند صاحب المحل
    disable_surveys: true,
    mask_all_element_attributes: true,
    session_recording: { maskAllInputs: true, maskTextSelector: '*', maskTextFn: maskText },
    // آخر حماية قبل الإرسال: نشيل أي جوال أو بريد من نصوص الضغطات والروابط
    before_send: (ev) => {
      const p = ev && ev.properties;
      if (p) ['$el_text', '$elements_chain', '$current_url', '$pathname', 'title'].forEach(k => { if (p[k]) p[k] = scrub(p[k]); });
      return ev;
    }
  });
  posthog.register({ env, page: location.pathname.replace(/^\/|\.html$/g, '') || 'home' });

  // كل تبويب في اللوحة صفحة: admin.html#menu، #pager ...
  const pageview = () => posthog.capture('$pageview', { tab: location.hash.slice(1).split('?')[0] || 'home' });
  const ready = () => { markPrivate(); pageview(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.addEventListener('hashchange', pageview);
  // الأقسام اللي تنبني بعدين (نوافذ ونتائج): نعيد التعليم كل ما تغيّرت الصفحة
  new MutationObserver(() => { clearTimeout(markPrivate.t); markPrivate.t = setTimeout(markPrivate, 300); })
    .observe(document.documentElement, { childList: true, subtree: true });

  // ─── التعريف: المحل برقمه، بدون اسم صاحبه ولا بريده ولا جواله ───
  window.DMAnalytics = {
    identify(store) {
      try {
        if (!store || !store.id) return;
        const main = store.parent_id || store.id;
        posthog.identify('store_' + main, {
          business_type: store.business_type || 'restaurant',
          status: store.subscription_status || '',
          plan: store.subscription_plan || '',
          features: Array.isArray(store.plan_features) ? store.plan_features.join(',') : '',
          signed_up: store.created_at || null
        });
        posthog.register({ store_id: main, is_branch: !!store.parent_id });
      } catch {}
    },
    // أحداث مهمة نسميها بأنفسنا (مثل: أول طبق، أول رقم بيجر)
    track(name, props) { try { posthog.capture(name, props || {}); } catch {} },
    reset() { try { posthog.reset(); } catch {} }
  };
})();
