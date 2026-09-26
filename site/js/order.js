// 도면 주문 페이지 — A~E 치수와 코너 옵션으로 도면을 그리고 주문서 이미지를 만든다.
(function () {
  const BAT = 30, GAP = 30, PITCH = BAT + GAP, PLY = 8, SHEET_W = 1220, SHEET_L = 2440, CORNER_EXPOSE = BAT - PLY; // 합판 원장 1220×2440
  const $ = s => document.querySelector(s);
  const cv = $('#sheet'), ctx = cv.getContext('2d');
  const W = 1754, H = 1240; // A4 가로 비율 (150dpi)
  cv.width = W; cv.height = H;

  const state = { dir: 'v', A: 1200, B: 2400, C: 60, E: 60, corner: 'none', F: 300, finish: '무도장', qty: 1, install: '자재 납품', name: '', tel: '', email: '', addr: '', memo: '' };

  // ---- 치수 계산 ----
  function calc() {
    const s = state;
    const len = s.dir === 'h' ? s.A : s.B;          // 각재 길이 방향
    const across = s.dir === 'h' ? s.B : s.A;        // 각재가 쌓이는 방향 (C + D + E)
    const D = Math.max(0, across - s.C - s.E);
    const n = Math.max(0, Math.floor((D + GAP) / PITCH));  // 각재 개수
    const Dreal = n > 0 ? n * PITCH - GAP : 0;
    const Eadj = s.E + (D - Dreal);                   // 남는 치수는 끝 여백으로
    // 합판 원장 1220×2440: 두 방향 중 장수가 적은 배치 선택
    const left0 = (s.corner === 'left' || s.corner === 'both') ? s.F : 0, right0 = (s.corner === 'right' || s.corner === 'both') ? s.F : 0;
    const totW = s.A + left0 + right0, totH = s.B;
    const o1 = Math.ceil(totW / SHEET_L) * Math.ceil(totH / SHEET_W), o2 = Math.ceil(totW / SHEET_W) * Math.ceil(totH / SHEET_L);
    const sheetX = o1 <= o2 ? SHEET_L : SHEET_W, sheetY = o1 <= o2 ? SHEET_W : SHEET_L;
    const sheets = Math.min(o1, o2), nx = Math.ceil(totW / sheetX), ny = Math.ceil(totH / sheetY);
    const segs = nx * ny;
    const cornerN = (s.corner === 'left' || s.corner === 'both' ? 1 : 0) + (s.corner === 'right' || s.corner === 'both' ? 1 : 0);
    // 코너 돌림면의 각재: 가로 배열이면 같은 줄이 이어짐(개수 동일), 세로 배열이면 F 폭에 별도 배열
    const cornerBattens = s.dir === 'h' ? n : Math.floor((s.F + GAP) / PITCH);
    const battenLen = s.dir === 'h' ? (s.A + cornerN * s.F) : s.B;
    const totalBattens = s.dir === 'h' ? n : n + cornerN * cornerBattens;
    const lm = totalBattens * (s.dir === 'h' ? battenLen : s.B) / 1000; // 각재 총 길이(m)
    return { len, across, D, n, Dreal, Eadj, segs, sheets, nx, ny, sheetX, sheetY, cornerN, cornerBattens, totalBattens, meters: Math.round(lm * s.qty * 10) / 10, area: Math.round((s.A + cornerN * s.F) * s.B / 1e6 * s.qty * 100) / 100 };
  }

  // ---- 그리기 유틸 ----
  function dim(x1, y1, x2, y2, label, off = 0, side = 'h') {
    ctx.save(); ctx.strokeStyle = '#1d4ed8'; ctx.fillStyle = '#1d4ed8'; ctx.lineWidth = 1.2; ctx.font = '600 15px "Noto Sans KR", sans-serif';
    if (side === 'h') { // 가로 치수: y 동일
      const y = y1 + off;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, y + (off > 0 ? 8 : -8)); ctx.moveTo(x2, y1); ctx.lineTo(x2, y + (off > 0 ? 8 : -8)); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      arrow(x1, y, 1); arrow(x2, y, -1);
      ctx.textAlign = 'center'; ctx.textBaseline = off > 0 ? 'top' : 'bottom'; ctx.fillText(label, (x1 + x2) / 2, y + (off > 0 ? 6 : -6));
    } else {
      const x = x1 + off;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x + (off > 0 ? 8 : -8), y1); ctx.moveTo(x1, y2); ctx.lineTo(x + (off > 0 ? 8 : -8), y2); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
      arrowV(x, y1, 1); arrowV(x, y2, -1);
      if (Math.abs(y2 - y1) < 70) { ctx.textAlign = off > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + (off > 0 ? 10 : -10), (y1 + y2) / 2); }
      else { ctx.save(); ctx.translate(x + (off > 0 ? 6 : -6), (y1 + y2) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = off > 0 ? 'bottom' : 'top'; ctx.fillText(label, 0, 0); ctx.restore(); }
    }
    ctx.restore();
  }
  function arrow(x, y, d) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9 * d, y - 3.5); ctx.lineTo(x + 9 * d, y + 3.5); ctx.closePath(); ctx.fill(); }
  function arrowV(x, y, d) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3.5, y + 9 * d); ctx.lineTo(x + 3.5, y + 9 * d); ctx.closePath(); ctx.fill(); }
  function text(t, x, y, o = {}) { ctx.save(); ctx.font = `${o.w || 400} ${o.s || 15}px "Noto Sans KR", sans-serif`; ctx.fillStyle = o.c || '#222'; ctx.textAlign = o.a || 'left'; ctx.textBaseline = o.b || 'alphabetic'; ctx.fillText(t, x, y); ctx.restore(); }
  function woodRect(x, y, w, h, stain) {
    const g = ctx.createLinearGradient(x, y, x + (w > h ? 0 : w), y + (w > h ? h : 0));
    if (stain) { g.addColorStop(0, '#8B5A2B'); g.addColorStop(.5, '#A86F3C'); g.addColorStop(1, '#7A4A22'); }
    else { g.addColorStop(0, '#D9B27F'); g.addColorStop(.5, '#C8955C'); g.addColorStop(1, '#B9814A'); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = .8; ctx.strokeRect(x, y, w, h);
  }

  // ---- 입면도 ----
  function drawElevation(box, r) {
    const s = state, stain = s.finish !== '무도장';
    const left = (s.corner === 'left' || s.corner === 'both') ? s.F : 0, right = (s.corner === 'right' || s.corner === 'both') ? s.F : 0;
    const totalW = left + s.A + right, totalH = s.B;
    const pad = 110;
    const k = Math.min((box.w - pad * 2) / totalW, (box.h - pad * 2) / totalH);
    const ox = box.x + (box.w - totalW * k) / 2, oy = box.y + (box.h - totalH * k) / 2;
    const X = mm => ox + mm * k, Y = mm => oy + mm * k;

    // 합판 (전체 면)
    ctx.fillStyle = '#F1E6D0'; ctx.fillRect(X(0), Y(0), totalW * k, totalH * k);
    ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = 1.5; ctx.strokeRect(X(0), Y(0), totalW * k, totalH * k);

    // 각재
    if (s.dir === 'h') {
      for (let i = 0; i < r.n; i++) { const y = s.C + i * PITCH; woodRect(X(0), Y(y), totalW * k, BAT * k, stain); }
    } else {
      // 본면
      for (let i = 0; i < r.n; i++) { const x = left + s.C + i * PITCH; woodRect(X(x), Y(0), BAT * k, totalH * k, stain); }
      // 코너면(세로 배열): F 폭에 별도 배열, 코너 쪽에서 시작
      for (let i = 0; i < r.cornerBattens; i++) {
        if (left) woodRect(X(left - BAT - i * PITCH), Y(0), BAT * k, totalH * k, stain);
        if (right) woodRect(X(left + s.A + i * PITCH), Y(0), BAT * k, totalH * k, stain);
      }
    }
    // 코너 접는 선
    ctx.save(); ctx.setLineDash([10, 6]); ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 2;
    const ly = s.dir === 'h' ? Y(0) - 18 : Y(0) - 66;
    if (left) { ctx.beginPath(); ctx.moveTo(X(left), Y(0) - 12); ctx.lineTo(X(left), Y(totalH) + 12); ctx.stroke(); text('코너(접힘)', X(left), ly, { c: '#c2410c', s: 13, a: 'center', w: 700 }); }
    if (right) { ctx.beginPath(); ctx.moveTo(X(left + s.A), Y(0) - 12); ctx.lineTo(X(left + s.A), Y(totalH) + 12); ctx.stroke(); text('코너(접힘)', X(left + s.A), ly, { c: '#c2410c', s: 13, a: 'center', w: 700 }); }
    ctx.restore();
    // 합판 원장 이음선 (회색 점선)
    if (r.nx > 1 || r.ny > 1) {
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.5;
      for (let i = 1; i < r.nx; i++) { const x = r.sheetX * i; ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(totalH)); ctx.stroke(); text(`합판 이음 ${x}`, X(x), Y(totalH) + 16, { c: '#6b7280', s: 11, a: 'center', b: 'top' }); }
      for (let i = 1; i < r.ny; i++) { const y = r.sheetY * i; ctx.beginPath(); ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(totalW), Y(y)); ctx.stroke(); text(`합판 이음 ${y}`, X(totalW) + 6, Y(y) + 4, { c: '#6b7280', s: 11 }); }
      ctx.restore();
    }
    // 치수선
    const b = Y(totalH), t = Y(0), l = X(0), rt = X(totalW);
    dim(X(left), b, X(left + s.A), b, `A = ${s.A}`, 34, 'h');
    if (left) dim(X(0), b, X(left), b, `F = ${s.F}`, 34, 'h');
    if (right) dim(X(left + s.A), b, X(totalW), b, `F = ${s.F}`, 34, 'h');
    if (totalW !== s.A) dim(l, b, rt, b, `전체 ${totalW}`, 66, 'h');
    dim(rt, t, rt, b, `B = ${s.B}`, 34, 'v');
    if (s.dir === 'h') {
      dim(l, t, l, Y(s.C), `C = ${s.C}`, -34, 'v');
      dim(l, Y(s.C), l, Y(s.C + r.Dreal), `D = ${r.Dreal}`, -34, 'v');
      dim(l, Y(s.C + r.Dreal), l, b, `E = ${Math.round(r.Eadj)}`, -34, 'v');
    } else {
      const x0 = left;
      dim(X(x0), t, X(x0 + s.C), t, `C = ${s.C}`, -34, 'h');
      dim(X(x0 + s.C), t, X(x0 + s.C + r.Dreal), t, `D = ${r.Dreal}`, -34, 'h');
      dim(X(x0 + s.C + r.Dreal), t, X(left + s.A), t, `E = ${Math.round(r.Eadj)}`, -34, 'h');
    }
  }

  // ---- 단면 상세 (고정 도해) ----
  function drawSection(x, y, w, corner) {
    const stain = state.finish !== '무도장';
    text('단면 상세 (mm)', x, y, { w: 700, s: 15 });
    const k = w / 260; // 260mm 폭
    const oy = y + 108;
    ctx.fillStyle = '#E8D7B5'; ctx.fillRect(x, oy, 260 * k, PLY * k); ctx.strokeStyle = '#8B5A2B'; ctx.strokeRect(x, oy, 260 * k, PLY * k);
    for (let i = 0; i < 4; i++) woodRect(x + (10 + i * PITCH) * k, oy - BAT * k, BAT * k, BAT * k, stain);
    dim(x + 10 * k, oy - BAT * k, x + 40 * k, oy - BAT * k, '30', -22, 'h');
    dim(x + 40 * k, oy - BAT * k, x + 70 * k, oy - BAT * k, '30', -22, 'h');
    dim(x + 250 * k, oy - BAT * k, x + 250 * k, oy, '30', 6, 'v');
    text('합판 8', x + 262 * k, oy + PLY * k / 2 + 5, { s: 13, c: '#555' });
    text('나왕 각재', x, oy + PLY * k + 22, { s: 13, c: '#555' });
    let yy = oy + PLY * k + 40;
    if (corner) {
      text('코너 평면 상세 (ㄱ자 돌림)', x, yy + 24, { w: 700, s: 15 });
      const cy = yy + 60, cx = x + 20;
      // 본면 합판(가로) + 돌림면 합판(세로)
      ctx.fillStyle = '#E8D7B5';
      ctx.fillRect(cx, cy + 60 * k, 200 * k, PLY * k); ctx.strokeRect(cx, cy + 60 * k, 200 * k, PLY * k);
      ctx.fillRect(cx, cy + 68 * k, PLY * k, 140 * k); ctx.strokeRect(cx, cy + 68 * k, PLY * k, 140 * k);
      // 본면 각재 (코너 각재가 합판 끝을 덮음)
      woodRect(cx, cy + 30 * k, BAT * k, BAT * k, stain); woodRect(cx + 60 * k, cy + 30 * k, BAT * k, BAT * k, stain); woodRect(cx + 120 * k, cy + 30 * k, BAT * k, BAT * k, stain);
      // 돌림면 각재
      woodRect(cx + PLY * k, cy + 98 * k, BAT * k, BAT * k, stain); woodRect(cx + PLY * k, cy + 158 * k, BAT * k, BAT * k, stain);
      dim(cx + PLY * k, cy + 68 * k, cx + BAT * k, cy + 68 * k, '22', 12, 'h');
      dim(cx + PLY * k, cy + 98 * k, cx + PLY * k, cy + 128 * k, '30', -24, 'v');
      dim(cx, cy + 30 * k, cx + BAT * k, cy + 30 * k, '30', -22, 'h');
      text('코너 각재가 합판 두께(8)를 덮어 22 노출', cx, cy + 215 * k + 18, { s: 12.5, c: '#555' });
      yy = cy + 215 * k + 30;
    }
    return yy;
  }

  // ---- 시트 전체 ----
  function draw() {
    const r = calc(), s = state;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(30, 30, W - 60, H - 60);
    // 타이틀 바
    ctx.fillStyle = '#2B2B2B'; ctx.fillRect(30, 30, W - 60, 70);
    text('나무의공간  ·  템바보드 주문 도면', 50, 75, { c: '#fff', s: 26, w: 800 });
    const today = new Date(); const ds = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    text(`작성일 ${ds}   |   대표 ${SITE.ceo}  ${SITE.tel}  ${SITE.email}`, W - 50, 75, { c: '#D9B27F', s: 15, a: 'right' });
    // 입면 영역
    const el = { x: 50, y: 120, w: 1120, h: 790 };
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.strokeRect(el.x, el.y, el.w, el.h);
    text('입면도  (30각 템바보드 · 단위 mm)', el.x + 14, el.y + 28, { w: 700, s: 17 });
    text(`각재 ${r.totalBattens}개 × ${s.dir === 'h' ? '가로' : '세로'} 배열 · 30×30 · 간격 30 · 합판 8`, el.x + el.w - 14, el.y + 28, { s: 14, c: '#555', a: 'right' });
    drawElevation({ x: el.x, y: el.y + 40, w: el.w, h: el.h - 40 }, r);
    // 우측 정보
    const rx = 1195, rw = W - 30 - rx - 20;
    ctx.strokeStyle = '#ddd'; ctx.strokeRect(rx - 10, el.y, rw + 20, 1050);
    let y = drawSection(rx + 4, el.y + 28, rw - 60, s.corner !== 'none');
    // 사양표
    const rows = [
      ['제품', `30각 템바보드 (나왕 30×30, 간격 30, 합판 8)`],
      ['각재 방향', s.dir === 'h' ? '가로 배열' : '세로 배열'],
      ['A 폭 / B 높이', `${s.A} × ${s.B}`],
      ['C / D / E', `${s.C} / ${r.Dreal} / ${Math.round(r.Eadj)}`],
      ['코너', s.corner === 'none' ? '없음' : ({ left: '좌측', right: '우측', both: '양쪽' })[s.corner] + ` (돌림 F=${s.F})`],
      ['각재 개수', `${r.totalBattens}개 / 장 (본면 ${r.n})`],
      ['합판 원장', r.sheets > 1 ? `1220×2440 × ${r.sheets}장 이어 붙임 (${r.nx}×${r.ny})` : '1220×2440 1장 이내'],
      ['마감', s.finish], ['수량', `${s.qty}장`], ['시공', s.install],
      ['각재 총길이', `약 ${r.meters} m`], ['패널 면적', `약 ${r.area} ㎡`],
    ];
    y += 10;
    text('사양', rx + 4, y + 18, { w: 700, s: 15 }); y += 30;
    ctx.font = '400 13.5px "Noto Sans KR", sans-serif';
    rows.forEach((rw2, i) => {
      ctx.fillStyle = i % 2 ? '#fff' : '#F7F2EA'; ctx.fillRect(rx - 4, y, rw + 8, 26);
      text(rw2[0], rx + 4, y + 18, { s: 13, c: '#8B5A2B', w: 700 }); text(rw2[1], rx + 120, y + 18, { s: 13 });
      y += 26;
    });
    // 주문자 (입면 아래 가로 띠)
    const oy2 = el.y + el.h + 16;
    ctx.strokeStyle = '#ddd'; ctx.strokeRect(el.x, oy2, el.w, 1170 - oy2);
    text('주문자 정보', el.x + 14, oy2 + 26, { w: 700, s: 15 });
    const who = [['이름', s.name, 0, 0], ['연락처', s.tel, 1, 0], ['이메일', s.email, 2, 0], ['현장 주소', s.addr, 0, 1], ['메모', s.memo, 1, 1]];
    who.forEach(([k2, v2, cx2, ry2]) => {
      const bx = el.x + 14 + cx2 * 370, by = oy2 + 44 + ry2 * 56, bw = k2 === '메모' ? 740 - 14 : 350;
      ctx.fillStyle = '#F7F2EA'; ctx.fillRect(bx, by, bw, 46);
      text(k2, bx + 10, by + 18, { s: 12, c: '#8B5A2B', w: 700 });
      text(String(v2 || '-').slice(0, k2 === '메모' ? 70 : 30), bx + 10, by + 38, { s: 14 });
    });
    // 하단
    text('※ 각재 30×30·간격 30·합판 8은 고정 규격입니다. 합판 원장 1220×2440을 가로·세로로 이어 붙여 제작하므로 크기 제한이 없습니다. 견적은 접수 후 담당자가 연락드립니다.', 50, H - 46, { s: 13, c: '#666' });
    text(`${SITE.name}  |  ${SITE.tel}  |  사업자등록번호 ${SITE.bizno} (${SITE.bizname})  |  ${SITE.address}`, W - 50, H - 46, { s: 13, c: '#666', a: 'right' });
    updateSummary(r);
  }

  function updateSummary(r) {
    const s = state;
    if (!$('#sumN')) return;
    $('#sumN').textContent = r.totalBattens; $('#sumD').textContent = r.Dreal; $('#sumE').textContent = Math.round(r.Eadj);
    $('#sumSeg').textContent = r.sheets > 1 ? `원장 ${r.sheets}장 (${r.nx}×${r.ny}) 이어 붙임` : '없음 (원장 1장)';
    $('#sumM').textContent = r.meters; $('#sumA').textContent = r.area;
    $('#dirNote').textContent = s.dir === 'h' ? '가로 배열: C·E는 위·아래 여백, 각재 길이 = A' : '세로 배열: C·E는 좌·우 여백, 각재 길이 = B';
    const warn = [];
    if (r.sheets > 1) warn.push(`합판 원장(1220×2440) ${r.sheets}장을 이어 붙여 제작합니다. 도면의 회색 점선이 이음 위치입니다.`);
    if (r.n === 0) warn.push('각재 구간(D)이 30mm보다 작아 각재가 들어가지 않습니다. C·E 여백을 줄이거나 크기를 키우세요.');
    if (r.D !== r.Dreal) warn.push(`D=${r.D}는 60mm 피치에 맞지 않아 실제 각재 구간은 ${r.Dreal}, 나머지 ${Math.round(r.Eadj - s.E)}mm는 E 여백에 더해집니다.`);
    $('#warn').innerHTML = warn.map(w => `<li>${w}</li>`).join('');
    $('#warn').parentElement.style.display = warn.length ? '' : 'none';
  }

  // ---- 입력 바인딩 ----
  function bind() {
    document.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      const apply = () => {
        let v = el.type === 'number' ? +el.value : el.value;
        if (el.type === 'number') { if (isNaN(v)) v = 0; const mn = +el.min; const mx = +el.max; if (!isNaN(mn) && v < mn) v = mn; if (mx && v > mx) v = mx; }
        if (k === 'D') { // D 를 고치면 B(또는 A) = C + D + E
          const across = state.C + v + state.E;
          if (state.dir === 'h') { state.B = across; $('[data-k=B]').value = across; } else { state.A = across; $('[data-k=A]').value = across; }
        } else state[k] = v;
        syncD(); draw();
      };
      el.addEventListener('input', apply); el.addEventListener('change', apply);
      if (el.type === 'radio') { if (el.checked) state[k] = el.value; }
      else if (state[k] !== undefined && state[k] !== '') el.value = state[k];
    });
    document.querySelectorAll('input[type=radio][data-k]').forEach(el => el.addEventListener('change', () => { if (el.checked) { state[el.dataset.k] = el.value; syncD(); draw(); } }));
    $('#cornerF').style.display = state.corner === 'none' ? 'none' : '';
    document.querySelectorAll('input[name=corner]').forEach(el => el.addEventListener('change', () => { $('#cornerF').style.display = state.corner === 'none' ? 'none' : ''; }));
  }
  function syncD() { const across = state.dir === 'h' ? state.B : state.A; $('[data-k=D]').value = Math.max(0, across - state.C - state.E); }

  // ---- 저장·전송 ----
  function fileName() { const d = new Date(); return `나무의공간_주문도면_${state.name || '무기명'}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`; }
  function toBlob() { return new Promise(res => cv.toBlob(res, 'image/png')); }
  async function download() { const b = await toBlob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName(); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  function orderText() {
    const r = calc(), s = state;
    return `[나무의공간 템바보드 주문 접수]\n` +
      `주문자: ${s.name}\n연락처: ${s.tel}\n이메일: ${s.email || '-'}\n현장 주소: ${s.addr || '-'}\n\n` +
      `제품: 30각 템바보드 (나왕 30×30, 간격 30, 합판 8)\n각재 방향: ${s.dir === 'h' ? '가로' : '세로'}\n` +
      `A 폭 ${s.A} / B 높이 ${s.B} / C ${s.C} / D ${r.Dreal} / E ${Math.round(r.Eadj)}\n` +
      `코너: ${s.corner === 'none' ? '없음' : s.corner + ' F=' + s.F}\n각재 개수: ${r.totalBattens}개/장\n이음: ${r.segs > 1 ? r.segs + '장 이어서' : '없음'}\n` +
      `마감: ${s.finish}\n수량: ${s.qty}장\n시공: ${s.install}\n메모: ${s.memo || '-'}\n\n※ 도면 이미지(${fileName()})를 첨부해 주세요.`;
  }
  function validate() {
    if (!state.name || !state.tel) { alert('주문자 이름과 연락처를 입력해 주세요.'); $('[data-k=name]').focus(); return false; }
    return true;
  }
  async function send() {
    if (!validate()) return;
    draw();
    const blob = await toBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    const subject = `[템바보드 주문] ${state.name} 님 ${state.A}×${state.B}${state.corner !== 'none' ? ' 코너형' : ''} ${state.qty}장`;
    // 1) EmailJS 설정이 있으면 자동 발송
    const ej = SITE.emailjs;
    if (ej && ej.publicKey && ej.serviceId && ej.templateId && window.emailjs) {
      try {
        const dataUrl = cv.toDataURL('image/jpeg', 0.85);
        await emailjs.send(ej.serviceId, ej.templateId, { to_email: SITE.email, subject, message: orderText(), name: state.name, tel: state.tel, drawing: dataUrl }, ej.publicKey);
        $('#done').style.display = ''; $('#done').textContent = '주문서가 이메일로 전송되었습니다. 담당자가 곧 연락드립니다.'; return;
      } catch (e) { console.warn('EmailJS 실패, 대체 전송', e); }
    }
    // 2) 모바일: 공유 시트로 이미지 첨부 전송
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: subject, text: orderText() + `\n받는 곳: ${SITE.email}` }); $('#done').style.display = ''; $('#done').textContent = `공유 창에서 메일 앱을 선택해 ${SITE.email} 로 보내 주세요.`; return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    // 3) PC: 이미지 다운로드 + 메일 앱 열기
    await download();
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(orderText())}`;
    $('#done').style.display = ''; $('#done').innerHTML = `도면 이미지가 다운로드되었습니다. 열린 메일에 <b>다운로드된 도면 파일을 첨부</b>해서 보내 주세요. 메일 앱이 열리지 않으면 <b>${SITE.email}</b> 로 직접 보내 주세요.`;
  }

  $('#btnDown').addEventListener('click', () => { draw(); download(); });
  $('#btnSend').addEventListener('click', send);
  $('#btnPrint').addEventListener('click', () => { draw(); const w = window.open(''); w.document.write(`<img src="${cv.toDataURL()}" style="width:100%" onload="window.print()">`); });

  // URL 파라미터로 미리 채우기: order.html?A=3000&B=1500&C=45&E=45&corner=both&F=300&dir=h
  const qp = new URLSearchParams(location.search);
  qp.forEach((v, k) => {
    if (!(k in state)) return;
    state[k] = typeof state[k] === 'number' ? +v : v;
    const el = document.querySelector(`[data-k=${k}]`);
    if (!el) return;
    if (el.type === 'radio') { const r = document.querySelector(`input[name=${k}][value="${v}"]`); if (r) r.checked = true; } else el.value = state[k];
  });
  bind(); syncD();
  if (qp.get('only') === '1') { // 도면만 표시 (캡처·인쇄용)
    document.body.innerHTML = ''; document.body.style.margin = '0'; cv.style.width = W + 'px'; document.body.appendChild(cv);
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw); draw();
})();
