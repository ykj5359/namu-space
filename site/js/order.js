// 도면 주문 페이지 — 치수 체계(A~G, 코너 K)로 도면을 그리고 주문서 이미지를 만든다.
//  A 폭, B 높이 | 각재 길이 방향: C 각재 길이, D 끝 여백 (C + D = 길이 방향 전체)
//  각재 쌓임 방향: F 시작 여백, E 각재 구간, G 끝 여백 (F + E + G = 쌓임 방향 전체) | K 코너 돌림 길이
//  세로 배열: 길이 방향 = B, 쌓임 방향 = A  /  가로 배열: 길이 방향 = A, 쌓임 방향 = B
//  화면 다이어그램과 캔버스 시트는 같은 장면(buildScene)을 그린다 → 항상 동일한 배치.
(function () {
  const BAT = 30, GAP = 30, PITCH = BAT + GAP, PLY = 8, SHEET_W = 1220, SHEET_L = 2440; // 합판 원장 1220×2440
  const $ = s => document.querySelector(s);
  const cv = $('#sheet'), ctx = cv.getContext('2d');
  const W = 1754, H = 1240; // A4 가로 비율
  const FS = 25;            // 시트 글자 크기 (A4 기준 약 12pt) — 모든 글자 동일
  cv.width = W; cv.height = H;

  // 세로 배열 기본: A=1200·B=2400, 가로 배열로 바꾸면 A=2400·B=1200
  const state = { dir: 'v', A: 1200, B: 2400, D: 100, F: 60, G: 60, corner: 'none', K: 0, finish: '오일 스테인', extra: '합판 흑도장', paint: '#2a2724', paint2: '#2a2724', ply: '내추럴', qty: 1, install: '자재 납품', name: '', tel: '', email: '', addr: '', memo: '' };

  // ---- 마감 해석: 합판·각재 색 ----
  //  오일 스테인 / 무도장 / 추가옵션(합판 흑도장 · 각재만 도색 · 합판만 도색 · 합판+각재 도색)
  //  plyColor/battenColor 가 null 이면 나무 그대로(스테인 여부는 stain), 문자열이면 그 색으로 도색
  function finishInfo(s = state) {
    const stain = s.finish !== '무도장';
    if (s.finish !== '추가옵션') return { stain, plyColor: null, battenColor: null, text: s.finish };
    const p = s.paint || '#2a2724', p2 = s.paint2 || p;   // p: 각재 도색, p2: 합판 도색 (합판+각재 도색일 때)
    const m = { '합판 흑도장': { plyColor: '#1f1c1a', battenColor: null, text: '오일 스테인 · 합판 흑도장' },
                '각재만 도색': { plyColor: null, battenColor: p, text: `각재만 도색(${p})` },
                '합판만 도색': { plyColor: p, battenColor: null, text: `합판만 도색(${p})` },
                '합판+각재 도색': { plyColor: p2, battenColor: p, text: `합판+각재 도색(각재 ${p} · 합판 ${p2})` } };
    return Object.assign({ stain: true }, m[s.extra] || m['합판 흑도장']);
  }
  // ---- 계산 ----
  function calc() {
    const s = state;
    const along = s.dir === 'v' ? s.B : s.A;            // 각재 길이 방향 전체
    const across = s.dir === 'v' ? s.A : s.B;           // 각재 쌓임 방향 전체
    const D = Math.min(Math.max(0, s.D), along), C = along - D;
    const E = Math.max(0, across - s.F - s.G);
    const n = Math.max(0, Math.floor((E + GAP) / PITCH));  // 각재 개수
    const Ereal = n > 0 ? n * PITCH - GAP : 0;               // E = 첫 각재 왼쪽 끝 ~ 마지막 각재 오른쪽 끝 (마지막 간격 제외), 남는 치수는 G에 더함
    const Gadj = s.G + (E - Ereal);
    const cornerN = (s.corner === 'left' || s.corner === 'both' ? 1 : 0) + (s.corner === 'right' || s.corner === 'both' ? 1 : 0);
    const left = (s.corner === 'left' || s.corner === 'both') ? s.K : 0, right = (s.corner === 'right' || s.corner === 'both') ? s.K : 0;
    const cornerBattens = s.dir === 'h' ? n : Math.floor((s.K + GAP) / PITCH);
    const totalBattens = s.dir === 'h' ? n : n + cornerN * cornerBattens;
    const battenLen = s.dir === 'h' ? C + cornerN * s.K : C;
    const totW = s.A + left + right, totH = s.B;
    const o1 = Math.ceil(totW / SHEET_L) * Math.ceil(totH / SHEET_W), o2 = Math.ceil(totW / SHEET_W) * Math.ceil(totH / SHEET_L);
    const sheetX = o1 <= o2 ? SHEET_L : SHEET_W, sheetY = o1 <= o2 ? SHEET_W : SHEET_L;
    const nx = Math.ceil(totW / sheetX), ny = Math.ceil(totH / sheetY);
    return { along, across, C, D, E, n, Ereal, Gadj, cornerN, left, right, cornerBattens, totalBattens, battenLen, totW, totH, sheetX, sheetY, nx, ny, sheets: nx * ny,
      meters: Math.round(totalBattens * battenLen / 1000 * s.qty * 10) / 10, area: Math.round(totW * totH / 1e6 * s.qty * 100) / 100 };
  }

  // ---- 장면(공통 배치) ----
  // 좌표계 1420×820. 패널 상자는 최대 870×412, 치수에 따라 늘고 줄어듦(기준 2400mm, 제곱근 비례, 최소 30%).
  const CHAIN = [30, 8, 5, 8, 5, 8]; // 2점쇄선 (긴 선 · 점 · 점)
  const SC = { W: 1420, H: 950, PX: 380, PY: 200, MAXW: 875, MAXH: 540, UW: 153, UH: 42, BOXH: 42, M: 1 };            // 데스크톱 · UW/UH = "K = [값]" 단위 크기, M = 라벨 배율
  const SCM = { W: 1300, H: 1080, PX: 560, PY: 300, MAXW: 440, MAXH: 480, UW: 153 * 1.5, UH: 52 * 1.5, BOXH: 52, M: 1.5 }; // 모바일 · 패널은 조금 작게, 글자·입력칸은 1.5배(칸 높이 52)
  function panelBox(totalW, totalH, LY = SC) {
    const lin = v => Math.min(1, Math.max(0.3, v / 1600));                 // 쌓임 방향: 실제 비례
    const cmp = v => Math.min(1, Math.max(0.3, Math.sqrt(v / 2400)));      // 각재 길이 방향: 압축 (파단선으로 생략)
    return state.dir === 'v' ? { BW: LY.MAXW * lin(totalW), BH: LY.MAXH * cmp(totalH) } : { BW: LY.MAXW * cmp(totalW), BH: LY.MAXH * lin(totalH) };
  }
  function buildScene(LY = SC) {
    const s = state, r = calc(), it = [], M = LY.M;
    const { BW, BH } = panelBox(r.totW, r.totH, LY);
    const kx = BW / r.totW, ky = BH / r.totH;
    const L = LY.PX, T = LY.PY, R = L + BW, Bm = T + BH;
    const X = mm => L + mm * kx, Y = mm => T + mm * ky;
    const fi = finishInfo(s), stain = fi.battenColor || fi.stain;   // battenColor(문자열)이면 도색
    const dark = fi.plyColor && parseInt(fi.plyColor.slice(1, 3), 16) < 100;
    const PLYC = fi.plyColor || '#E8D7B5', PLYS = dark ? '#111' : '#8B5A2B';
    it.push({ t: 'rect', x: L, y: T, w: BW, h: BH, fill: PLYC, stroke: PLYS });
    // 각재
    const bw = Math.max(3, BAT * kx), bh = Math.max(3, BAT * ky);
    if (s.dir === 'v') {
      for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: X(r.left + s.F + i * PITCH), y: T, w: bw, h: r.C * ky, stain });
      for (let i = 0; i < r.cornerBattens; i++) {
        if (r.left) it.push({ t: 'batten', x: X(r.left - BAT - i * PITCH), y: T, w: bw, h: r.C * ky, stain });
        if (r.right) it.push({ t: 'batten', x: X(r.left + s.A + i * PITCH), y: T, w: bw, h: r.C * ky, stain });
      }
    } else {
      for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: L, y: Y(s.F + i * PITCH), w: (r.left + r.C) * kx, h: bh, stain });
      if (r.right) for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: X(r.left + s.A), y: Y(s.F + i * PITCH), w: r.right * kx, h: bh, stain });
    }
    // 합판 이음선(회색 점선) · 코너 접힘선(주황 점선)
    for (let i = 1; i < r.nx; i++) { const x = X(r.sheetX * i); it.push({ t: 'line', x1: x, y1: T, x2: x, y2: Bm, stroke: '#6b7280', w: 1.5, dash: [6, 6] }); it.push({ t: 'text', x: x + 6, y: T + 26, str: `이음 ${r.sheetX * i}`, color: dark ? '#d4d0cc' : '#6b7280' }); }
    for (let i = 1; i < r.ny; i++) { const y = Y(r.sheetY * i); it.push({ t: 'line', x1: L, y1: y, x2: R, y2: y, stroke: '#6b7280', w: 1.5, dash: [6, 6] }); it.push({ t: 'text', x: L + 8, y: y - 8, str: `이음 ${r.sheetY * i}`, color: dark ? '#d4d0cc' : '#6b7280' }); }
    if (r.left) it.push({ t: 'line', x1: X(r.left), y1: T, x2: X(r.left), y2: Bm, stroke: '#c2410c', w: 2, dash: [8, 6] });
    if (r.right) it.push({ t: 'line', x1: X(r.left + s.A), y1: T, x2: X(r.left + s.A), y2: Bm, stroke: '#c2410c', w: 2, dash: [8, 6] });
    // 길이 2400 초과는 절단(중략) 기호
    { // 각재 길이 방향은 압축해 그리므로 중간 생략 파단선(2점쇄선) 두 줄을 항상 표시
      if (s.dir === 'v') { const y = Y(r.C * 0.55); it.push({ t: 'break', axis: 'h', a: y - 7, b: y + 7, from: L - 10, to: R + 10 }); }
      else { const x = X(r.left + r.C * 0.55); it.push({ t: 'break', axis: 'v', a: x - 7, b: x + 7, from: T - 10, to: Bm + 10 }); }
    }
    // ---- 치수 (규칙: 세로 치수는 왼쪽, 가로 치수는 위·아래) ----
    // 왼쪽 바깥: B / 왼쪽 안: 세로 방향 구간 / 위: 가로 방향 구간 (가까운 줄=짧은 여백, 먼 줄=긴 구간) / 아래: A · 코너 · 전체
    const xB = L - 205 * M, xIn = L - 30 * M, yNear = T - 50 * M, yFar = yNear - LY.UH - 16 * M, yA = Bm + 60 * M, yTot = yA + LY.UH + 16 * M;
    const unitL = (x, cy) => ({ x: x - LY.UW - 8, y: cy - LY.UH / 2 });       // 세로 치수선 왼쪽에 단위 배치
    const unitC = (cx, y) => ({ x: cx - LY.UW / 2 + 29 * M, y });                 // 가로 치수선 중앙 위/아래 (29 = 라벨 폭 보정)
    const dimV = (x, y1, y2, key, val, unit) => it.push({ t: 'dim', side: 'v', x, y1, y2, ext: [L, x - 12], key, val, unit });
    const dimH = (y, x1, x2, key, val, unit, extFrom) => it.push({ t: 'dim', side: 'h', y, x1, x2, ext: [extFrom, y + (y < T ? -12 : 12)], key, val, unit });
    dimV(xB, T, Bm, 'B', s.B, unitL(xB, (T + Bm) / 2));
    if (s.dir === 'v') {
      // 왼쪽 안: C(각재 길이) 위, D(끝 여백) 아래
      const yC = Y(r.C);
      dimV(xIn, T, yC, 'C', r.C, unitL(xIn, (T + yC) / 2));
      if (r.D > 0) dimV(xIn, yC, Bm, 'D', r.D, unitL(xIn, Math.max((yC + Bm) / 2, (T + yC) / 2 + LY.UH + 10 * M)));
      else dimV(xIn, Bm, Bm, 'D', 0, unitL(xIn, Bm + 30 * M));
      // 위: 가까운 줄 F(왼쪽 여백)·G(오른쪽 여백), 먼 줄 E(각재 구간)
      const x0 = X(r.left), xF = X(r.left + s.F), xE = X(r.left + s.F + r.Ereal), x1 = X(r.left + s.A);
      dimH(yNear, x0, xF, 'F', s.F, { x: xF - LY.UW - 6, y: yNear - LY.UH - 8 * M }, T);
      dimH(yNear, xE, x1, 'G', Math.round(r.Gadj), { x: xE + 6, y: yNear - LY.UH - 8 * M }, T);
      dimH(yFar, xF, xE, 'E', r.Ereal, unitC((xF + xE) / 2, yFar - LY.UH - 8 * M), T);
    } else {
      // 왼쪽 안: F(위 여백)·E(각재 구간)·G(아래 여백)
      const yF = Y(s.F), yE = Y(s.F + r.Ereal);
      const uF = unitL(xIn, (T + yF) / 2), uE = unitL(xIn, Math.max((yF + yE) / 2, uF.y + LY.UH + 10 * M)), uG = unitL(xIn, Math.max((yE + Bm) / 2, uE.y + LY.UH + 10 * M));
      dimV(xIn, T, yF, 'F', s.F, uF); dimV(xIn, yF, yE, 'E', r.Ereal, uE); dimV(xIn, yE, Bm, 'G', Math.round(r.Gadj), uG);
      // 위: 먼 줄 C(각재 길이), 가까운 줄 D(끝 여백, 오른쪽)
      const x0 = X(r.left), xC = X(r.left + r.C), x1 = X(r.left + s.A);
      dimH(yFar, x0, xC, 'C', r.C, unitC((x0 + xC) / 2, yFar - LY.UH - 8 * M), T);
      if (r.D > 0) dimH(yNear, xC, x1, 'D', r.D, { x: xC + 6, y: yNear - LY.UH - 8 * M }, T);
      else dimH(yNear, x1, x1, 'D', 0, { x: x1 + 6, y: yNear - LY.UH - 8 * M }, T);
    }
    // 아래: A · 코너 K · 전체
    dimH(yA, X(r.left), X(r.left + s.A), 'A', s.A, unitC((X(r.left) + X(r.left + s.A)) / 2, yA + 14), Bm);
    if (r.left) dimH(yA, L, X(r.left), 'K', s.K, { x: L - LY.UW - 6, y: yA + 14 * M }, Bm);
    if (r.right) dimH(yA, X(r.left + s.A), R, 'K', s.K, { x: R + 6, y: yA + 14 * M }, Bm);
    return { it, r };
  }

  // ---- 렌더러 1: SVG (화면 다이어그램, 입력칸 포함) ----
  const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'K'];
  const IS_MOBILE = () => matchMedia('(max-width: 760px)').matches;
  matchMedia('(max-width: 760px)').addEventListener('change', () => updateDiagram());
  function initDiagram() {
    const host = $('#diagram'); if (!host) return;
    host.innerHTML = '<div id="diagramSvg"></div>' + KEYS.map(k => `<input type="number" data-k="${k}" step="10" min="0" class="dbox" aria-label="${k}">`).join('');
    host.querySelectorAll('[data-k]').forEach(attach);
    updateDiagram();
  }
  function updateDiagram() {
    const host = $('#diagramSvg'); if (!host) return;
    const LY = IS_MOBILE() ? SCM : SC, M = LY.M;
    const { it } = buildScene(LY); const BL = '#1d4ed8', pos = {};
    let g = '';
    const line = (x1, y1, x2, y2, st, w, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash.join(' ')}"` : ''}/>`;
    for (const o of it) {
      if (o.t === 'rect') g += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.fill}" stroke="${o.stroke}" stroke-width="2"/>`;
      else if (o.t === 'batten') g += `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${typeof o.stain === 'string' ? o.stain : 'url(#' + (o.stain ? 'wgs' : 'wg') + ')'}" stroke="${typeof o.stain === 'string' ? '#333' : '#6B3F1D'}" stroke-width="0.8"/>`;
      else if (o.t === 'line') g += line(o.x1, o.y1, o.x2, o.y2, o.stroke, o.w, o.dash);
      else if (o.t === 'text') g += `<text x="${o.x}" y="${o.y}" font-family="Noto Sans KR, sans-serif" font-size="${22 * M}" fill="${o.color}">${o.str}</text>`;
      else if (o.t === 'break') {
        if (o.axis === 'h') g += `<rect x="${o.from}" y="${o.a}" width="${o.to - o.from}" height="${o.b - o.a}" fill="#fff"/>` + line(o.from, o.a, o.to, o.a, '#333', 2, CHAIN) + line(o.from, o.b, o.to, o.b, '#333', 2, CHAIN);
        else g += `<rect x="${o.a}" y="${o.from}" width="${o.b - o.a}" height="${o.to - o.from}" fill="#fff"/>` + line(o.a, o.from, o.a, o.to, '#333', 2, CHAIN) + line(o.b, o.from, o.b, o.to, '#333', 2, CHAIN);
      }
      else if (o.t === 'dim') {
        if (o.side === 'v') { g += line(o.ext[0], o.y1, o.ext[1], o.y1, BL, 1.5) + line(o.ext[0], o.y2, o.ext[1], o.y2, BL, 1.5); if (o.y2 - o.y1 > 14) g += line(o.x, o.y1 + 6, o.x, o.y2 - 6, BL, 2) + `<polygon points="${o.x},${o.y1} ${o.x - 5},${o.y1 + 12} ${o.x + 5},${o.y1 + 12}" fill="${BL}"/><polygon points="${o.x},${o.y2} ${o.x - 5},${o.y2 - 12} ${o.x + 5},${o.y2 - 12}" fill="${BL}"/>`; else g += line(o.x - 8, (o.y1 + o.y2) / 2, o.x + 8, (o.y1 + o.y2) / 2, BL, 2); }
        else { g += line(o.x1, o.ext[0], o.x1, o.ext[1], BL, 1.5) + line(o.x2, o.ext[0], o.x2, o.ext[1], BL, 1.5); if (o.x2 - o.x1 > 14) g += line(o.x1 + 6, o.y, o.x2 - 6, o.y, BL, 2) + `<polygon points="${o.x1},${o.y} ${o.x1 + 12},${o.y - 5} ${o.x1 + 12},${o.y + 5}" fill="${BL}"/><polygon points="${o.x2},${o.y} ${o.x2 - 12},${o.y - 5} ${o.x2 - 12},${o.y + 5}" fill="${BL}"/>`; else g += line((o.x1 + o.x2) / 2, o.y - 8, (o.x1 + o.x2) / 2, o.y + 8, BL, 2); }
        const u = o.unit; g += `<text x="${u.x}" y="${u.y + (LY.BOXH * 0.76) * M}" font-family="Noto Sans KR, sans-serif" font-weight="800" font-size="${30 * M}" fill="#111">${o.key} =</text>`;
        if (o.key === '전체') { const bx = 92 * M; g += `<rect x="${u.x + bx}" y="${u.y}" width="${95 * M}" height="${LY.BOXH * M}" fill="#fff" stroke="#222" stroke-width="2"/><text x="${u.x + bx + 47 * M}" y="${u.y + (LY.BOXH * 0.74) * M}" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-weight="700" font-size="${28 * M}" fill="#111">${o.val}</text>`; }
        else pos[o.key] = [u.x + 58 * M, u.y];
      }
    }
    host.innerHTML = `<svg viewBox="0 0 ${LY.W} ${LY.H}" width="100%" style="display:block">
      <defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9B27F"/><stop offset=".5" stop-color="#C8955C"/><stop offset="1" stop-color="#B9814A"/></linearGradient>
      <linearGradient id="wgs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5A2B"/><stop offset=".5" stop-color="#A86F3C"/><stop offset="1" stop-color="#7A4A22"/></linearGradient></defs>${g}</svg>`;
    $('#diagram').querySelectorAll('.dbox').forEach(el => { const p = pos[el.dataset.k]; if (!p) { el.style.display = 'none'; return; } el.style.display = ''; el.classList.toggle('main', el.dataset.k === 'A' || el.dataset.k === 'B'); el.classList.toggle('opt', !(el.dataset.k === 'A' || el.dataset.k === 'B')); el.style.left = p[0] / LY.W * 100 + '%'; el.style.top = p[1] / LY.H * 100 + '%'; el.style.width = 95 * M / LY.W * 100 + '%'; el.style.height = LY.BOXH * M / LY.H * 100 + '%'; el.style.fontSize = (2.4 * M * (LY.W / 1420)) + 'cqw'; });
  }

  // ---- 렌더러 2: 캔버스 (주문 도면 시트) ----
  function text(t, x, y, o = {}) { ctx.save(); ctx.font = `${o.w || 400} ${FS}px "Noto Sans KR", sans-serif`; ctx.fillStyle = o.c || '#222'; ctx.textAlign = o.a || 'left'; ctx.textBaseline = o.b || 'alphabetic'; ctx.fillText(t, x, y); ctx.restore(); }
  function woodRect(x, y, w, h, stain) {
    if (typeof stain === 'string') { ctx.fillStyle = stain; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#333'; ctx.lineWidth = .8; ctx.strokeRect(x, y, w, h); return; }
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (stain) { g.addColorStop(0, '#8B5A2B'); g.addColorStop(.5, '#A86F3C'); g.addColorStop(1, '#7A4A22'); }
    else { g.addColorStop(0, '#D9B27F'); g.addColorStop(.5, '#C8955C'); g.addColorStop(1, '#B9814A'); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = .8; ctx.strokeRect(x, y, w, h);
  }
  function drawScene(box) {
    const { it } = buildScene(SC); const BL = '#1d4ed8';
    const sc = Math.min(box.w / SC.W, box.h / SC.H), ox = box.x + (box.w - SC.W * sc) / 2, oy = box.y + (box.h - SC.H * sc) / 2;
    const P = (x, y) => [ox + x * sc, oy + y * sc];
    const line = (x1, y1, x2, y2, st, w, dash) => { ctx.save(); ctx.strokeStyle = st; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(...P(x1, y1)); ctx.lineTo(...P(x2, y2)); ctx.stroke(); ctx.restore(); };
    const tri = (pts) => { ctx.fillStyle = BL; ctx.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); };
    for (const o of it) {
      if (o.t === 'rect') { const [x, y] = P(o.x, o.y); ctx.fillStyle = o.fill; ctx.fillRect(x, y, o.w * sc, o.h * sc); ctx.strokeStyle = o.stroke; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, o.w * sc, o.h * sc); }
      else if (o.t === 'batten') { const [x, y] = P(o.x, o.y); woodRect(x, y, o.w * sc, o.h * sc, o.stain); }
      else if (o.t === 'line') line(o.x1, o.y1, o.x2, o.y2, o.stroke, o.w, o.dash);
      else if (o.t === 'text') { const [x, y] = P(o.x, o.y); text(o.str, x, y, { c: o.color }); }
      else if (o.t === 'break') {
        ctx.fillStyle = '#fff';
        if (o.axis === 'h') { const [x, y] = P(o.from, o.a); ctx.fillRect(x, y, (o.to - o.from) * sc, (o.b - o.a) * sc); line(o.from, o.a, o.to, o.a, '#333', 2, CHAIN); line(o.from, o.b, o.to, o.b, '#333', 2, CHAIN); }
        else { const [x, y] = P(o.a, o.from); ctx.fillRect(x, y, (o.b - o.a) * sc, (o.to - o.from) * sc); line(o.a, o.from, o.a, o.to, '#333', 2, CHAIN); line(o.b, o.from, o.b, o.to, '#333', 2, CHAIN); }
      }
      else if (o.t === 'dim') {
        if (o.side === 'v') { line(o.ext[0], o.y1, o.ext[1], o.y1, BL, 1.5); line(o.ext[0], o.y2, o.ext[1], o.y2, BL, 1.5); if (o.y2 - o.y1 > 14) { line(o.x, o.y1 + 6, o.x, o.y2 - 6, BL, 2); tri([[o.x, o.y1], [o.x - 5, o.y1 + 12], [o.x + 5, o.y1 + 12]]); tri([[o.x, o.y2], [o.x - 5, o.y2 - 12], [o.x + 5, o.y2 - 12]]); } else line(o.x - 8, (o.y1 + o.y2) / 2, o.x + 8, (o.y1 + o.y2) / 2, BL, 2); }
        else { line(o.x1, o.ext[0], o.x1, o.ext[1], BL, 1.5); line(o.x2, o.ext[0], o.x2, o.ext[1], BL, 1.5); if (o.x2 - o.x1 > 14) { line(o.x1 + 6, o.y, o.x2 - 6, o.y, BL, 2); tri([[o.x1, o.y], [o.x1 + 12, o.y - 5], [o.x1 + 12, o.y + 5]]); tri([[o.x2, o.y], [o.x2 - 12, o.y - 5], [o.x2 - 12, o.y + 5]]); } else line((o.x1 + o.x2) / 2, o.y - 8, (o.x1 + o.x2) / 2, o.y + 8, BL, 2); }
        const [ux, uy] = P(o.unit.x, o.unit.y); const uw = 95 * sc, uh = 42 * sc; ctx.font = `700 ${FS}px "Noto Sans KR", sans-serif`; const lw = ctx.measureText(`${o.key} =`).width + 8;
        text(`${o.key} =`, ux, uy + uh * 0.76, { c: BL, w: 700 });
        ctx.fillStyle = '#fff'; ctx.fillRect(ux + lw, uy, uw, uh); ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(ux + lw, uy, uw, uh);
        text(String(o.val), ux + lw + uw / 2, uy + uh * 0.76, { a: 'center', w: 700, c: '#111' });
      }
    }
  }

  // ---- 단면 상세 (고정 도해) ----
  function smallDim(x1, y1, x2, y2, label, off, side) {
    ctx.save(); ctx.strokeStyle = '#1d4ed8'; ctx.fillStyle = '#1d4ed8'; ctx.lineWidth = 1.5; ctx.font = `700 ${FS}px "Noto Sans KR", sans-serif`; ctx.textBaseline = 'middle';
    if (side === 'h') { const y = y1 + off; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, y); ctx.moveTo(x2, y1); ctx.lineTo(x2, y); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(label, (x1 + x2) / 2, y + (off < 0 ? -16 : 16)); }
    else { const x = x1 + off; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y1); ctx.moveTo(x1, y2); ctx.lineTo(x, y2); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.textAlign = off > 0 ? 'left' : 'right'; ctx.fillText(label, x + (off > 0 ? 8 : -8), (y1 + y2) / 2); }
    ctx.restore();
  }
  function drawSection(x, y, w, corner) {
    const s = state, r = calc(), fi = finishInfo(s), stain = fi.battenColor || fi.stain;
    text('단면 상세 (mm)', x, y, { w: 700 });
    // 합판 끝 여백 F · 각재 30 · 간격 30 … · 끝 여백 G (여백은 20~90mm 범위로 축약해 표시)
    const Fd = Math.min(90, Math.max(20, s.F)), Gd = Math.min(90, Math.max(20, Math.round(r.Gadj)));
    const lastEnd = Fd + 2 * PITCH + BAT;                    // 마지막(3번째) 각재 오른쪽 끝
    const total = lastEnd + Gd;
    const k = (w - 90) / total;
    const oy = y + 40 + BAT * k + 40;
    const plyc = fi.plyColor || '#E8D7B5';
    ctx.fillStyle = plyc; ctx.fillRect(x, oy, total * k, PLY * k); ctx.strokeStyle = '#8B5A2B'; ctx.strokeRect(x, oy, total * k, PLY * k);
    for (let i = 0; i < 3; i++) woodRect(x + (Fd + i * PITCH) * k, oy - BAT * k, BAT * k, BAT * k, stain);
    smallDim(x, oy - BAT * k, x + Fd * k, oy - BAT * k, `F=${s.F}`, -18, 'h');
    smallDim(x + Fd * k, oy - BAT * k, x + (Fd + BAT) * k, oy - BAT * k, '30', -18, 'h');
    smallDim(x + (Fd + BAT) * k, oy - BAT * k, x + (Fd + PITCH) * k, oy - BAT * k, '30', -18, 'h');
    smallDim(x + lastEnd * k, oy - BAT * k, x + total * k, oy - BAT * k, `G=${Math.round(r.Gadj)}`, -18, 'h');
    smallDim(x + total * k, oy - BAT * k, x + total * k, oy, '30', 8, 'v');
    text('합판 8', x + total * k + 8, oy + PLY * k + 22, { c: '#555' });
    let yy = oy + PLY * k + 28;
    if (corner) {
      // 코너 평면 상세 — 손도면(182518) 기준. 바깥 모서리를 원점으로, 본면(가로 합판)은 위쪽에 각재, 돌림면(세로 합판)은 바깥(왼쪽)에 각재.
      // 우측 코너는 좌우 반전. 단위 mm, kc 배율.
      const side = state.corner === 'right' ? '우측' : state.corner === 'both' ? '양쪽(좌측 기준)' : '좌측';
      text(`코너 평면 상세 (ㄱ자 돌림 · ${side})`, x, yy + 30, { w: 700 });
      const kc = 1.0, m = state.corner === 'right' ? -1 : 1;                    // m: 좌우 반전
      const ox = x + (m > 0 ? 70 : 70 + 230 * kc), oy0 = yy + 60 + 30 * kc;     // 원점(바깥 모서리) 화면 위치
      const PX = mm => ox + m * mm * kc, PY = mm => oy0 + mm * kc;
      const rect = (x1, y1, x2, y2, fill) => { const a = PX(Math.min(x1, x2)), b2 = PX(Math.max(x1, x2)); const l = Math.min(a, b2), w2 = Math.abs(b2 - a); ctx.fillStyle = fill; ctx.fillRect(l, PY(y1), w2, (y2 - y1) * kc); ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = 1; ctx.strokeRect(l, PY(y1), w2, (y2 - y1) * kc); };
      const wood = (x1, y1, x2, y2) => { const a = PX(Math.min(x1, x2)), b2 = PX(Math.max(x1, x2)); woodRect(Math.min(a, b2), PY(y1), Math.abs(b2 - a), (y2 - y1) * kc, stain); };
      rect(0, 30, 200, 38, plyc);                                                 // 본면 합판 (가로)
      rect(0, 38, 8, 210, plyc);                                                  // 돌림면 합판 (세로)
      [0, 60, 120].forEach(bx => wood(bx, 0, bx + 30, 30));                       // 본면 각재 (바깥 = 위)
      [30, 90, 150, 210].forEach(by => wood(-30, by, 0, by + 30));                // 돌림면 각재 (바깥 = 왼쪽) — 첫 각재가 코너 각재 아래에 바로 맞닿음
      // 치수: 각재 30 · 간격 30 · 노출 22 · 합판 8
      smallDim(PX(60), PY(0), PX(90), PY(0), '30', -16 * 1, 'h');
      smallDim(PX(90), PY(0), PX(120), PY(0), '30', -16 * 1, 'h');
      smallDim(PX(8), PY(0), PX(30), PY(0), '22', -16 * 1, 'h');
      smallDim(PX(-30), PY(30), PX(-30), PY(60), '30', -12 * m, 'v');
      smallDim(PX(-30), PY(60), PX(-30), PY(90), '30', -12 * m, 'v');
      smallDim(PX(200), PY(30), PX(200), PY(38), '8', 12 * m, 'v');
      ctx.save(); ctx.fillStyle = '#c2410c'; ctx.font = `700 ${FS}px "Noto Sans KR", sans-serif`; ctx.textAlign = m > 0 ? 'left' : 'right'; ctx.fillText('기둥 안쪽', PX(60), PY(130)); ctx.restore();
      text('코너에서 각재와 각재가 맞닿아 돌아감', x, PY(240) + 36, { c: '#555' });
      yy = PY(240) + 46;
    }
    return yy;
  }

  // ---- 시트 전체 ----
  function draw() {
    const r = calc(), s = state;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.fillStyle = '#2B2B2B'; ctx.fillRect(30, 30, W - 60, 70);
    text('나무의공간  ·  템바보드 주문 도면', 50, 74, { c: '#fff', w: 800 });
    const today = new Date(); const ds = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    text(`작성일 ${ds}   |   대표 ${SITE.ceo}  ${SITE.tel}  ${SITE.email}`, W - 50, 74, { c: '#D9B27F', a: 'right' });
    const el = { x: 50, y: 120, w: 1120, h: 790 };
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.strokeRect(el.x, el.y, el.w, el.h);
    text('입면도  (30각 템바보드 · 단위 mm)', el.x + 14, el.y + 34, { w: 700 });
    text(`각재 ${r.totalBattens}개 (원본 3600 ${NW_CART.sticks(r.totalBattens, r.C).sticks}본) × ${s.dir === 'h' ? '가로' : '세로'} 배열 · 30×30 · 간격 30 · 합판 8`, el.x + el.w - 14, el.y + 34, { c: '#555', a: 'right' });
    drawScene({ x: el.x + 10, y: el.y + 50, w: el.w - 20, h: el.h - 60 });
    const rx = 1195, rw = W - 30 - rx - 20;
    ctx.strokeStyle = '#ddd'; ctx.strokeRect(rx - 10, el.y, rw + 20, 1030);
    let y = drawSection(rx + 4, el.y + 34, rw - 10, s.corner !== 'none');
    const rows = [
      ['제품', '30각 템바보드 (나왕 · 합판 8)'],
      ['각재 방향', s.dir === 'h' ? '가로 배열' : '세로 배열'],
      ['A 폭 × B 높이', `${s.A} × ${s.B}`],
      ['C 각재 길이 / D', `${r.C} / ${r.D}`],
      ['F / E / G', `${s.F} / ${r.Ereal} / ${Math.round(r.Gadj)}`],
      ['코너', s.corner === 'none' ? '없음' : ({ left: '좌측', right: '우측', both: '양쪽' })[s.corner] + ` (돌림 K=${s.K})`],
      ['각재 개수', `${r.totalBattens}개 / 장 (본면 ${r.n})`],
      ['원본 각재 3600', (() => { const st = NW_CART.sticks(r.totalBattens, r.C); return `${st.sticks}본 사용 (1본당 ${st.per}개 × ${st.sticks}본)`; })()],
      ['합판 원장', r.sheets > 1 ? `1220×2440 × ${r.sheets}장 (${r.nx}×${r.ny})` : '1220×2440 1장'],
      ['마감', finishInfo(s).text], ['수량', `${s.qty}장`], ['시공', s.install],
      ['각재 총길이', `약 ${r.meters} m`], ['패널 면적', `약 ${r.area} ㎡`],
    ];
    const rowH = s.corner !== 'none' ? 31 : 41;   // 14행이 같은 높이에 들어가도록
    y += 6; text('사양', rx + 4, y + 24, { w: 700 }); y += 40;
    rows.forEach((rw2, i) => { ctx.fillStyle = i % 2 ? '#fff' : '#F7F2EA'; ctx.fillRect(rx - 4, y, rw + 8, rowH); text(rw2[0], rx + 4, y + rowH * 0.68, { c: '#8B5A2B', w: 700 }); text(rw2[1], rx + 200, y + rowH * 0.68); y += rowH; });
    const oy2 = el.y + el.h + 16;
    ctx.strokeStyle = '#ddd'; ctx.strokeRect(el.x, oy2, el.w, 1150 - oy2);
    text('주문자 정보', el.x + 14, oy2 + 32, { w: 700 });
    const who = [['이름', s.name, 0, 0], ['연락처', s.tel, 1, 0], ['이메일', s.email, 2, 0], ['배송 주소', s.addr, 0, 1], ['메모', s.memo, 1, 1]];
    who.forEach(([k2, v2, cx2, ry2]) => {
      const bx = el.x + 14 + cx2 * 370, by = oy2 + 46 + ry2 * 92, bw = k2 === '메모' ? 740 - 14 : 350;
      ctx.fillStyle = '#F7F2EA'; ctx.fillRect(bx, by, bw, 82);
      text(k2, bx + 12, by + 32, { c: '#8B5A2B', w: 700 }); text(String(v2 || '-').slice(0, k2 === '메모' ? 46 : 20), bx + 12, by + 66);
    });
    text('※ 각재 30×30·간격 30·합판 8 고정. 합판 원장 1220×2440을 가로·세로로 이어 붙여 제작(크기 제한 없음). 견적은 접수 후 담당자가 연락드립니다.', 50, H - 68, { c: '#666' });
    text(`${SITE.name}  |  ${SITE.tel}  |  사업자등록번호 ${SITE.bizno} (${SITE.bizname})  |  ${SITE.address}`, 50, H - 38, { c: '#666' });
    updateSummary(r); updateDiagram();
    if (window.update3D) window.update3D();
    document.dispatchEvent(new CustomEvent('order:drawn'));
  }
  function updateSummary(r) {
    const s = state; if (!$('#sumN')) return;
    $('#sumN').textContent = r.totalBattens; $('#sumE').textContent = r.Ereal; $('#sumG').textContent = Math.round(r.Gadj);
    const st = NW_CART.sticks(r.totalBattens, r.C); const stEl = $('#sumSticks'); if (stEl) stEl.textContent = `${st.sticks}본 (1본당 ${st.per}개)`;
    $('#sumSeg').textContent = r.sheets > 1 ? `원장 ${r.sheets}장 (${r.nx}×${r.ny}) 이어 붙임` : '없음 (원장 1장)';
    $('#sumM').textContent = r.meters; $('#sumA').textContent = r.area;
    $('#dirNote').textContent = s.dir === 'v' ? '세로 배열: 각재 길이 C는 높이(B) 방향, F·E·G는 폭(A) 방향' : '가로 배열: 각재 길이 C는 폭(A) 방향, F·E·G는 높이(B) 방향';
    const warn = [];
    if (r.sheets > 1) warn.push(`합판 원장(1220×2440) ${r.sheets}장을 이어 붙여 제작합니다. 도면의 회색 점선이 이음 위치입니다.`);
    if (r.n === 0) warn.push('각재 구간(E)이 60mm보다 작아 각재가 들어가지 않습니다. F·G 여백을 줄이거나 크기를 키우세요.');
    if (r.E !== r.Ereal) warn.push(`각재 ${r.n}개 기준 E(첫 각재 왼쪽 끝~마지막 각재 오른쪽 끝)는 ${r.Ereal}이고, 남는 ${Math.round(r.Gadj - s.G)}mm는 끝 여백 G에 더해져 G=${Math.round(r.Gadj)}입니다.`);
    $('#warn').innerHTML = warn.map(w => `<li>${w}</li>`).join('');
    $('#warn').parentElement.style.display = warn.length ? '' : 'none';
  }

  // ---- 입력 바인딩 (같은 data-k 입력이 여러 개 있어도 동기화) ----
  function syncInputs(k, src) { document.querySelectorAll(`[data-k="${k}"]`).forEach(e => { if (e === src) return; if (e.type === 'radio') e.checked = (e.value === state[k]); else e.value = state[k]; }); }
  function syncDerived() { const r = calc(); document.querySelectorAll('[data-k="C"]').forEach(e => e.value = r.C); document.querySelectorAll('[data-k="E"]').forEach(e => e.value = r.Ereal); document.querySelectorAll('[data-k="G"]').forEach(e => e.value = Math.round(r.Gadj)); }
  function attach(el) {
    const k = el.dataset.k;
    const apply = () => {
      let v = el.type === 'number' ? +el.value : el.value;
      if (el.type === 'number') { if (isNaN(v)) v = 0; const mn = +el.min; const mx = +el.max; if (!isNaN(mn) && v < mn) v = mn; if (mx && v > mx) v = mx; }
      const r = calc();
      if (k === 'C') { state.D = Math.max(0, r.along - v); syncInputs('D', null); }            // C 를 고치면 D = 길이 − C
      else if (k === 'E') { const across = state.F + v + state.G; if (state.dir === 'v') { state.A = across; syncInputs('A', null); } else { state.B = across; syncInputs('B', null); } } // E 를 고치면 A(또는 B) = F+E+G
      else if (k === 'dir') { if (v !== state.dir) { const a = state.A; state.A = state.B; state.B = a; syncInputs('A', null); syncInputs('B', null); } state.dir = v; } // 배열을 바꾸면 폭·높이 교환 (세로 A=1200·B=2400 ↔ 가로 A=2400·B=1200)
      else state[k] = v;
      if (k === 'K' && v > 0 && state.corner === 'none') { state.corner = 'left'; const rd = document.querySelector('input[name=corner][value=left]'); if (rd) rd.checked = true; $('#cornerK').style.display = ''; }
      syncInputs(k, el); syncDerived(); draw();
    };
    el.addEventListener('input', apply); el.addEventListener('change', apply);
    if (el.type === 'radio') { if (el.checked) state[k] = el.value; }
    else if (state[k] !== undefined && state[k] !== '') el.value = state[k];
  }
  function bind() {
    document.querySelectorAll('.panel [data-k], input[name=dir2]').forEach(attach);
    document.querySelectorAll('input[type=radio][data-k]').forEach(el => el.addEventListener('change', () => {
      if (!el.checked) return;
      state[el.dataset.k] = el.value; syncDerived(); draw();
    }));
    const extraUI = () => { const box = $('#extraOpts'); if (!box) return; box.style.display = state.finish === '추가옵션' ? '' : 'none'; const pc = $('#paintRow'); if (pc) pc.style.display = (state.finish === '추가옵션' && state.extra !== '합판 흑도장') ? 'flex' : 'none'; const pl = $('#paintLabel'); if (pl) pl.textContent = state.extra === '각재만 도색' ? '각재 도색 색상' : state.extra === '합판만 도색' ? '합판 도색 색상' : '각재 도색 색상'; const p2 = $('#paintRow2'); if (p2) p2.style.display = (state.finish === '추가옵션' && state.extra === '합판+각재 도색') ? 'flex' : 'none'; };
    document.querySelectorAll('input[name=finish], input[name=extra]').forEach(el => el.addEventListener('change', () => setTimeout(extraUI, 0)));
    extraUI(); window.NW_EXTRA_UI = extraUI;
    $('#cornerK').style.display = state.corner === 'none' ? 'none' : '';
    document.querySelectorAll('input[name=corner]').forEach(el => el.addEventListener('change', () => { $('#cornerK').style.display = state.corner === 'none' ? 'none' : ''; if (state.corner !== 'none' && !(state.K > 0)) { state.K = 300; syncInputs('K', null); } if (state.corner === 'none' && state.K) { state.K = 0; syncInputs('K', null); } syncDerived(); draw(); }));
  }

  // ---- 저장·전송 ----
  function fileName() { const d = new Date(); return `나무의공간_주문도면_${state.name || '무기명'}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`; }
  function toBlob() { return new Promise(res => cv.toBlob(res, 'image/png')); }
  async function download() { const b = await toBlob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName(); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  function orderText() {
    const r = calc(), s = state;
    return `[나무의공간 템바보드 주문 접수]\n` +
      `주문자: ${s.name}\n연락처: ${s.tel}\n이메일: ${s.email || '-'}\n배송 주소: ${s.addr || '-'}\n\n` +
      `제품: 30각 템바보드 (나왕 30×30, 간격 30, 합판 8)\n각재 방향: ${s.dir === 'h' ? '가로' : '세로'}\n` +
      `A 폭 ${s.A} × B 높이 ${s.B}\nC 각재 길이 ${r.C} / D 끝 여백 ${r.D}\nF ${s.F} / E ${r.Ereal} / G ${Math.round(r.Gadj)}\n` +
      `코너: ${s.corner === 'none' ? '없음' : s.corner + ' K=' + s.K}\n각재 개수: ${r.totalBattens}개/장 (원본 3600 ${NW_CART.sticks(r.totalBattens, r.C).sticks}본)\n합판 원장: ${r.sheets}장 (1220×2440)\n` +
      `마감: ${finishInfo(s).text}\n수량: ${s.qty}장\n시공: ${s.install}\n메모: ${s.memo || '-'}\n\n※ 도면 이미지(${fileName()})를 첨부해 주세요.`;
  }
  function validate() {
    if (!state.name || !state.tel) { alert('주문자 이름과 연락처를 입력해 주세요.'); $('[data-k=name]').focus(); return false; }
    if (!state.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) { alert('답장 받을 이메일을 입력해 주세요.'); $('[data-k=email]').focus(); return false; }
    return true;
  }
  async function send() {
    if (!validate()) return;
    draw();
    const blob = await toBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    const subject = `[템바보드 주문] ${state.name} 님 ${state.A}×${state.B}${state.corner !== 'none' ? ' 코너형' : ''} ${state.qty}장`;
    const btnS = $('#btnSend'); btnS.disabled = true; btnS.textContent = '접수 중…';
    const meta = (() => { try { const r = calc(); const it = {}; DIM_KEYS.forEach(k => it[k] = state[k]); it.calc = { area: r.totW * r.totH / 1e6, C: r.C, totalBattens: r.totalBattens, sheets: r.sheets }; it.qty = Math.max(1, +state.qty || 1); it.finish = state.finish; it.extra = state.extra; it.corner = state.corner; it.install = state.install;
      const t = NW_CART.totals([it]), c = NW_CART.cost(it); return { qty: it.qty, area: +(it.calc.area * it.qty).toFixed(3), supply: t.supply, vat: t.vat, total: t.total, cost: c.sub, method: '' }; } catch (e) { return {}; } })();
    const estText = meta.total ? `\n\n예상 금액: ${NW_CART.won(meta.total)} (공급가 ${NW_CART.won(meta.supply)} + 부가세 ${NW_CART.won(meta.vat)})` : '';
    const doc = (() => { const r = calc(), s = state, fi = finishInfo(s); const unit = meta.qty ? Math.round(meta.supply / meta.qty) : 0;
      return { kind: 'drawing', title: '주문내역서', estimated: true, customer: { name: s.name, tel: s.tel, email: s.email, addr: s.addr },
        items: [{ name: `고운결 ${s.dir === 'h' ? '가로' : '세로'} 템바보드 (나왕 30×30 · 간격 30 · 합판 8t)`, spec: [`A 폭 ${s.A} × B 높이 ${s.B} mm`, `C 각재 길이 ${r.C} / D 끝 여백 ${r.D} · F ${s.F} / E ${r.Ereal} / G ${Math.round(r.Gadj)}`, `코너 돌림 ${s.corner === 'none' ? '없음' : s.corner + ' K=' + s.K}`, `마감 ${fi.text} · 시공 ${s.install}`, `각재 ${r.totalBattens}개 (원본 3600 ${NW_CART.sticks(r.totalBattens, r.C).sticks}본) · 합판 원장 ${r.sheets}장 (1220×2440) · 면적 ${(r.totW * r.totH / 1e6).toFixed(2)}㎡`], qty: meta.qty || s.qty, unit, sub: meta.supply || 0 }],
        totals: { supply: meta.supply || 0, vat: meta.vat || 0, total: meta.total || 0 }, payment: { method: '접수 후 안내', bank: SITE.payment.bank ? SITE.payment.bank + (SITE.payment.holder ? ' (예금주 ' + SITE.payment.holder + ')' : '') : '' },
        message: s.memo || '', notes: ['예상 금액이며 실제 견적은 담당자 확인 후 확정됩니다.', '치수 단위 mm · 각재 30×30, 간격 30, 합판 8t 고정 · 합판 원장 1220×2440 을 이어 붙여 제작'], adminNote: (() => { try { const it = {}; DIM_KEYS.forEach(k => it[k] = s[k]); it.calc = { area: r.totW * r.totH / 1e6, C: r.C, totalBattens: r.totalBattens, sheets: r.sheets }; it.qty = meta.qty || 1; it.finish = s.finish; const c = NW_CART.cost(it); return `각재 30×30-3600 ${c.sticks}본 ${NW_CART.won(c.battens)} + 합판 ${r.sheets}장 ${NW_CART.won(c.ply)} + 인건비 ${NW_CART.won(c.labor)} = ${NW_CART.won(c.unit)}/장 × ${it.qty}장 = ${NW_CART.won(c.sub)}`; } catch (e) { return ''; } })() }; })();
    const sentAuto = await NW_SEND({ type: 'drawing', subject, text: orderText() + estText, customer: { name: state.name, tel: state.tel, email: state.email, addr: state.addr }, meta, doc, files: [file] });
    btnS.disabled = false; btnS.textContent = '주문서 이메일로 접수';
    if (sentAuto) { $('#done').style.display = ''; $('#done').innerHTML = `<b>주문서가 접수되었습니다.</b> ${state.email} 로 접수 확인 메일을 보내 드렸고, 담당자가 확인 후 연락드리겠습니다.`; return; }
    const ej = SITE.emailjs;
    if (ej && ej.publicKey && ej.serviceId && ej.templateId && window.emailjs) {
      try {
        const dataUrl = cv.toDataURL('image/jpeg', 0.85);
        await emailjs.send(ej.serviceId, ej.templateId, { to_email: SITE.email, subject, message: orderText(), name: state.name, tel: state.tel, drawing: dataUrl }, ej.publicKey);
        $('#done').style.display = ''; $('#done').textContent = '주문서가 이메일로 전송되었습니다. 담당자가 곧 연락드립니다.'; return;
      } catch (e) { console.warn('EmailJS 실패, 대체 전송', e); }
    }
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: subject, text: orderText() + `\n받는 곳: ${SITE.email}` }); $('#done').style.display = ''; $('#done').textContent = `공유 창에서 메일 앱을 선택해 ${SITE.email} 로 보내 주세요.`; return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    await download();
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(orderText())}`;
    $('#done').style.display = ''; $('#done').innerHTML = `도면 이미지가 다운로드되었습니다. 열린 메일에 <b>다운로드된 도면 파일을 첨부</b>해서 보내 주세요. 메일 앱이 열리지 않으면 <b>${SITE.email}</b> 로 직접 보내 주세요.`;
  }
  $('#btnDown').addEventListener('click', () => { draw(); download(); });
  $('#btnSend').addEventListener('click', send);
  $('#btnPrint').addEventListener('click', () => { draw(); const w = window.open(''); w.document.write(`<img src="${cv.toDataURL()}" style="width:100%" onload="window.print()">`); });

  // URL 파라미터로 미리 채우기: order.html?dir=v&A=1200&B=2400&D=0&F=60&G=60&corner=left&K=300
  const qp = new URLSearchParams(location.search);
  qp.forEach((v, k) => {
    if (!(k in state)) return;
    state[k] = typeof state[k] === 'number' ? +v : v;
    const el = document.querySelector(`[data-k=${k}]`);
    if (!el) return;
    if (el.type === 'radio') { const r = document.querySelector(`input[name=${k}][value="${v}"]`); if (r) r.checked = true; } else el.value = state[k];
  });
  // ---- 장바구니 연동: 현재 도면 스냅샷 / 불러오기 / 새 도면 ----
  const DIM_KEYS = ['dir', 'A', 'B', 'D', 'F', 'G', 'corner', 'K', 'finish', 'extra', 'paint', 'paint2', 'ply', 'install'];
  function scaled(w, q) { const c = document.createElement('canvas'); c.width = w; c.height = Math.round(H * w / W); c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); }
  function snapshot(qty) {
    draw(); const r = calc(); const it = {};
    DIM_KEYS.forEach(k => it[k] = state[k]); it.qty = Math.max(1, qty | 0); it.finishText = finishInfo(state).text;
    it.calc = { C: r.C, D: r.D, Ereal: r.Ereal, Gadj: Math.round(r.Gadj), n: r.n, totalBattens: r.totalBattens, totW: r.totW, totH: r.totH, sheets: r.sheets, area: Math.round(r.totW * r.totH / 1e6 * 100) / 100, meters: Math.round(r.totalBattens * r.battenLen / 1000 * 10) / 10 };
    it.thumb = scaled(320, 0.7); it.sheet = scaled(1200, 0.78);
    return it;
  }
  function loadItem(it) {
    DIM_KEYS.forEach(k => { if (it[k] !== undefined) state[k] = it[k]; });
    DIM_KEYS.forEach(k => syncInputs(k, null));
    $('#cornerK').style.display = state.corner === 'none' ? 'none' : ''; if (window.NW_EXTRA_UI) NW_EXTRA_UI(); syncDerived(); draw();
  }
  function resetItem() { loadItem({ dir: 'v', A: 1200, B: 2400, D: 100, F: 60, G: 60, corner: 'none', K: 0, finish: '오일 스테인', extra: '합판 흑도장', paint: '#2a2724', paint2: '#2a2724', ply: '내추럴', install: '자재 납품' }); }
  window.NW_ORDER = { get: () => ({ s: state, r: calc(), fi: finishInfo(state), BAT, GAP, PITCH, PLY }), snapshot, load: loadItem, reset: resetItem, finishInfo };
  if (qp.get('dir') === 'h' && !qp.has('A') && !qp.has('B')) { state.A = 2400; state.B = 1200; syncInputs('A', null); syncInputs('B', null); } // 가로 배열 링크: 기본 A=2400·B=1200
  bind(); initDiagram(); syncDerived();
  if (qp.get('only') === '1') { document.body.innerHTML = ''; document.body.style.margin = '0'; cv.style.width = W + 'px'; document.body.appendChild(cv); }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw); draw();

  // ---- 장바구니 담기 툴바 ----
  const editId = qp.get('item');                                  // cart.html 에서 '수정' 으로 들어온 경우
  if (editId && window.NW_CART) { const it = NW_CART.find(editId); if (it) { loadItem(it); const q = $('#addQty'); if (q) q.value = it.qty; } }
  const est = () => { if (!window.NW_CART || !$('#addEst')) return; const it = {}; DIM_KEYS.forEach(k => it[k] = state[k]); const r = calc(); it.calc = { area: r.totW * r.totH / 1e6 }; it.qty = Math.max(1, +($('#addQty').value || 1)); const p = NW_CART.price(it); $('#addEst').innerHTML = `예상 <b>${NW_CART.won(p.unit)}</b>/장 · ${it.qty}장 ${NW_CART.won(p.sub)} <span class="hint">(부가세 별도)</span>`; };
  document.addEventListener('order:drawn', est);
  const qtyEl = $('#addQty');
  if (qtyEl) {
    qtyEl.addEventListener('input', est); $('#qtyMinus').addEventListener('click', () => { qtyEl.value = Math.max(1, +qtyEl.value - 1); est(); }); $('#qtyPlus').addEventListener('click', () => { qtyEl.value = Math.min(999, +qtyEl.value + 1); est(); });
    const toast = msg => { let t = $('#addToast'); if (!t) { t = document.createElement('div'); t.id = 'addToast'; t.className = 'add-toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); };
    $('#btnAdd').addEventListener('click', () => {
      const it = snapshot(+qtyEl.value || 1);
      if (editId && NW_CART.find(editId)) { NW_CART.update(editId, it); toast('도면을 수정했습니다.'); history.replaceState(null, '', 'order.html'); }
      else { NW_CART.add(it); toast(`장바구니에 ${it.qty}장을 담았습니다.`); }
      NW_CART.open();
    });
    // 결제하기: 현재 도면을 장바구니에 담고(수정 중이면 갱신) 결제 페이지로 이동
    const btnPay = $('#btnPay');
    if (btnPay) btnPay.addEventListener('click', () => {
      const it = snapshot(+qtyEl.value || 1);
      if (editId && NW_CART.find(editId)) NW_CART.update(editId, it); else NW_CART.add(it);
      location.href = 'checkout.html';
    });
    $('#btnNew').addEventListener('click', () => { resetItem(); qtyEl.value = 1; est(); history.replaceState(null, '', 'order.html'); $('#diagram').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    est();
  }
})();
