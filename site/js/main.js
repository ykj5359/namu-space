// 나무의공간 공통 스크립트 — 회사 정보는 여기 한 곳만 고치면 모든 페이지에 반영됩니다.
window.SITE = {
  name: '나무의공간',
  ceo: '이영석',
  tel: '010-3509-2230',
  email: 'ykj5359@daum.net',       // 주문서 수신 이메일
  bizname: '둥지인테리어',           // 사업자등록증상 상호
  address: '충청남도 홍성군 서부면 지산1길 25-17',
  bizno: '131-36-54075',
  kakao: '',                       // 카카오톡 채널 주소 (미정)
  hours: '평일 09:00 ~ 18:00',      // 상담 가능 시간
  texts: { heroTitle: '나무가 만드는\n공간의 결', hero: '서두르는 손이 아니라 준비된 나무가 벽을 완성합니다. 현장은 고요하고, 마감은 고릅니다.', notice: { on: false, text: '', from: '', to: '' },
    // 팝업창: 홈 첫 방문 시 이미지 팝업 (관리자 설정 → 팝업창 에서 이미지 업로드·기간·링크 변경). pages: 'home'(홈만) | 'all'(모든 페이지)
    popup: { on: true, image: 'img/popup/sample.jpg', link: 'index.html?sample=1#contact', title: '템바보드 샘플 무료 배송 이벤트', from: '', to: '', pages: 'home' } },
  defaultLogo: 1,                  // 기본 로고 번호 (logo.html 에서 선택하면 브라우저에 저장됨)
  // 이메일 자동 전송(EmailJS) — 계정 발급 후 아래 세 값을 채우면 주문서가 자동 발송됩니다.
  emailjs: { publicKey: '', serviceId: '', templateId: '' },
  // 자동 접수 — 구글 앱스 스크립트 웹 앱 URL (tools/apps-script/Code.gs 배포 후 여기에 입력). 비어 있으면 메일 앱 열기 방식으로 동작
  orderEndpoint: 'https://script.google.com/macros/s/AKfycbw5sC6Nz5zqQjbvujb7VoB_l-w1_Sw8OV3nDQdkHH-lzqbXF4BGF8ubQWkdZKxJgb8dFA/exec',
  orderSecret: '',                 // 선택: Code.gs 의 SECRET 과 같은 값
  // 예상 금액 단가 (원) — 실제 단가로 바꿔 주세요. 면적은 코너 돌림을 포함한 패널 면적(㎡) 기준, 부가세 별도.
  price: { natural: 140000, stain: 140000, corner: 30000, install: 40000, plyBlack: 0, paint: 0, min: 50000, vat: true }, // plyBlack: 합판 흑도장 추가금 ㎡당, paint: 도색(각재/합판) 추가금 ㎡당 (미정 시 0) // natural/stain: ㎡당, corner: 코너 1면당, install: 현장 시공 ㎡당, min: 1장 최소
  // 원가 계산 기준 (관리자 참고용 · cart.html?admin=1 과 주문 메일에 표시)
  //  batten: 각재 30×30-3600 1본 단가(원) · battenLen: 1본 길이(mm) · plywood: 합판 2400×1200×8t 1장 · labor: 인건비 ㎡당 · stain: 오일 스테인 재료비 ㎡당(미정 시 0)
  cost: { batten: 3600, battenLen: 3600, plywood: 18000, labor: 30000, stain: 0 },
  // 결제 — provider 'toss' 로 두고 clientKey 를 넣으면 토스페이먼츠 결제창이 열립니다. 비어 있으면 모의 결제(주문 접수만)로 동작합니다.
  payment: { provider: 'toss', clientKey: '', successUrl: 'complete.html', failUrl: 'checkout.html', bank: '농협 000-0000-0000-00', holder: '이영석', methods: { card: true, transfer: true, vbank: true, bank: true } },
  // 배송 방법별 배송비 — mode: 'amount'(금액, 0이면 무료) · 'cod'(착불) · 'separate'(별도, 접수 후 안내). 관리자 페이지 설정 → 배송비 에서 수정
  ship: { later: { label: '협의 후 결정', mode: 'separate', amount: 0 }, parcel: { label: '택배 (소량·소형, 1장 기준 1200 이하)', mode: 'amount', amount: 6000 }, freight: { label: '화물·용달 (대형·다량)', mode: 'cod', amount: 0 }, pickup: { label: '직접 방문 수령 (충남 홍성 공방)', mode: 'amount', amount: 0 }, site: { label: '현장 시공 (시공 포함 주문 · 직접 설치)', mode: 'separate', amount: 0 } },
};

// ---- 관리자 페이지(admin.html)에서 저장한 설정을 적용: 브라우저 캐시 → 즉시, 서버 → 백그라운드 갱신 ----
window.NW_APPLY_CONFIG = function (c) {
  if (!c || typeof c !== 'object') return;
  const co = c.company || {}; ['name', 'ceo', 'tel', 'email', 'bizname', 'address', 'bizno', 'kakao', 'hours'].forEach(k => { if (co[k] !== undefined) SITE[k] = co[k]; });
  if (c.price) Object.assign(SITE.price, c.price);
  if (c.cost) Object.assign(SITE.cost, c.cost);
  if (c.payment) { const pm = SITE.payment.methods; Object.assign(SITE.payment, c.payment); if (c.payment.methods) SITE.payment.methods = Object.assign({}, pm, c.payment.methods); }
  if (c.texts) { SITE.texts = Object.assign({}, SITE.texts, c.texts); if (c.texts.notice) SITE.texts.notice = Object.assign({}, c.texts.notice); if (c.texts.popup) SITE.texts.popup = Object.assign({}, c.texts.popup); }
  if (c.ship) Object.keys(c.ship).forEach(k => { SITE.ship[k] = Object.assign({}, SITE.ship[k] || {}, c.ship[k]); });
  if (c.logo) SITE.defaultLogo = +c.logo;
  SITE.configLoaded = true;
  if (document.readyState !== 'loading' && window.NW_RENDER_SITE) NW_RENDER_SITE();
};
(function () {
  try { const c = JSON.parse(localStorage.getItem('nw_cfg') || 'null'); if (c) NW_APPLY_CONFIG(c); } catch (e) {}
  if (!SITE.orderEndpoint) return;
  window.NW_CONFIG_READY = fetch(SITE.orderEndpoint + '?action=config', { cache: 'no-store' }).then(r => r.json()).then(c => {
    if (c && c.company) { try { localStorage.setItem('nw_cfg', JSON.stringify(c)); } catch (e) {} NW_APPLY_CONFIG(c); document.dispatchEvent(new CustomEvent('nw:config')); document.dispatchEvent(new CustomEvent('cart:change')); }
    return c;
  }).catch(() => null);
})();

// ---- 자동 접수 전송: 성공하면 true, 엔드포인트가 없거나 실패하면 false (호출한 쪽에서 메일 앱 방식으로 대체) ----
window.NW_SEND = async function (payload) {
  const url = SITE.orderEndpoint; if (!url) return false;
  const files = payload.files || [];
  const toB64 = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => res(null); r.readAsDataURL(f); });
  const attachments = [];
  for (const f of files) { const d = await toB64(f); if (d) attachments.push({ name: f.name, mime: f.type || 'image/jpeg', data: d }); }
  const body = JSON.stringify({ secret: SITE.orderSecret || '', type: payload.type || 'contact', subject: payload.subject, text: payload.text, customer: payload.customer || {}, meta: payload.meta || {}, doc: payload.doc || null, attachments });
  try {
    const r = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' } }); // text/plain → CORS 사전요청 없이 전송
    const j = await r.json().catch(() => ({ ok: r.ok }));
    return !!j.ok;
  } catch (e) { console.warn('자동 접수 실패', e); return false; }
};


// ---- 배송 주소 입력 위젯: <div data-addr="addr" data-required="1"></div> → 우편번호 찾기(다음 우편번호 서비스, 무료·키 불필요) + 기본 주소 + 상세 주소 ----
//  합쳐진 값은 숨은 input(name/data-k = data-addr 값)에 "[우편번호] 기본주소, 상세주소" 형식으로 들어가고, 바뀔 때마다 input 이벤트를 냅니다.
window.NW_ADDR = (function () {
  const escA = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let lib = null;
  const load = () => lib || (lib = new Promise((res, rej) => { if (window.daum && daum.Postcode) return res(); const s = document.createElement('script'); s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'; s.onload = res; s.onerror = () => { lib = null; rej(new Error('load')); }; document.head.appendChild(s); }));
  const parse = v => { const m = /^\[(\d{5})\]\s*(.*?)(?:,\s*(.*))?$/.exec(String(v || '').trim()); return m ? { zip: m[1], base: m[2], detail: m[3] || '' } : { zip: '', base: String(v || '').trim(), detail: '' }; };
  function mount(box) {
    if (box.dataset.mounted) return; box.dataset.mounted = '1';
    const key = box.dataset.addr || 'addr', useK = box.hasAttribute('data-k-mode'), init = parse(box.dataset.value || '');
    box.className = (box.className + ' addr-box').trim();
    box.innerHTML = `<div class="addr-row"><input type="text" class="addr-zip" placeholder="우편번호" readonly value="${escA(init.zip)}"><button type="button" class="btn ghost sm addr-find">주소 찾기</button></div>
      <input type="text" class="addr-base" placeholder="주소 찾기를 눌러 도로명·지번 주소를 선택하세요" readonly value="${escA(init.base)}">
      <input type="text" class="addr-detail" placeholder="상세 주소 (동·호수, 건물명 등)" value="${escA(init.detail)}">
      <div class="addr-embed" style="display:none"><button type="button" class="addr-close" aria-label="닫기">×</button><div class="addr-embed-in"></div></div>
      <input type="hidden" ${useK ? `data-k="${key}"` : `name="${key}"`} value="${escA(box.dataset.value || '')}">`;
    const zip = box.querySelector('.addr-zip'), base = box.querySelector('.addr-base'), det = box.querySelector('.addr-detail'), hid = box.querySelector('input[type=hidden]'), emb = box.querySelector('.addr-embed'), embIn = box.querySelector('.addr-embed-in');
    const sync = () => { const v = base.value ? `${zip.value ? '[' + zip.value + '] ' : ''}${base.value}${det.value ? ', ' + det.value.trim() : ''}` : det.value.trim(); if (hid.value !== v) { hid.value = v; hid.dispatchEvent(new Event('input', { bubbles: true })); hid.dispatchEvent(new Event('change', { bubbles: true })); } };
    det.addEventListener('input', sync);
    box.querySelector('.addr-close').addEventListener('click', () => { emb.style.display = 'none'; });
    box.querySelector('.addr-find').addEventListener('click', async () => {
      try { await load(); } catch (e) { base.readOnly = false; base.placeholder = '주소 검색을 불러오지 못했습니다. 직접 입력해 주세요'; base.focus(); base.addEventListener('input', sync); return; }
      emb.style.display = ''; embIn.innerHTML = '';
      new daum.Postcode({ oncomplete: d => { zip.value = d.zonecode; base.value = (d.roadAddress || d.jibunAddress) + (d.buildingName && d.roadAddress ? ' (' + d.buildingName + ')' : ''); emb.style.display = 'none'; sync(); det.focus(); }, width: '100%', height: '100%' }).embed(embIn, { autoClose: true });
      emb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    box.NW_set = v => { const p = parse(v); zip.value = p.zip; base.value = p.base; det.value = p.detail; hid.value = String(v || ''); };
    box.NW_valid = () => !!base.value || !!det.value.trim();
    return box;
  }
  const mountAll = () => document.querySelectorAll('[data-addr]').forEach(mount);
  mountAll(); document.addEventListener('DOMContentLoaded', mountAll);   // 스크립트가 본문 끝에 있으므로 즉시 장착(본문 파싱 중이라 readyState 는 아직 loading) → 뒤따르는 order.js·checkout 이 hidden 입력을 바로 사용
  return { mount, parse, set(sel, v) { const b = document.querySelector(sel); if (b && b.NW_set) b.NW_set(v); }, valid(sel) { const b = document.querySelector(sel); return b && b.NW_valid ? b.NW_valid() : true; } };
})();

(function () {
  // 로고 삽입: <a class="logo" data-logo></a> 에 선택된 SVG 를 넣음
  function currentLogoId() {
    let id = SITE.defaultLogo;
    try { const s = localStorage.getItem('nw_logo'); if (s) id = +s; } catch (e) {}
    return id;
  }
  window.renderLogos = function () {
    if (!window.NW_LOGOS) return;
    const id = currentLogoId();
    const l = NW_LOGOS.find(x => x.id === id) || NW_LOGOS[0];
    document.querySelectorAll('[data-logo]').forEach(el => { el.innerHTML = l.svg; });
  };

  // 전화·정보 치환: [data-site="tel"] 등, 문구 [data-text="hero"], 공지 배너, 카카오 링크
  const escH = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  function fill() {
    document.querySelectorAll('[data-site]').forEach(el => {
      const k = el.getAttribute('data-site');
      if (SITE[k] !== undefined) el.textContent = SITE[k];
    });
    document.querySelectorAll('a[data-tel]').forEach(a => { a.href = 'tel:' + SITE.tel.replace(/-/g, ''); });
    document.querySelectorAll('a[data-mail]').forEach(a => { a.href = 'mailto:' + SITE.email; });
    const T = SITE.texts || {};
    document.querySelectorAll('[data-text]').forEach(el => { const v = T[el.getAttribute('data-text')]; if (v) el.innerHTML = escH(v).replace(/\n/g, '<br>'); });
    document.querySelectorAll('[data-kakao-row]').forEach(el => { el.style.display = SITE.kakao ? '' : 'none'; const a = el.querySelector('a[data-kakao]'); if (a) a.href = SITE.kakao || '#'; });
    document.querySelectorAll('[data-hours]').forEach(el => { el.style.display = SITE.hours ? '' : 'none'; });
    // 이미지 팝업창 (홈 첫 방문 · 하루 동안 닫기 가능)
    const P = T.popup || {}, isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    const hideUntil = (() => { try { return localStorage.getItem('nw_popup_hide') || ''; } catch (e) { return ''; } })();
    const d1 = new Date(), todayS = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
    const showPop = P.on && P.image && (P.pages === 'all' || isHome) && (!P.from || P.from <= todayS) && (!P.to || P.to >= todayS) && hideUntil !== todayS && !document.body.classList.contains('admin') && !new URLSearchParams(location.search).get('only');
    let pop = document.getElementById('nwPopup');
    if (showPop && !pop && !fill.popShown) {
      fill.popShown = true;
      pop = document.createElement('div'); pop.id = 'nwPopup'; pop.className = 'nw-popup';
      pop.innerHTML = `<div class="nw-popup-box"><button type="button" class="nw-popup-x" aria-label="닫기">×</button>${P.link ? `<a href="${escH(P.link)}" class="nw-popup-img">` : '<div class="nw-popup-img">'}<img src="${escH(P.image)}" alt="${escH(P.title || '이벤트')}">${P.link ? '</a>' : '</div>'}<div class="nw-popup-bar"><label><input type="checkbox" id="nwPopupToday"> 오늘 하루 보지 않기</label><button type="button" class="nw-popup-close">닫기</button></div></div>`;
      document.body.appendChild(pop);
      const close = () => { try { if (document.getElementById('nwPopupToday').checked) localStorage.setItem('nw_popup_hide', todayS); } catch (e) {} pop.remove(); };
      pop.querySelector('.nw-popup-x').addEventListener('click', close); pop.querySelector('.nw-popup-close').addEventListener('click', close);
      pop.addEventListener('click', e => { if (e.target === pop) close(); });
      const lk = pop.querySelector('a.nw-popup-img'); if (lk) lk.addEventListener('click', () => { try { localStorage.setItem('nw_popup_hide', todayS); } catch (e) {} pop.remove(); });
    } else if (!showPop && pop && !fill.popShown) pop.remove();
    // 공지 배너 (기간 안에서만)
    const d0 = new Date(), n = T.notice || {}, today = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
    const show = n.on && n.text && (!n.from || n.from <= today) && (!n.to || n.to >= today);
    let bar = document.getElementById('noticeBar');
    if (show) { if (!bar) { bar = document.createElement('div'); bar.id = 'noticeBar'; bar.className = 'notice-bar'; document.body.insertBefore(bar, document.body.firstChild); } bar.innerHTML = '<div class="wrap">📢 ' + escH(n.text) + '</div>'; }
    else if (bar) bar.remove();
  }
  window.NW_RENDER_SITE = function () { renderLogos(); fill(); let adm = false; try { adm = !!sessionStorage.getItem('nw_admin_token'); } catch (e) {} document.querySelectorAll('[data-admin-only]').forEach(el => { el.style.display = adm ? '' : 'none'; }); };

  document.addEventListener('DOMContentLoaded', () => {
    NW_RENDER_SITE();
    // 모바일 메뉴
    const mb = document.querySelector('.menu-btn'), nav = document.querySelector('nav.main');
    if (mb && nav) { mb.addEventListener('click', () => nav.classList.toggle('open')); nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open'))); }
    // 라이트박스
    const lb = document.querySelector('.lb');
    if (lb) {
      const img = lb.querySelector('img');
      document.querySelectorAll('.gallery figure').forEach(f => f.addEventListener('click', () => { img.src = f.querySelector('img').dataset.full || f.querySelector('img').src; lb.classList.add('open'); }));
      lb.addEventListener('click', () => lb.classList.remove('open'));
    }
    // 갤러리 필터
    document.querySelectorAll('.filters').forEach(fl => {
      const target = fl.dataset.target ? document.querySelector(fl.dataset.target) : null; if (!target) return;
      fl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        fl.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        const k = b.dataset.f;
        target.querySelectorAll('figure').forEach(f => { f.style.display = (k === 'all' || f.dataset.cat === k) ? '' : 'none'; });
      }));
    });
    // 문의 폼 → mailto (이메일 자동전송은 보류 상태)
    const cf = document.querySelector('form.f');
    if (cf) {
      if (new URLSearchParams(location.search).get('sample')) { const ps = cf.querySelector('select[name=product]'); if (ps) { ps.value = '무료 샘플 신청 (30×50 cm)'; const msg = cf.querySelector('textarea[name=msg]'); if (msg && !msg.value) msg.value = '무료 샘플(가로 30 × 세로 50 cm) 신청합니다.\n받을 주소: '; } setTimeout(() => cf.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }
      // 현장 사진 첨부: 미리보기 + 긴 변 1600px 로 축소 (최대 8장)
      let photos = [];
      const fin = cf.querySelector('#cfPhotos'), pv = cf.querySelector('#cfPreview');
      const shrink = file => new Promise(res => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => res(new File([b], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.85); URL.revokeObjectURL(img.src); }; img.onerror = () => res(file); img.src = URL.createObjectURL(file); });
      const render = () => { pv.innerHTML = photos.map((f, i) => `<div class="p"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-i="${i}" aria-label="삭제">×</button></div>`).join(''); };
      if (fin) fin.addEventListener('change', async () => { for (const f of fin.files) { if (photos.length >= 8) break; photos.push(await shrink(f)); } fin.value = ''; render(); });
      if (pv) pv.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; photos.splice(+b.dataset.i, 1); render(); });
      cf.addEventListener('submit', async e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(cf).entries());
        const list = photos.length ? `\n첨부 사진 ${photos.length}장: ${photos.map(f => f.name).join(', ')}` : '';
        const body = `[나무의공간 홈페이지 문의]\n이름: ${d.name}\n연락처: ${d.tel}\n관심 제품: ${d.product}\n내용:\n${d.msg}${list}`;
        const subject = `[문의] ${d.name} 님 · ${d.product}`;
        const btn = cf.querySelector('button[type=submit]'); if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
        const doc = { kind: 'contact', title: '문의 접수서', customer: { name: d.name, tel: d.tel, email: d.email || '', addr: d.product }, message: d.msg, notes: ['담당자가 내용을 확인한 뒤 연락드립니다. 현장 사진이 있으면 상담이 빨라집니다.'] };
        const sent = await NW_SEND({ type: 'contact', subject, text: body, customer: { name: d.name, tel: d.tel, email: d.email || '' }, doc, files: photos });
        if (btn) { btn.disabled = false; btn.textContent = '이메일로 문의 보내기'; }
        if (sent) { const note = cf.querySelector('#cfNote'); if (note) note.innerHTML = `<b>문의가 접수되었습니다.</b> 담당자가 확인 후 연락드리겠습니다.`; cf.reset(); photos = []; render(); return; }
        if (photos.length && navigator.canShare && navigator.canShare({ files: photos })) { // 휴대폰: 사진 첨부 공유
          try { await navigator.share({ files: photos, title: subject, text: body + `\n받는 곳: ${SITE.email}` }); return; } catch (err) { if (err.name === 'AbortError') return; }
        }
        location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + (photos.length ? '\n\n※ 선택하신 현장 사진을 이 메일에 첨부해 주세요.' : ''))}`;
        const note = cf.querySelector('#cfNote'); if (note && photos.length) note.innerHTML = `메일 앱이 열렸습니다. <b>선택한 사진 ${photos.length}장을 메일에 직접 첨부</b>해서 보내 주세요. 메일 앱이 열리지 않으면 <b>${SITE.email}</b> 로 보내 주세요.`;
      });
    }
  });
})();
