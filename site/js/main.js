// 나무의공간 공통 스크립트 — 회사 정보는 여기 한 곳만 고치면 모든 페이지에 반영됩니다.
window.SITE = {
  name: '나무의공간',
  ceo: '이영석',
  tel: '010-3509-2230',
  email: 'ykj5359@daum.net',       // 주문서 수신 이메일
  email2: 'dldudtjr2230@hanmail.net', // 대표 이메일 (사업자등록증 메모)
  bizname: '둥지인테리어',           // 사업자등록증상 상호
  address: '충청남도 홍성군 서부면 지산1길 25-17',
  bizno: '131-36-54075',
  kakao: '',                       // 카카오톡 채널 주소 (미정)
  defaultLogo: 1,                  // 기본 로고 번호 (logo.html 에서 선택하면 브라우저에 저장됨)
  // 이메일 자동 전송(EmailJS) — 계정 발급 후 아래 세 값을 채우면 주문서가 자동 발송됩니다.
  emailjs: { publicKey: '', serviceId: '', templateId: '' },
};

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

  // 전화·정보 치환: [data-site="tel"] 등
  function fill() {
    document.querySelectorAll('[data-site]').forEach(el => {
      const k = el.getAttribute('data-site');
      if (SITE[k] !== undefined) el.textContent = SITE[k];
    });
    document.querySelectorAll('a[data-tel]').forEach(a => { a.href = 'tel:' + SITE.tel.replace(/-/g, ''); });
    document.querySelectorAll('a[data-mail]').forEach(a => { a.href = 'mailto:' + SITE.email; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderLogos(); fill();
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
      const target = document.querySelector(fl.dataset.target);
      fl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        fl.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on');
        const k = b.dataset.f;
        target.querySelectorAll('figure').forEach(f => { f.style.display = (k === 'all' || f.dataset.cat === k) ? '' : 'none'; });
      }));
    });
    // 문의 폼 → mailto (이메일 자동전송은 보류 상태)
    const cf = document.querySelector('form.f');
    if (cf) cf.addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(cf).entries());
      const body = `[나무의공간 홈페이지 문의]\n이름: ${d.name}\n연락처: ${d.tel}\n관심 제품: ${d.product}\n내용:\n${d.msg}`;
      location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('[문의] ' + d.name + ' 님')}&body=${encodeURIComponent(body)}`;
    });
  });
})();
