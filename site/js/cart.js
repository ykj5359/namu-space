// 장바구니·금액 계산·우측 주문내역 팝업 (모든 페이지 공용)
// 저장: localStorage 'nw_cart' = { items: [...], customer: {...} }
// item: { id, dir, A, B, D, F, G, corner, K, finish, install, qty, calc: {C, D, Ereal, Gadj, n, totalBattens, totW, totH, sheets, area, meters}, thumb(dataURL), sheet(dataURL), addedAt }
(function () {
  const KEY = 'nw_cart';
  const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { items: [], customer: {} }; } catch (e) { return { items: [], customer: {} }; } };
  const save = c => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { alert('저장 공간이 부족합니다. 장바구니의 도면을 일부 삭제해 주세요.'); } document.dispatchEvent(new CustomEvent('cart:change')); };

  // ---- 금액 산정 (예상 금액 · SITE.price 에서 단가 조정) ----
  function price(item) {
    const P = SITE.price, a = item.calc.area;                       // 1장 면적(㎡, 코너 돌림 포함)
    const base = (item.finish === '무도장' ? P.natural : P.stain) * a;
    const corner = item.corner === 'none' ? 0 : (item.corner === 'both' ? 2 : 1) * P.corner;
    const install = item.install === '현장 시공 포함' ? P.install * a : 0;
    const ex = item.finish === '추가옵션' ? (item.extra === '합판 흑도장' ? (P.plyBlack || 0) : (P.paint || 0)) * a : 0; // 추가옵션 추가금 (㎡당)
    const ply = ex;
    const unit = Math.max(P.min, Math.round((base + corner + install + ply) / 100) * 100);
    return { unit, sub: unit * item.qty };
  }
  // 원가 (관리자 참고): 각재 30×30-3600 본 수×단가 + 합판 원장 수×단가 + 인건비 ㎡ + 스테인 재료비 ㎡
  //  각재 본 수 = 각재 개수 ÷ (1본 3600에서 나오는 토막 수, 각재 길이 C 기준)
  function cost(item) {
    const C = SITE.cost || {}, k = item.calc, a = k.area, len = C.battenLen || 3600;
    const perStick = Math.max(1, Math.floor(len / Math.max(1, k.C || len)));
    const sticks = Math.ceil((k.totalBattens || 0) / perStick);
    const battens = sticks * (C.batten || 0), ply = (k.sheets || 0) * (C.plywood || 0), labor = a * (C.labor || 0), stain = item.finish === '무도장' ? 0 : a * (C.stain || 0);
    const unit = Math.round(battens + ply + labor + stain);
    return { sticks, perStick, battens, ply, labor, stain, unit, sub: unit * item.qty };
  }
  function totals(items) {
    const supply = items.reduce((s, it) => s + price(it).sub, 0);
    const vat = SITE.price && SITE.price.vat === false ? 0 : Math.round(supply * 0.1);
    return { supply, vat, total: supply + vat, count: items.reduce((s, it) => s + it.qty, 0) };
  }
  const label = it => `${it.dir === 'v' ? '세로' : '가로'} ${it.A}×${it.B}${it.corner !== 'none' ? ' · 코너 ' + ({ left: '좌', right: '우', both: '양쪽' })[it.corner] + ' K' + it.K : ''} · ${it.finishText || it.finish}${it.install === '현장 시공 포함' ? ' · 시공' : ''}`;

  const api = {
    get: load, save, price, cost, totals, won, label,
    items: () => load().items,
    add(item) { const c = load(); item.id = 'i' + Date.now().toString(36); item.addedAt = Date.now(); c.items.push(item); save(c); return item.id; },
    update(id, patch) { const c = load(); const it = c.items.find(x => x.id === id); if (it) Object.assign(it, patch); save(c); },
    remove(id) { const c = load(); c.items = c.items.filter(x => x.id !== id); save(c); },
    clear() { const c = load(); c.items = []; save(c); },
    customer(patch) { const c = load(); if (patch) { c.customer = Object.assign(c.customer || {}, patch); save(c); } return c.customer || {}; },
    find: id => load().items.find(x => x.id === id),
  };
  window.NW_CART = api;

  // ---- 우측 주문내역 플로팅 버튼 + 팝업 ----
  function mountPanel() {
    if (document.getElementById('cartFab') || new URLSearchParams(location.search).get('only') === '1') return; // 도면 캡처 모드(only=1)에서는 표시 안 함
    const fab = document.createElement('button'); fab.id = 'cartFab'; fab.className = 'cart-fab'; fab.type = 'button'; fab.innerHTML = '주문내역<b id="cartFabN">0</b>';
    const pop = document.createElement('aside'); pop.id = 'cartPop'; pop.className = 'cart-pop';
    document.body.appendChild(fab); document.body.appendChild(pop);
    fab.addEventListener('click', () => { pop.classList.toggle('open'); render(); });
    document.addEventListener('click', e => { if (e.target.closest('#btnAdd, #cartPop, #cartFab')) return; pop.classList.remove('open'); });
    render();
  }
  function render() {
    const items = api.items(), t = totals(items);
    const n = document.getElementById('cartFabN'); if (n) { n.textContent = t.count; n.style.display = t.count ? '' : 'none'; }
    const pop = document.getElementById('cartPop'); if (!pop) return;
    const base = location.pathname.endsWith('/') ? '' : '';
    pop.innerHTML = `<div class="cp-head"><b>주문내역</b><span>${items.length}건 · ${t.count}장</span><button type="button" class="cp-x" aria-label="닫기">×</button></div>
      ${items.length ? `<ul class="cp-list">${items.map(it => `<li><img src="${it.thumb}" alt=""><div><b>${label(it)}</b><span>${it.qty}장 × ${won(price(it).unit)}</span></div><em>${won(price(it).sub)}</em></li>`).join('')}</ul>
      <div class="cp-sum"><div><span>공급가</span><b>${won(t.supply)}</b></div><div><span>${t.vat ? '부가세 10%' : '부가세 없음'}</span><b>${won(t.vat)}</b></div><div class="tot"><span>예상 합계</span><b>${won(t.total)}</b></div><p>예상 금액입니다. 실제 견적은 접수 후 확인해 드립니다.</p></div>
      <div class="cp-btns"><a class="btn ghost sm" href="cart.html">장바구니로 가기</a><a class="btn wood sm" href="checkout.html">결제하기</a></div>`
      : `<p class="cp-empty">담긴 도면이 없습니다.<br>도면에 치수를 넣고 <b>장바구니에 담기</b>를 눌러 주세요.</p><div class="cp-btns"><a class="btn wood sm" href="order.html">도면으로 주문하기</a></div>`}`;
    pop.querySelector('.cp-x').addEventListener('click', () => pop.classList.remove('open'));
  }
  api.render = render;
  api.open = () => { const p = document.getElementById('cartPop'); if (p) { p.classList.add('open'); render(); } };
  document.addEventListener('cart:change', render);
  document.addEventListener('DOMContentLoaded', mountPanel);
})();
