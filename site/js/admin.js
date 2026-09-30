// 관리자 페이지 — 구글 앱스 스크립트(SITE.orderEndpoint)와 통신해 접수·입금·매출·설정을 관리
(function () {
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const won = n => Math.round(+n || 0).toLocaleString('ko-KR') + '원';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const TOKEN = 'nw_admin_token';
  let token = sessionStorage.getItem(TOKEN) || '';
  let D = { rows: [], payments: [], cancels: [], sales: [], config: null, statuses: [] };
  let cfgDraft = null;

  // 삭제 확인: 브라우저 확인창 대신 같은 버튼을 5초 안에 한 번 더 누르면 실행
  function armed(btn, fn) {
    if (btn.dataset.armed) { clearTimeout(+btn.dataset.t); delete btn.dataset.armed; btn.textContent = btn.dataset.label; btn.classList.remove('armed'); fn(); return; }
    btn.dataset.label = btn.textContent; btn.dataset.armed = '1'; btn.classList.add('armed'); btn.textContent = (btn.dataset.armText || '정말 삭제?') + ' 한 번 더 클릭';
    btn.dataset.t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn.dataset.label; btn.classList.remove('armed'); }, 5000);
  }
  const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.style.background = bad ? '#b91c1c' : ''; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); };
  async function api(action, data) {
    if (!SITE.orderEndpoint) throw new Error('접수 주소(SITE.orderEndpoint)가 비어 있습니다');
    const r = await fetch(SITE.orderEndpoint, { method: 'POST', body: JSON.stringify(Object.assign({ action, token }, data || {})), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    const j = await r.json();
    if (j.error === 'auth') { logout(); throw new Error('로그인이 만료되었습니다'); }
    if (!j.ok) throw new Error(j.error || '실패');
    return j;
  }

  // ---------------- 로그인 ----------------
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#loginBtn'); b.disabled = true; b.textContent = '확인 중…'; $('#loginErr').textContent = '';
    try { const j = await api('login', { pw: $('#pw').value }); token = j.token; sessionStorage.setItem(TOKEN, token); $('#pw').value = ''; await enter(); }
    catch (err) { $('#loginErr').textContent = err.message; }
    b.disabled = false; b.textContent = '로그인';
  });
  function logout() { token = ''; sessionStorage.removeItem(TOKEN); $('#app').style.display = 'none'; $('#login').style.display = ''; }
  $('#btnLogout').addEventListener('click', logout);
  $('#btnReload').addEventListener('click', () => load(true));

  async function enter() { $('#login').style.display = 'none'; $('#app').style.display = ''; await load(); }
  async function load(quiet) {
    try {
      const j = await api('admin.list'); D = j; cfgDraft = JSON.parse(JSON.stringify(j.config));
      $('#lnkSheet').href = j.sheetUrl || '#';
      const fs = $('#fStatus'); fs.innerHTML = '<option value="">전체 상태</option>' + D.statuses.map(s => `<option>${s}</option>`).join('');
      renderAll(); if (quiet) toast('새로고침 완료');
    } catch (err) { if (token) { toast(err.message, true); document.querySelector('#v-dash').innerHTML = `<div class="ad-panel" style="color:#b91c1c"><b>데이터를 불러오지 못했습니다.</b><br><small>${String(err.message).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</small></div>`; } }
  }

  // ---------------- 탭 ----------------
  let view = 'dash';
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; show(b.dataset.v); });
  function show(v) { view = v; $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); $$('.ad-view').forEach(s => s.style.display = s.id === 'v-' + v ? '' : 'none'); }
  function renderAll() { renderDash(); renderList(); renderPay(); renderSales(); renderSettings(); renderAccount(); }

  // ---------------- 대시보드 ----------------
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function renderDash() {
    const now = today().slice(0, 7), year = now.slice(0, 4);
    const m = D.sales.find(s => s.month === now) || { orders: 0, sales: 0, paid: 0, due: 0, contacts: 0, cost: 0 };
    const y = D.sales.filter(s => s.month.startsWith(year)).reduce((a, s) => { a.orders += s.orders; a.sales += s.sales; a.paid += s.paid; a.due += s.due; a.contacts += s.contacts; a.cost += s.cost; return a; }, { orders: 0, sales: 0, paid: 0, due: 0, contacts: 0, cost: 0 });
    const dueAll = D.rows.filter(r => r.type !== '문의' && r.status !== '취소').reduce((s, r) => s + Math.max(0, (+r.total || 0) - (+r.paid || 0)), 0);
    const cnt = {}; D.rows.forEach(r => { cnt[r.status] = (cnt[r.status] || 0) + 1; });
    const active = D.rows.filter(r => r.type !== '문의' && !['완료', '취소'].includes(r.status)).length;
    $('#v-dash').innerHTML = `
      <div class="ad-cards">
        <div class="ad-card"><small>이번 달 수주 (${now})</small><b>${won(m.sales)}</b><em>${m.orders}건</em></div>
        <div class="ad-card"><small>이번 달 입금</small><b>${won(m.paid)}</b></div>
        <div class="ad-card"><small>미수금 (전체)</small><b style="color:${dueAll ? '#b91c1c' : 'inherit'}">${won(dueAll)}</b></div>
        <div class="ad-card"><small>진행 중 주문</small><b>${active}건</b><em>문의 ${m.contacts}건 이달</em></div>
        <div class="ad-card"><small>${year}년 누적 수주</small><b>${won(y.sales)}</b><em>${y.orders}건</em></div>
        <div class="ad-card"><small>${year}년 누적 입금</small><b>${won(y.paid)}</b><em>원가 ${won(y.cost)}</em></div>
      </div>
      <div class="ad-grid2">
        <div class="ad-panel"><h2>상태별 건수</h2><div class="ad-actions">${D.statuses.map(s => `<button type="button" class="st" data-s="${s}" data-go="${s}">${s} ${cnt[s] || 0}</button>`).join('')}</div></div>
        <div class="ad-panel"><h2>바로 가기 <small>스프레드시트·도면 폴더</small></h2><div class="ad-actions"><a class="btn light sm" href="${esc(D.sheetUrl)}" target="_blank" rel="noopener">📊 접수대장 시트</a><a class="btn light sm" href="${esc(D.folderUrl)}" target="_blank" rel="noopener">📁 도면·사진 폴더</a><a class="btn light sm" href="index.html" target="_blank">🏠 홈페이지</a></div></div>
      </div>
      <div class="ad-panel"><h2>최근 접수 <small>최근 8건</small></h2>${rowsTable(D.rows.slice(0, 8))}</div>`;
    $('#v-dash').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { $('#fStatus').value = b.dataset.go; $('#fType').value = ''; renderList(); show('list'); }));
    bindRows($('#v-dash'));
  }
  function rowsTable(rows) {
    if (!rows.length) return '<div class="ad-empty">접수 내역이 없습니다.</div>';
    return `<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>번호</th><th>접수일시</th><th>구분</th><th>이름</th><th>연락처</th><th>내역</th><th class="r">합계</th><th class="r">입금</th><th>상태</th></tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table></div>`;
  }
  const rowHtml = r => `<tr data-no="${esc(r.no)}"><td class="mono">${esc(r.no)}</td><td>${esc(r.at)}</td><td class="ad-type">${esc(r.type)}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.tel)}</td><td class="wrap">${esc(String(r.subject).replace(/^\[[^\]]*\]\s*/, ''))}</td><td class="r">${r.type === '문의' ? '-' : won(r.total)}</td><td class="r">${r.type === '문의' ? '-' : won(r.paid)}</td><td><span class="st" data-s="${esc(r.status)}">${esc(r.status)}</span></td></tr>`;
  function bindRows(root) { root.querySelectorAll('tr[data-no]').forEach(tr => tr.addEventListener('click', () => openDetail(tr.dataset.no))); }

  // ---------------- 접수·주문 목록 ----------------
  ['fType', 'fStatus', 'fQ'].forEach(id => $('#' + id).addEventListener('input', renderList));
  function renderList() {
    const t = $('#fType').value, s = $('#fStatus').value, q = $('#fQ').value.trim().toLowerCase();
    const rows = D.rows.filter(r => (!t || r.type === t) && (!s || r.status === s) && (!q || [r.name, r.tel, r.no, r.addr, r.email, r.subject].join(' ').toLowerCase().includes(q)));
    $('#listCount').textContent = `${rows.length}건 · 합계 ${won(rows.reduce((a, r) => a + (r.type === '문의' ? 0 : +r.total || 0), 0))}`;
    const tb = $('#listTable tbody'); tb.innerHTML = rows.length ? rows.map(rowHtml).join('') : '<tr><td colspan="9" class="ad-empty">해당하는 접수가 없습니다.</td></tr>';
    bindRows(tb);
  }

  // ---------------- 상세 ----------------
  function openDetail(no) {
    const r = D.rows.find(x => x.no === no); if (!r) return;
    const pays = D.payments.filter(p => p.no === no);
    const files = String(r.files || '').split(/\n/).filter(Boolean);
    const isOrder = r.type !== '문의';
    $('#detailBox').innerHTML = `
      <h2><span>${esc(r.type)} <span class="mono">${esc(r.no)}</span></span><button type="button" class="x" data-x>×</button></h2>
      <form id="dForm" class="ad-form">
        <div class="row3">
          <label>이름 <input name="name" value="${esc(r.name)}"></label>
          <label>연락처 <input name="tel" value="${esc(r.tel)}"></label>
          <label>이메일 <input name="email" value="${esc(r.email)}"></label>
        </div>
        <label>배송 주소 <input name="addr" value="${esc(r.addr)}"></label>
        <div class="row3">
          <label>상태 <select name="status">${D.statuses.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label>결제 방식 <input name="method" value="${esc(r.method)}" placeholder="카드 / 계좌이체 / 무통장"></label>
          <label>접수일시 <input value="${esc(r.at)}" disabled></label>
        </div>
        ${isOrder ? `<div class="row3">
          <label>공급가 <input name="supply" type="number" value="${+r.supply || 0}"></label>
          <label>부가세 <input name="vat" type="number" value="${+r.vat || 0}"></label>
          <label>합계(확정 견적) <input name="total" type="number" value="${+r.total || 0}"></label>
        </div>
        <div class="row3">
          <label>원가(추정) <input name="cost" type="number" value="${+r.cost || 0}"></label>
          <label>수량 / 면적 <input value="${esc(r.qty)}장 / ${esc(r.area)}㎡" disabled></label>
          <label>입금액 / 미수 <input value="${won(r.paid)} / ${won(Math.max(0, (+r.total || 0) - (+r.paid || 0)))}" disabled></label>
        </div>` : ''}
        <label id="cancelRow" style="display:none">취소 사유 <input name="cancelReason" placeholder="예: 고객 요청 / 견적 불일치 / 연락 두절"></label>
        <label>메모 (관리자) <textarea name="memo">${esc(r.memo)}</textarea></label>
        <div class="ad-actions"><button type="submit" class="btn wood sm">저장</button><a class="btn light sm" href="tel:${esc(String(r.tel).replace(/-/g, ''))}">📞 전화</a><a class="btn light sm" href="sms:${esc(String(r.tel).replace(/-/g, ''))}">💬 문자</a>${r.email ? `<a class="btn light sm" href="mailto:${esc(r.email)}">✉ 메일</a>` : ''}${r.status !== '취소' ? `<button type="button" class="btn light sm" id="dCancel" style="color:#b91c1c">✕ 취소</button>` : `<button type="button" class="btn light sm" id="dRestore" data-arm-text="정말 복원?" style="color:var(--green)">↺ 취소 복원</button>`}<button type="button" class="btn ghost sm" id="dDel" style="margin-left:auto;color:#b91c1c;border-color:#b91c1c">접수 삭제</button></div>
      </form>
      <div><b style="font-size:14px">접수 내용</b><pre class="ad-pre">${esc(r.text)}</pre></div>
      ${files.length ? `<div class="ad-files"><b style="font-size:14px">도면·사진</b><br>${files.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">파일 ${i + 1} 열기</a>`).join('')}</div>` : ''}
      ${isOrder ? `<div class="ad-panel" style="padding:14px 16px">
        <h2>입금 내역 <small>${pays.length}건 · ${won(pays.reduce((a, p) => a + (+p.amount || 0), 0))}</small></h2>
        <div class="ad-paylist">${pays.map(p => `<div><span>${esc(p.date)}</span><span>${esc(p.method)} ${esc(p.memo)}</span><b>${won(p.amount)}</b><button type="button" data-del="${esc(p.id)}">삭제</button></div>`).join('') || '<div style="grid-template-columns:1fr;color:var(--ink-3)">등록된 입금이 없습니다.</div>'}</div>
        <form id="payForm" class="ad-form" style="margin-top:12px"><div class="row3">
          <label>입금일 <input name="date" type="date" value="${today()}"></label>
          <label>금액 <input name="amount" type="number" required placeholder="${Math.max(0, (+r.total || 0) - (+r.paid || 0))}"></label>
          <label>방법 <select name="method"><option>계좌이체</option><option>카드</option><option>현금</option><option>가상계좌</option><option>기타</option></select></label>
        </div><div class="row2"><label>메모 <input name="memo" placeholder="입금자명 등"></label><label>&nbsp;<button type="submit" class="btn sm">입금 등록</button></label></div></form>
      </div>` : ''}`;
    $('#detail').style.display = '';
    $('#detailBox [data-x]').addEventListener('click', closeDetail);
    const stSel = $('#dForm [name=status]'), cancelRow = $('#cancelRow');
    stSel.addEventListener('change', () => { cancelRow.style.display = stSel.value === '취소' && r.status !== '취소' ? '' : 'none'; });
    // 취소 버튼: 1) 사유 입력칸 열기 → 2) 사유를 적고 다시 누르면 바로 취소 저장
    const dc = $('#dCancel'); if (dc) dc.addEventListener('click', async () => {
      const inp = $('#dForm [name=cancelReason]');
      if (cancelRow.style.display === 'none') { stSel.value = '취소'; stSel.dispatchEvent(new Event('change')); dc.textContent = '✕ 취소 저장'; dc.classList.add('armed'); inp.scrollIntoView({ block: 'center' }); inp.focus(); toast('취소 사유를 적고 다시 취소를 누르세요'); return; }
      const reason = inp.value.trim(); if (!reason) { toast('취소 사유를 입력해 주세요', true); inp.focus(); return; }
      dc.disabled = true; dc.textContent = '처리 중…';
      try { await api('admin.update', { no, patch: { status: '취소', cancelReason: reason, memo: $('#dForm [name=memo]').value } }); toast('취소 처리했습니다'); await load(); openDetail(no); }
      catch (err) { toast(err.message, true); dc.disabled = false; dc.textContent = '✕ 취소 저장'; }
    });
    const dr = $('#dRestore'); if (dr) dr.addEventListener('click', e => armed(e.currentTarget, async () => {
      dr.disabled = true; dr.textContent = '복원 중…';
      try { const j = await api('admin.restore', { no }); toast(`취소를 복원했습니다 (${j.status})`); await load(); openDetail(no); }
      catch (err) { toast(err.message, true); dr.disabled = false; dr.textContent = '↺ 취소 복원'; }
    }));
    const inpEnter = $('#dForm [name=cancelReason]'); if (inpEnter) inpEnter.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); dc && dc.click(); } });
    $('#dForm').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, patch = {};
      ['name', 'tel', 'email', 'addr', 'status', 'method', 'memo', 'supply', 'vat', 'total', 'cost'].forEach(k => { if (f[k]) patch[k] = f[k].type === 'number' ? +f[k].value : f[k].value; });
      if (patch.status === '취소' && r.status !== '취소') { patch.cancelReason = f.cancelReason.value.trim(); if (!patch.cancelReason) { toast('취소 사유를 입력해 주세요', true); f.cancelReason.focus(); return; } }
      try { await api('admin.update', { no, patch }); toast('저장했습니다'); await load(); openDetail(no); } catch (err) { toast(err.message, true); }
    });
    $('#dDel').addEventListener('click', e => armed(e.currentTarget, async () => { const b = $('#dDel'); b.disabled = true; b.textContent = '삭제 중…'; try { await api('admin.delete', { no }); toast('접수를 삭제했습니다'); closeDetail(); await load(); } catch (err) { toast(err.message, true); b.disabled = false; b.textContent = '접수 삭제'; } }));
    const pf = $('#payForm');
    if (pf) pf.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      try { await api('admin.pay', { pay: { no, name: r.name, date: f.date.value, amount: +f.amount.value, method: f.method.value, memo: f.memo.value } }); toast('입금을 등록했습니다'); await load(); openDetail(no); } catch (err) { toast(err.message, true); }
    });
    $$('#detailBox [data-del]').forEach(b => b.addEventListener('click', e => armed(e.currentTarget, async () => { try { await api('admin.delPay', { id: b.dataset.del }); toast('입금 기록을 삭제했습니다'); await load(); openDetail(no); } catch (err) { toast(err.message, true); } })));
  }
  function closeDetail() { $('#detail').style.display = 'none'; }
  $('#detail').addEventListener('click', e => { if (e.target.id === 'detail') closeDetail(); });

  // ---------------- 입금 ----------------
  $('#pQ').addEventListener('input', renderPay);
  function renderPay() {
    const q = $('#pQ').value.trim().toLowerCase();
    const pays = D.payments.filter(p => !q || [p.name, p.no, p.memo].join(' ').toLowerCase().includes(q));
    $('#payCount').textContent = `${pays.length}건 · ${won(pays.reduce((a, p) => a + (+p.amount || 0), 0))}`;
    const tb = $('#payTable tbody');
    tb.innerHTML = pays.length ? pays.map(p => `<tr data-no="${esc(p.no)}"><td>${esc(p.date)}</td><td class="mono">${esc(p.no)}</td><td><b>${esc(p.name)}</b></td><td class="r">${won(p.amount)}</td><td>${esc(p.method)}</td><td class="wrap">${esc(p.memo)}</td><td><button type="button" class="ad-ic" data-del="${esc(p.id)}" title="삭제" style="width:30px;height:30px;font-size:13px">✕</button></td></tr>`).join('') : '<tr><td colspan="7" class="ad-empty">입금 내역이 없습니다.</td></tr>';
    const cq = (D.cancels || []).filter(c => !q || [c.name, c.no, c.reason].join(' ').toLowerCase().includes(q));
    $('#cancelTable tbody').innerHTML = cq.length ? cq.map(c => `<tr data-no="${esc(c.no)}"><td>${esc(c.at)}</td><td class="mono">${esc(c.no)}</td><td class="ad-type">${esc(c.type)}</td><td><b>${esc(c.name)}</b></td><td class="r">${won(c.total)}</td><td class="r">${won(c.paid)}</td><td>${esc(c.prevStatus)}</td><td class="wrap">${esc(c.reason)}</td></tr>`).join('') : '<tr><td colspan="8" class="ad-empty">취소 내역이 없습니다.</td></tr>';
    $('#cancelCount').textContent = `${cq.length}건`;
    bindRows($('#cancelTable tbody'));
    bindRows(tb);
    tb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); armed(b, async () => { try { await api('admin.delPay', { id: b.dataset.del }); toast('입금 기록을 삭제했습니다'); await load(); } catch (err) { toast(err.message, true); } }); }));
  }

  // ---------------- 매출 ----------------
  function renderSales() {
    const years = [...new Set(D.sales.map(s => s.month.slice(0, 4)))].sort().reverse();
    const cur = renderSales.year && years.includes(renderSales.year) ? renderSales.year : (years[0] || String(new Date().getFullYear()));
    renderSales.year = cur;
    const rows = D.sales.filter(s => s.month.startsWith(cur));
    const t = rows.reduce((a, s) => { a.orders += s.orders; a.sales += s.sales; a.cost += s.cost; a.paid += s.paid; a.due += s.due; a.contacts += s.contacts; a.cancels += s.cancels || 0; return a; }, { orders: 0, sales: 0, cost: 0, paid: 0, due: 0, contacts: 0, cancels: 0 });
    const max = Math.max(1, ...rows.map(s => Math.max(s.sales, s.paid)));
    $('#v-sales').innerHTML = `
      <div class="ad-filters"><select id="sYear">${years.map(y => `<option ${y === cur ? 'selected' : ''}>${y}</option>`).join('') || `<option>${cur}</option>`}</select><span class="ad-count">수주는 접수일 기준(취소 제외), 입금은 입금일 기준 · 매출은 입금액으로 집계</span><button type="button" class="btn light sm" id="btnCsv" style="margin-left:auto">CSV 내려받기</button></div>
      <div class="ad-cards">
        <div class="ad-card"><small>${cur}년 수주</small><b>${won(t.sales)}</b><em>${t.orders}건</em></div>
        <div class="ad-card"><small>${cur}년 입금(매출)</small><b>${won(t.paid)}</b></div>
        <div class="ad-card"><small>미수금</small><b>${won(t.due)}</b></div>
        <div class="ad-card"><small>원가(추정) / 예상 마진</small><b>${won(t.cost)}</b><em>${won(t.sales - t.cost)}</em></div>
        <div class="ad-card"><small>문의</small><b>${t.contacts}건</b></div>
      </div>
      <div class="ad-grid2">
        <div class="ad-panel"><h2>월별 수주·입금 <small>갈색 수주 · 녹색 입금</small></h2><div class="ad-bars">${[...rows].reverse().map(s => `<div><span>${s.month.slice(5)}월</span><span><i style="width:${s.sales / max * 100}%"></i><i class="p" style="width:${s.paid / max * 100}%;margin-top:2px"></i></span><b>${won(s.sales)}<br><span style="color:var(--green)">${won(s.paid)}</span></b></div>`).join('') || '<div class="ad-empty">데이터가 없습니다.</div>'}</div></div>
        <div class="ad-table-wrap"><table class="ad-table" style="min-width:0"><thead><tr><th>월</th><th class="r">주문</th><th class="r">수주액</th><th class="r">입금액</th><th class="r">미수</th><th class="r">원가</th><th class="r">문의</th><th class="r">취소</th></tr></thead><tbody>${rows.map(s => `<tr><td>${s.month}</td><td class="r">${s.orders}</td><td class="r">${won(s.sales)}</td><td class="r">${won(s.paid)}</td><td class="r">${won(s.due)}</td><td class="r">${won(s.cost)}</td><td class="r">${s.contacts}</td><td class="r">${s.cancels || 0}</td></tr>`).join('')}<tr style="font-weight:700;background:var(--bg)"><td>합계</td><td class="r">${t.orders}</td><td class="r">${won(t.sales)}</td><td class="r">${won(t.paid)}</td><td class="r">${won(t.due)}</td><td class="r">${won(t.cost)}</td><td class="r">${t.contacts}</td><td class="r">${t.cancels}</td></tr></tbody></table></div>
      </div>`;
    $('#sYear').addEventListener('change', e => { renderSales.year = e.target.value; renderSales(); });
    $('#btnCsv').addEventListener('click', () => {
      const lines = [['월', '주문건수', '수주액', '입금액', '미수금', '원가', '문의', '취소']].concat(rows.map(s => [s.month, s.orders, s.sales, s.paid, s.due, s.cost, s.contacts, s.cancels || 0]));
      const blob = new Blob(['﻿' + lines.map(l => l.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `나무의공간_매출_${cur}.csv`; a.click();
    });
  }

  // ---------------- 설정 ----------------
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const set = (o, p, v) => { const ks = p.split('.'); let a = o; ks.slice(0, -1).forEach(k => { if (typeof a[k] !== 'object' || a[k] === null) a[k] = {}; a = a[k]; }); a[ks[ks.length - 1]] = v; };
  const F = (p, label, opt = {}) => {
    const v = get(cfgDraft, p), t = opt.type || 'text';
    if (t === 'check') return `<label class="chk"><input type="checkbox" data-p="${p}" data-t="check" ${v ? 'checked' : ''}> <span>${label}${opt.help ? ` <small class="help">${opt.help}</small>` : ''}</span></label>`;
    if (t === 'textarea') return `<label>${label}${opt.help ? ` <small class="help">${opt.help}</small>` : ''}<textarea data-p="${p}" data-t="${opt.list ? 'list' : 'text'}" ${opt.rows ? `rows="${opt.rows}"` : ''}>${esc(opt.list ? (v || []).join('\n') : v)}</textarea></label>`;
    if (t === 'select') return `<label>${label}<select data-p="${p}" data-t="${opt.num ? 'num' : 'text'}">${opt.options.map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(v) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select></label>`;
    return `<label>${label}${opt.help ? ` <small class="help">${opt.help}</small>` : ''}<span class="unit"><input type="${t === 'num' ? 'number' : t}" data-p="${p}" data-t="${t === 'num' ? 'num' : 'text'}" value="${esc(v)}" ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''}>${opt.unit ? `<span>${opt.unit}</span>` : ''}</span></label>`;
  };
  function renderSettings() {
    if (!cfgDraft) return;
    const logos = (window.NW_LOGOS || []).map(l => ({ v: l.id, t: `${l.id}. ${l.name}` }));
    $('#v-settings').innerHTML = `<form id="cfgForm" class="ad-form" style="gap:16px">
      <div class="ad-panel"><h2>1. 접수·이메일 <small>접수 메일을 받을 주소를 여러 개 등록할 수 있습니다</small></h2><div class="ad-form">
        <div class="row2">${F('mail.to', '수신 이메일 (한 줄에 하나)', { type: 'textarea', list: true, rows: 3, help: '문의·주문이 오면 전부에게 발송' })}${F('mail.cc', '참조(CC) 이메일 (한 줄에 하나)', { type: 'textarea', list: true, rows: 3 })}</div>
        <div class="row3">${F('mail.fromName', '발신자 표시 이름')}${F('mail.prefix.contact', '문의 제목 접두어')}${F('mail.prefix.order', '주문 제목 접두어')}</div>
        ${F('mail.ackEnabled', '고객에게 접수 확인 메일 자동 발송', { type: 'check', help: '고객이 이메일을 적은 경우' })}
        ${F('mail.ackText', '접수 확인 메일 머리글', { type: 'textarea', rows: 2, help: '{name} → 고객 이름, {tel} → 고객 연락처로 바뀝니다' })}
      </div></div>
      <div class="ad-panel"><h2>2. 회사 정보 <small>홈페이지 하단·문의 영역·주문서에 반영</small></h2><div class="ad-form">
        <div class="row3">${F('company.name', '상호(브랜드)')}${F('company.ceo', '대표')}${F('company.tel', '전화')}</div>
        <div class="row3">${F('company.email', '대표 이메일(표시용)')}${F('company.bizname', '사업자등록 상호')}${F('company.bizno', '사업자등록번호')}</div>
        <div class="row3">${F('company.address', '주소')}${F('company.hours', '상담 가능 시간', { ph: '평일 09:00 ~ 18:00' })}${F('company.kakao', '카카오톡 채널 주소', { ph: 'https://pf.kakao.com/…' })}</div>
      </div></div>
      <div class="ad-panel"><h2>3. 판매 단가 <small>예상 금액 계산에 사용 · 원 단위</small></h2><div class="ad-form">
        <div class="row3">${F('price.stain', '오일 스테인 ㎡당', { type: 'num', unit: '원/㎡' })}${F('price.natural', '무도장 ㎡당', { type: 'num', unit: '원/㎡' })}${F('price.min', '1장 최소 금액', { type: 'num', unit: '원' })}</div>
        <div class="row3">${F('price.corner', '코너 돌림 추가 (1면당)', { type: 'num', unit: '원/면' })}${F('price.install', '현장 시공 ㎡당', { type: 'num', unit: '원/㎡' })}${F('price.plyBlack', '합판 흑도장 추가 ㎡당', { type: 'num', unit: '원/㎡' })}</div>
        <div class="row3">${F('price.paint', '각재·합판 도색 추가 ㎡당', { type: 'num', unit: '원/㎡' })}<div>${F('price.vat', '부가세 10% 별도 표시', { type: 'check', help: '끄면 부가세 0원' })}</div></div>
      </div></div>
      <div class="ad-panel"><h2>4. 원가 기준 <small>관리자 페이지와 주문 메일의 원가·마진 계산용</small></h2><div class="ad-form">
        <div class="row3">${F('cost.batten', '각재 30×30 1본 단가', { type: 'num', unit: '원/본' })}${F('cost.battenLen', '각재 1본 길이', { type: 'num', unit: 'mm' })}${F('cost.plywood', '합판 2440×1220×8t 1장', { type: 'num', unit: '원/장' })}</div>
        <div class="row2">${F('cost.labor', '인건비 ㎡당', { type: 'num', unit: '원/㎡' })}${F('cost.stain', '오일 스테인 재료비 ㎡당', { type: 'num', unit: '원/㎡' })}</div>
      </div></div>
      <div class="ad-panel"><h2>5. 결제·입금 <small>토스페이먼츠 키를 넣으면 실제 결제창이 열립니다(승인 서버 별도)</small></h2><div class="ad-form">
        <div class="row3">${F('payment.bank', '입금 계좌', { ph: '농협 000-0000-0000-00' })}${F('payment.holder', '예금주')}${F('payment.clientKey', '토스페이먼츠 클라이언트 키', { ph: 'test_ck_… / live_ck_…' })}</div>
        <div class="ad-actions" style="gap:18px">${F('payment.methods.card', '카드 결제', { type: 'check' })}${F('payment.methods.transfer', '계좌이체', { type: 'check' })}${F('payment.methods.vbank', '가상계좌', { type: 'check' })}${F('payment.methods.bank', '무통장입금', { type: 'check' })}</div>
      </div></div>
      <div class="ad-panel"><h2>6. 화면 문구·공지·로고</h2><div class="ad-form">
        <div class="row2">${F('texts.heroTitle', '첫 화면 제목', { type: 'textarea', rows: 2, help: '줄바꿈 그대로 표시' })}${F('texts.hero', '첫 화면 문구', { type: 'textarea', rows: 2 })}</div>
        <div class="row3">${F('texts.notice.on', '공지 배너 켜기', { type: 'check' })}${F('texts.notice.from', '공지 시작일', { type: 'date' })}${F('texts.notice.to', '공지 종료일', { type: 'date' })}</div>
        ${F('texts.notice.text', '공지 내용', { ph: '예: 10월 3일~6일 연휴 휴무입니다. 접수는 정상 처리됩니다.' })}
        <div class="row2">${F('logo', '홈페이지 로고', { type: 'select', num: true, options: logos })}<div id="logoPrev" style="height:60px;display:grid;align-items:end"></div></div>
      </div></div>
      <div class="ad-panel"><h2>7. 배송비 <small>배송 방법별로 금액 · 착불 · 별도(접수 후 안내)를 정합니다. 금액 0원은 무료</small></h2><div class="ad-form">
        ${['later', 'parcel', 'freight', 'pickup', 'site'].map(k => `<div class="row3">${F('ship.' + k + '.label', '배송 방법 이름')}${F('ship.' + k + '.mode', '배송비 방식', { type: 'select', options: [{ v: 'amount', t: '금액 (합계에 추가)' }, { v: 'cod', t: '착불 (배송 시 결제)' }, { v: 'separate', t: '별도 (접수 후 안내)' }] })}${F('ship.' + k + '.amount', '금액', { type: 'num', unit: '원' })}</div>`).join('')}
        <small class="help">현장 시공은 시공 포함 주문일 때 도면 페이지 예상 금액에 미리 표시되고, 나머지는 주문 접수 페이지에서 배송 방법을 고를 때 합계에 반영됩니다.</small>
      </div></div>
      <div class="ad-panel"><h2>8. 팝업창 <small>홈 첫 화면에 뜨는 이미지 팝업 · 이미지를 올리거나 기본 이미지를 쓰고, 기간과 클릭 시 이동할 주소를 정합니다</small></h2><div class="ad-form">
        <div class="row3">${F('texts.popup.on', '팝업 켜기', { type: 'check' })}${F('texts.popup.from', '시작일', { type: 'date' })}${F('texts.popup.to', '종료일', { type: 'date', help: '비우면 기간 제한 없음' })}</div>
        <div class="row2">${F('texts.popup.title', '팝업 제목 (대체 문구)', { ph: '템바보드 샘플 무료 배송 이벤트' })}${F('texts.popup.pages', '표시 위치', { type: 'select', options: [{ v: 'home', t: '홈 첫 화면만' }, { v: 'all', t: '모든 페이지' }] })}</div>
        ${F('texts.popup.link', '클릭 시 이동 주소', { ph: 'index.html?sample=1#contact (문의 폼에서 무료 샘플 신청이 선택됨)', help: '비우면 클릭해도 이동하지 않음' })}
        ${F('texts.popup.image', '팝업 이미지 주소', { help: '아래 업로드를 쓰면 자동 입력. 기본 이미지: img/popup/sample.jpg' })}
        <div class="row2"><label>이미지 올리기 <span class="hint">JPG·PNG, 세로형 권장(가로 900 기준), 자동으로 1400px 이하로 줄여 저장</span><input type="file" id="popupFile" accept="image/*"></label><div class="ad-actions"><button type="button" class="btn light sm" id="popupDefault">기본 이미지 사용</button><span class="ad-count" id="popupUpMsg"></span></div></div>
        <div id="popupPrev" style="max-width:260px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#2b2b2b"></div>
      </div></div>
      <div class="ad-save"><span class="ad-count" id="cfgMsg">저장하면 홈페이지에 바로 반영됩니다(방문자는 새로 열 때 적용).</span><button type="button" class="btn light" id="cfgReset">되돌리기</button><button type="submit" class="btn wood">설정 저장</button></div>
    </form>`;
    const prev = () => { const id = +$('[data-p="logo"]').value, l = (window.NW_LOGOS || []).find(x => x.id === id); $('#logoPrev').innerHTML = l ? `<div style="height:52px">${l.svg.replace('<svg', '<svg style="height:52px;width:auto"')}</div>` : ''; };
    prev(); $('[data-p="logo"]').addEventListener('change', prev);
    // 팝업 이미지 미리보기 · 업로드 · 기본 이미지
    const pImg = $('[data-p="texts.popup.image"]'), pPrev = $('#popupPrev');
    const pShow = () => { pPrev.innerHTML = pImg.value ? `<img src="${esc(pImg.value)}" style="width:100%;display:block" alt="">` : '<div style="padding:20px;color:#aaa;font-size:12px">이미지 없음</div>'; };
    pShow(); pImg.addEventListener('input', pShow);
    $('#popupDefault').addEventListener('click', () => { pImg.value = 'img/popup/sample.jpg'; pShow(); });
    $('#popupFile').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return; const msg = $('#popupUpMsg'); msg.textContent = '이미지 줄이는 중…';
      const data = await new Promise(res => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1400 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.88)); }; img.src = URL.createObjectURL(f); });
      msg.textContent = '올리는 중…';
      try { const j = await api('admin.upload', { name: f.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', data: data.split(',')[1] }); pImg.value = j.url; pShow(); msg.textContent = '업로드 완료 · 저장을 눌러 적용'; }
      catch (err) { msg.textContent = '실패: ' + err.message; }
      e.target.value = '';
    });
    $('#cfgReset').addEventListener('click', () => { cfgDraft = JSON.parse(JSON.stringify(D.config)); renderSettings(); });
    $('#cfgForm').addEventListener('submit', async e => {
      e.preventDefault();
      $$('#cfgForm [data-p]').forEach(el => {
        const t = el.dataset.t; let v;
        if (t === 'check') v = el.checked; else if (t === 'num') v = +el.value || 0; else if (t === 'list') v = el.value.split(/[\n,;]/).map(s => s.trim()).filter(Boolean); else v = el.value;
        set(cfgDraft, el.dataset.p, v);
      });
      if (!cfgDraft.mail.to.length) { toast('수신 이메일을 한 개 이상 넣어 주세요', true); return; }
      const b = e.target.querySelector('[type=submit]'); b.disabled = true; b.textContent = '저장 중…';
      try { const j = await api('admin.saveConfig', { config: cfgDraft }); D.config = j.config; cfgDraft = JSON.parse(JSON.stringify(j.config)); try { localStorage.setItem('nw_cfg', JSON.stringify(j.config)); } catch (x) {} NW_APPLY_CONFIG(j.config); toast('설정을 저장했습니다'); renderSettings(); }
      catch (err) { toast(err.message, true); b.disabled = false; b.textContent = '설정 저장'; }
    });
  }

  // ---------------- 계정 ----------------
  function renderAccount() {
    $('#v-account').innerHTML = `<div class="ad-grid2">
      <div class="ad-panel"><h2>비밀번호 변경</h2><form id="pwForm" class="ad-form">
        <label>새 비밀번호 <input type="password" name="a" minlength="6" required autocomplete="new-password"></label>
        <label>새 비밀번호 확인 <input type="password" name="b" minlength="6" required autocomplete="new-password"></label>
        <div class="ad-actions"><button type="submit" class="btn wood sm">변경</button><small class="help" style="color:var(--ink-3)">변경하면 다른 기기의 로그인은 모두 풀립니다.</small></div></form></div>
      <div class="ad-panel"><h2>데이터·연결</h2><div class="ad-form" style="font-size:14px">
        <div>접수대장 스프레드시트: <a href="${esc(D.sheetUrl)}" target="_blank" rel="noopener" style="color:var(--wood-dark);text-decoration:underline">열기</a> <small class="help">탭: 접수 · 입금 · 매출 · 설정</small></div>
        <div>도면·사진 보관 폴더: <a href="${esc(D.folderUrl)}" target="_blank" rel="noopener" style="color:var(--wood-dark);text-decoration:underline">열기</a></div>
        <div>접수 스크립트 주소: <span class="mono" style="font-size:12px;word-break:break-all">${esc(SITE.orderEndpoint)}</span></div>
        <div class="ad-actions"><button type="button" class="btn light sm" id="btnRebuild">매출 탭 다시 집계</button><button type="button" class="btn ghost sm" id="btnLogout2">로그아웃</button></div>
      </div></div></div>`;
    $('#pwForm').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (f.a.value !== f.b.value) { toast('비밀번호 확인이 다릅니다', true); return; }
      try { await api('admin.changePw', { pw: f.a.value }); toast('비밀번호를 변경했습니다. 다시 로그인해 주세요'); logout(); } catch (err) { toast(err.message, true); }
    });
    $('#btnRebuild').addEventListener('click', async () => { try { await api('admin.rebuild'); toast('집계했습니다'); await load(); } catch (err) { toast(err.message, true); } });
    $('#btnLogout2').addEventListener('click', logout);
  }

  document.addEventListener('DOMContentLoaded', () => { if (token) enter(); });
})();
