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
  const state = { dir: 'v', A: 1200, B: 2400, D: 100, F: 60, G: 60, corner: 'none', K: 0, finish: '오일 스테인', extra: '합판 흑도장', paint: '#2a2724', paint2: '#2a2724', ply: '내추럴', qty: 1, install: '자재 납품', name: '', tel: '', email: '', addr: '', ship: '협의 후 결정', memo: '' };

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
    const col = s.corner === 'column';                                                  // 4면(기둥): 앞면 A + 좌·우 옆면 K + 뒷면 A
    const faces = { none: 1, left: 2, right: 2, both: 3, column: 4 }[s.corner] || 1;      // 면 수
    const cornerN = faces - 1;                                                          // 추가 면 수 (코너 추가금 기준)
    const left = (s.corner === 'left' || s.corner === 'both' || col) ? s.K : 0, right = (s.corner === 'right' || s.corner === 'both' || col) ? s.K : 0, back = col ? s.A : 0;
    const sideN = (left ? 1 : 0) + (right ? 1 : 0);
    const cornerBattens = s.dir === 'h' ? n : Math.floor((s.K + GAP) / PITCH);
    const totalBattens = s.dir === 'h' ? n : n * (col ? 2 : 1) + sideN * cornerBattens;
    const battenLen = s.dir === 'h' ? C + sideN * s.K + (col ? C : 0) : C;
    const totW = s.A + left + right + back, totH = s.B;
    const o1 = Math.ceil(totW / SHEET_L) * Math.ceil(totH / SHEET_W), o2 = Math.ceil(totW / SHEET_W) * Math.ceil(totH / SHEET_L);
    const sheetX = o1 <= o2 ? SHEET_L : SHEET_W, sheetY = o1 <= o2 ? SHEET_W : SHEET_L;
    const nx = Math.ceil(totW / sheetX), ny = Math.ceil(totH / sheetY);
    return { along, across, C, D, E, n, Ereal, Gadj, cornerN, faces, col, left, right, back, sideN, cornerBattens, totalBattens, battenLen, totW, totH, sheetX, sheetY, nx, ny, sheets: nx * ny,
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
      if (r.back) for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: X(r.left + s.A + r.right + s.F + i * PITCH), y: T, w: bw, h: r.C * ky, stain });
    } else {
      for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: L, y: Y(s.F + i * PITCH), w: (r.left + r.C) * kx, h: bh, stain });
      if (r.right) for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: X(r.left + s.A), y: Y(s.F + i * PITCH), w: r.right * kx, h: bh, stain });
      if (r.back) for (let i = 0; i < r.n; i++) it.push({ t: 'batten', x: X(r.left + s.A + r.right), y: Y(s.F + i * PITCH), w: r.C * kx, h: bh, stain });
    }
    // 합판 이음선(회색 점선) · 코너 접힘선(주황 점선)
    for (let i = 1; i < r.nx; i++) { const x = X(r.sheetX * i); it.push({ t: 'line', x1: x, y1: T, x2: x, y2: Bm, stroke: '#6b7280', w: 1.5, dash: [6, 6] }); it.push({ t: 'text', x: x + 6, y: T + 26, str: `이음 ${r.sheetX * i}`, color: dark ? '#d4d0cc' : '#6b7280' }); }
    for (let i = 1; i < r.ny; i++) { const y = Y(r.sheetY * i); it.push({ t: 'line', x1: L, y1: y, x2: R, y2: y, stroke: '#6b7280', w: 1.5, dash: [6, 6] }); it.push({ t: 'text', x: L + 8, y: y - 8, str: `이음 ${r.sheetY * i}`, color: dark ? '#d4d0cc' : '#6b7280' }); }
    if (r.left) it.push({ t: 'line', x1: X(r.left), y1: T, x2: X(r.left), y2: Bm, stroke: '#c2410c', w: 2, dash: [8, 6] });
    if (r.right) it.push({ t: 'line', x1: X(r.left + s.A), y1: T, x2: X(r.left + s.A), y2: Bm, stroke: '#c2410c', w: 2, dash: [8, 6] });
    if (r.back) { const xb = X(r.left + s.A + r.right); it.push({ t: 'line', x1: xb, y1: T, x2: xb, y2: Bm, stroke: '#c2410c', w: 2, dash: [8, 6] }); it.push({ t: 'text', x: xb + 10 * M, y: T - 12 * M, str: `뒷면 (A=${s.A})`, color: '#c2410c' }); it.push({ t: 'text', x: X(r.left) + 10 * M, y: Bm + 30 * M, str: '앞면', color: '#c2410c' }); }
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
    if (r.right) dimH(yA, X(r.left + s.A), X(r.left + s.A + r.right), 'K', s.K, { x: r.back ? X(r.left + s.A + r.right / 2) - LY.UW / 2 : R + 6, y: yA + (r.back ? LY.UH + 30 : 14) * M }, Bm);
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
        if (o.key === '전체' || pos[o.key]) { const bx = 92 * M; g += `<rect x="${u.x + bx}" y="${u.y}" width="${95 * M}" height="${LY.BOXH * M}" fill="#fff" stroke="#222" stroke-width="2"/><text x="${u.x + bx + 47 * M}" y="${u.y + (LY.BOXH * 0.74) * M}" text-anchor="middle" font-family="Noto Sans KR, sans-serif" font-weight="700" font-size="${28 * M}" fill="#111">${o.val}</text>`; }
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
      if (state.corner === 'column') {   // 기둥 평면: 앞·뒤 A, 좌·우 K 를 각재가 둘러쌈
        text('기둥 평면 상세 (4면 감싸기)', x, yy + 30, { w: 700 });
        const A = Math.max(60, state.A), K = Math.max(60, state.K), kp = Math.min(200 / Math.max(A, K), 0.6), ox = x + 90, oy1 = yy + 90;
        const aw = A * kp, kh = K * kp, bp = Math.max(4, BAT * kp), pp = Math.max(2, PLY * kp);
        ctx.fillStyle = '#d6d3d1'; ctx.fillRect(ox, oy1, aw, kh); ctx.strokeStyle = '#8B5A2B'; ctx.strokeRect(ox, oy1, aw, kh);   // 기둥 몸체
        ctx.fillStyle = plyc; ctx.fillRect(ox - pp, oy1 - pp, aw + 2 * pp, pp); ctx.fillRect(ox - pp, oy1 + kh, aw + 2 * pp, pp); ctx.fillRect(ox - pp, oy1, pp, kh); ctx.fillRect(ox + aw, oy1, pp, kh); // 합판 4면
        const nA = Math.max(0, Math.floor((A - 2 * state.F + GAP) / PITCH)), nK = Math.max(0, Math.floor((K + GAP) / PITCH));
        for (let i = 0; i < nA; i++) { const bx = ox + (state.F + i * PITCH) * kp; woodRect(bx, oy1 - pp - bp, bp, bp, stain); woodRect(bx, oy1 + kh + pp, bp, bp, stain); }
        for (let i = 0; i < nK; i++) { const by = oy1 + (i * PITCH) * kp; woodRect(ox - pp - bp, by, bp, bp, stain); woodRect(ox + aw + pp, by, bp, bp, stain); }
        smallDim(ox, oy1 + kh + pp + bp + 10, ox + aw, oy1 + kh + pp + bp + 10, `A=${state.A}`, 24, 'h');
        smallDim(ox + aw + pp + bp + 10, oy1, ox + aw + pp + bp + 10, oy1 + kh, `K=${state.K}`, 26, 'v');
        ctx.save(); ctx.fillStyle = '#c2410c'; ctx.font = `700 ${FS}px "Noto Sans KR", sans-serif`; ctx.textAlign = 'center'; ctx.fillText('기둥', ox + aw / 2, oy1 + kh / 2 + 8); ctx.restore();
        text('앞·뒤 A면과 좌·우 K면을 모두 감쌈 · 코너에서 각재끼리 맞닿음', x, oy1 + kh + 92, { c: '#555' });
        return oy1 + kh + 102;
      }
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
    const el = { x: 50, y: 120, w: 1120, h: 1000 };
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.strokeRect(el.x, el.y, el.w, el.h);
    text('입면도  (30각 템바보드 · 단위 mm)', el.x + 14, el.y + 34, { w: 700 });
    text(`각재 ${r.totalBattens}개 (원본 3600 ${NW_CART.sticks(r.totalBattens, r.C).sticks}본) × ${s.dir === 'h' ? '가로' : '세로'} 배열 · 30×30 · 간격 30 · 합판 8`, el.x + 14, el.y + el.h - 14, { c: '#555' });
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
      ['면 구성', ({ none: '1면 (평면)', left: '2면 (좌측 코너)', right: '2면 (우측 코너)', both: '3면 (ㄷ자)', column: '4면 (기둥 감싸기)' })[s.corner] + (s.corner === 'none' ? '' : ` · K=${s.K}`)],
      ['각재 개수', `${r.totalBattens}개 / 장 (본면 ${r.n})`],
      ['원본 각재 3600', (() => { const st = NW_CART.sticks(r.totalBattens, r.C); return `${st.sticks}본 사용 (1본당 ${st.per}개 × ${st.sticks}본)`; })()],
      ['합판 원장', r.sheets > 1 ? `1220×2440 × ${r.sheets}장 (${r.nx}×${r.ny})` : '1220×2440 1장'],
      ['마감', finishInfo(s).text], ['수량', `${s.qty}장`], ['시공', s.install],
      ['각재 총길이', `약 ${r.meters} m`], ['패널 면적', `약 ${r.area} ㎡`],
    ];
    const rowH = s.corner !== 'none' ? 31 : 41;   // 14행이 같은 높이에 들어가도록
    y += 6; text('사양', rx + 4, y + 24, { w: 700 }); y += 40;
    rows.forEach((rw2, i) => { ctx.fillStyle = i % 2 ? '#fff' : '#F7F2EA'; ctx.fillRect(rx - 4, y, rw + 8, rowH); text(rw2[0], rx + 4, y + rowH * 0.68, { c: '#8B5A2B', w: 700 }); text(rw2[1], rx + 200, y + rowH * 0.68); y += rowH; });
    text('※ 각재 30×30·간격 30·합판 8 고정. 합판 원장 1220×2440을 가로·세로로 이어 붙여 제작(크기 제한 없음). 견적은 접수 후 담당자가 연락드립니다.', 50, H - 68, { c: '#666' });
    text(`${SITE.name}  |  ${SITE.tel}  |  사업자등록번호 ${SITE.bizno} (${SITE.bizname})  |  ${SITE.address}`, 50, H - 38, { c: '#666' });
    updateSummary(r); updateDiagram();
    if (window.update3D) window.update3D();
    document.dispatchEvent(new CustomEvent('order:drawn'));
  }
  function updateSummary(r) {
    const s = state; if (!$('#sumN')) return;
    $('#sumN').textContent = r.totalBattens;
    const st = NW_CART.sticks(r.totalBattens, r.C);
    $('#sumSticks').textContent = st.sticks; $('#sumSticksNote').textContent = `1본당 ${st.per}개 (${r.C} mm 기준)`;
    $('#sumSheets').textContent = r.sheets; $('#sumSeg').textContent = r.sheets > 1 ? `${r.nx}×${r.ny} 이어 붙임` : '이음 없음';
    $('#sumM').textContent = r.meters; $('#sumA').textContent = r.area;
    // 예상 금액 계산 (cart.js 의 price/cost 와 같은 규칙)
    const won = NW_CART.won, P = SITE.price || {}, CO = SITE.cost || {};
    const it = {}; DIM_KEYS.forEach(k => it[k] = s[k]); it.calc = { area: r.totW * r.totH / 1e6, C: r.C, totalBattens: r.totalBattens, sheets: r.sheets }; it.qty = Math.max(1, +s.qty || 1); it.finish = s.finish; it.extra = s.extra; it.corner = s.corner; it.install = s.install;
    const a = it.calc.area, pr = NW_CART.price(it), tt = NW_CART.totals([it]);
    const rate = s.finish === '무도장' ? (P.natural || 0) : (P.stain || 0), base = rate * a;
    const cornerN = r.cornerN, cornerAmt = cornerN * (P.corner || 0);
    const installAmt = s.install === '현장 시공 포함' ? (P.install || 0) * a : 0;
    const exRate = s.finish === '추가옵션' ? (s.extra === '합판 흑도장' ? (P.plyBlack || 0) : (P.paint || 0)) : 0, exAmt = exRate * a;
    const raw = base + cornerAmt + installAmt + exAmt;
    const rows = [
      ['패널 면적', `${r.totW} × ${r.totH} ÷ 1,000,000 = <em>${a.toFixed(2)} ㎡</em>${r.left || r.right ? (r.col ? ' (앞 A + 좌·우 K + 뒤 A)' : ' (코너 돌림 K 포함)') : ''}`],
      ['기본 금액', `${a.toFixed(2)} ㎡ × ${won(rate)}/㎡ (${s.finish === '무도장' ? '무도장' : '오일 스테인'}) = <em>${won(base)}</em>`],
      ['코너 추가', cornerN ? `${r.faces}면 구성 → 추가 ${cornerN}면 × ${won(P.corner || 0)} = <em>${won(cornerAmt)}</em>` : '없음 (1면)'],
      ['현장 시공', installAmt ? `${a.toFixed(2)} ㎡ × ${won(P.install || 0)}/㎡ = <em>${won(installAmt)}</em>` : '없음 (자재 납품)'],
      ['추가옵션', s.finish === '추가옵션' ? (exRate ? `${s.extra} · ${a.toFixed(2)} ㎡ × ${won(exRate)}/㎡ = <em>${won(exAmt)}</em>` : `${s.extra} · 추가금 없음 (접수 후 안내)`) : '없음'],
      ['1장 단가', `${won(raw)} → 100원 단위 반올림${pr.unit > Math.round(raw / 100) * 100 ? ` · 최소 ${won(P.min || 0)} 적용` : ''} = <em>${won(pr.unit)}</em>`],
      ['공급가', `${won(pr.unit)} × ${it.qty}장 = <em>${won(tt.supply)}</em>`],
      ['부가세', tt.vat ? `${won(tt.supply)} × 10% = <em>${won(tt.vat)}</em>` : '없음'],
      ['배송비', (() => { const S = SITE.ship || {}; if (s.install === '현장 시공 포함') { const sh = NW_CART.shipping('site'); return `현장 시공: ${sh.text}${sh.fee ? ` → 합계에 추가` : ''}`; } const list = ['parcel', 'freight', 'pickup'].map(k => { const sh = NW_CART.shipping(k); return `${(S[k] || {}).label ? (S[k].label.split(' (')[0]) : k} ${sh.text}`; }); return `결제 단계에서 배송 방법 선택 · ${list.join(' / ')}`; })()],
      ['예상 합계', (() => { const sh = s.install === '현장 시공 포함' ? NW_CART.shipping('site') : null; return sh && sh.fee ? `${won(tt.supply)} + ${won(tt.vat)} + 배송비 ${won(sh.fee)} = <em>${won(tt.total + sh.fee)}</em>` : `${won(tt.supply)} + ${won(tt.vat)} = <em>${won(tt.total)}</em>${sh ? ' (+ 배송비 ' + sh.text + ')' : ' (+ 배송비)'}`; })()],
    ];
    let adm = false; try { adm = !!sessionStorage.getItem('nw_admin_token'); } catch (e) {}
    if (adm) { const c = NW_CART.cost(it), st2 = NW_CART.sticks(r.totalBattens, r.C);
      rows.push(['원가 (관리자)', `각재 ${st2.sticks}본 × ${won(CO.batten || 0)} = ${won(c.battens)} + 합판 ${r.sheets}장 × ${won(CO.plywood || 0)} = ${won(c.ply)} + 인건비 ${a.toFixed(2)} ㎡ × ${won(CO.labor || 0)} = ${won(c.labor)}${c.stain ? ` + 스테인 ${won(c.stain)}` : ''} → <em>${won(c.unit)}/장</em> × ${it.qty}장 = <em>${won(c.sub)}</em>`]);
      rows.push(['예상 마진 (관리자)', `공급가 ${won(tt.supply)} − 원가 ${won(c.sub)} = <em>${won(tt.supply - c.sub)}</em> (${tt.supply ? Math.round((tt.supply - c.sub) / tt.supply * 100) : 0}%)`]); }
    $('#calcRows').innerHTML = rows.map(x => `<div class="calc-row"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');
    const dn = $('#dirNote'); if (dn) dn.textContent = s.dir === 'v' ? '세로 배열: 각재 길이 C는 높이(B) 방향, F·E·G는 폭(A) 방향' : '가로 배열: 각재 길이 C는 폭(A) 방향, F·E·G는 높이(B) 방향';
    const warn = [];
    if (r.n === 0) warn.push('각재 구간(E)이 60mm보다 작아 각재가 들어가지 않습니다. F·G 여백을 줄이거나 크기를 키우세요.');
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
    const kLabel = () => { const l = $('#kLabel'); if (l) l.innerHTML = state.corner === 'column' ? 'K 기둥 옆면 폭 (mm) <span class="hint">앞·뒤는 A, 좌·우 옆면은 K</span>' : 'K 코너 돌림 길이 (mm) <span class="hint">ㄱ자로 꺾여 돌아가는 면의 폭</span>'; }; window.NW_KLABEL = kLabel;
    $('#cornerK').style.display = state.corner === 'none' ? 'none' : ''; kLabel();
    document.querySelectorAll('input[name=corner]').forEach(el => el.addEventListener('change', () => { kLabel(); $('#cornerK').style.display = state.corner === 'none' ? 'none' : ''; if (state.corner !== 'none' && !(state.K > 0)) { state.K = 300; syncInputs('K', null); } if (state.corner === 'none' && state.K) { state.K = 0; syncInputs('K', null); } syncDerived(); draw(); }));
  }

  // ---- 저장·전송 ----
  function fileName() { const d = new Date(); return `나무의공간_주문도면_${state.A}x${state.B}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`; }
  function toBlob() { return new Promise(res => cv.toBlob(res, 'image/png')); }
  async function download() { const b = await toBlob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName(); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  $('#btnDown').addEventListener('click', () => { draw(); download(); });
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
    $('#cornerK').style.display = state.corner === 'none' ? 'none' : ''; if (window.NW_KLABEL) NW_KLABEL(); if (window.NW_EXTRA_UI) NW_EXTRA_UI(); syncDerived(); draw();
  }
  function resetItem() { loadItem({ dir: 'v', A: 1200, B: 2400, D: 100, F: 60, G: 60, corner: 'none', K: 0, finish: '오일 스테인', extra: '합판 흑도장', paint: '#2a2724', paint2: '#2a2724', ply: '내추럴', install: '자재 납품' }); }
  window.NW_ORDER = { get: () => ({ s: state, r: calc(), fi: finishInfo(state), BAT, GAP, PITCH, PLY }), snapshot, load: loadItem, reset: resetItem, finishInfo };
  if (qp.get('dir') === 'h' && !qp.has('A') && !qp.has('B')) { state.A = 2400; state.B = 1200; syncInputs('A', null); syncInputs('B', null); } // 가로 배열 링크: 기본 A=2400·B=1200
  bind(); initDiagram(); syncDerived();
  if (qp.get('only') === '1') { document.body.innerHTML = ''; document.body.style.margin = '0'; cv.style.width = W + 'px'; document.body.appendChild(cv); }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(draw); draw();

  // ---- 장바구니 담기 툴바 ----
  // 하단: 장바구니에 담긴 도면 나열
  function renderCartSheets() {
    const wrap = $('#cartSheetsWrap'), grid = $('#cartSheets'); if (!wrap || !grid || !window.NW_CART) return;
    const items = NW_CART.items(); wrap.style.display = items.length ? '' : 'none'; if (!items.length) { grid.innerHTML = ''; return; }
    $('#cartSheetsN').textContent = `${items.length}건 · ${items.reduce((a, it) => a + it.qty, 0)}장`;
    grid.innerHTML = items.map((it, i) => { const p = NW_CART.price(it); return `<figure><img src="${it.sheet || it.thumb}" alt="도면 ${i + 1}" loading="lazy"><figcaption><b>도면 ${i + 1} · ${NW_CART.label(it)}</b><span>${it.qty}장 × ${NW_CART.won(p.unit)} = <b>${NW_CART.won(p.sub)}</b> <span class="hint">(부가세 별도)</span></span><div class="cs-btns"><a class="btn ghost" href="order.html?item=${it.id}">수정</a><button type="button" class="btn ghost del" data-del="${it.id}">삭제</button></div></figcaption></figure>`; }).join('');
    grid.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { NW_CART.remove(b.dataset.del); }));
  }
  document.addEventListener('cart:change', renderCartSheets); document.addEventListener('DOMContentLoaded', renderCartSheets); renderCartSheets();
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
    // 접수·결제하기: 현재 도면을 장바구니에 담고(수정 중이면 갱신) 접수·결제 페이지로 이동
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
