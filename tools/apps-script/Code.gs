/**
 * 나무의공간 접수·관리 스크립트 (Google Apps Script)  v2
 * ---------------------------------------------------------------
 * 홈페이지(namuspace.kr)의 문의·도면 주문·장바구니 주문을 받아
 *  - 수신 이메일(여러 개)로 발송 + 고객 접수 확인 메일
 *  - 스프레드시트 "나무의공간 접수대장" 에 기록  (탭: 접수 · 입금 · 매출 · 설정)
 *  - 도면 이미지는 드라이브 폴더 "나무의공간 도면" 에 보관
 * 관리자 페이지(admin.html)가 이 스크립트로 설정 저장·접수 조회·입금 등록·매출 집계를 합니다.
 *
 * 배포: script.google.com → 프로젝트 "나무의공간 접수" → 배포 → 배포 관리 → 수정 → 새 버전 → 배포
 * 관리자 초기 비밀번호: INITIAL_PW (저장소에는 비워 두고, 편집기에 넣을 때만 값을 넣습니다).
 *   첫 로그인 후에는 스크립트 속성 ADMIN_HASH 에 저장되며 관리자 페이지에서 변경할 수 있습니다.
 */
var SHEET_NAME = '나무의공간 접수대장';
var DRAWING_FOLDER = '나무의공간 도면';
var INITIAL_PW = '';                          // 저장소 사본은 비워 둠 (배포 시에만 입력)
var SECRET = '';                              // 선택: 홈페이지 SITE.orderSecret 과 같은 값
var TZ = 'Asia/Seoul';
var TOKEN_HOURS = 12;

// 기본 설정 (관리자 페이지에서 저장하기 전까지 사용)
var DEFAULT_CONFIG = {
  mail: { to: ['ykj5359@daum.net'], cc: [], fromName: '나무의공간 홈페이지', ackEnabled: true,
    ackText: '{name} 님, 아래 내용으로 접수되었습니다.\n담당자가 확인 후 {tel} 로 연락드리겠습니다.',
    prefix: { contact: '[문의]', drawing: '[도면 주문]', order: '[주문]' } },
  company: { name: '나무의공간', ceo: '이영석', tel: '010-3509-2230', email: 'ykj5359@daum.net', bizname: '둥지인테리어',
    address: '충청남도 홍성군 서부면 지산1길 25-17', bizno: '131-36-54075', kakao: '', hours: '평일 09:00 ~ 18:00' },
  price: { natural: 140000, stain: 140000, corner: 30000, install: 40000, plyBlack: 0, paint: 0, min: 50000, vat: true },
  cost: { batten: 3600, battenLen: 3600, plywood: 18000, labor: 30000, stain: 0 },
  payment: { bank: '농협 000-0000-0000-00', holder: '이영석', clientKey: '', methods: { card: true, transfer: true, vbank: true, bank: true } },
  texts: { heroTitle: '나무가 만드는\n공간의 결', hero: '서두르는 손이 아니라 준비된 나무가 벽을 완성합니다. 현장은 고요하고, 마감은 고릅니다.',
    notice: { on: false, text: '', from: '', to: '' } },
  logo: 1,
};
var STATUSES = ['접수', '상담중', '견적확정', '입금대기', '입금완료', '제작중', '시공중', '완료', '취소'];
var H_IN = ['번호', '접수일시', '구분', '이름', '연락처', '이메일', '주소', '제목', '내용', '수량', '면적㎡', '공급가', '부가세', '합계', '원가(추정)', '입금액', '상태', '결제방식', '메모', '도면', '갱신일시'];
var H_PAY = ['입금ID', '입금일', '접수번호', '이름', '금액', '방법', '메모', '등록일시'];
var H_SALES = ['월', '주문건수', '수주액(합계)', '원가(추정)', '입금액', '미수금', '문의건수', '취소건수'];
var H_CANCEL = ['취소일시', '번호', '구분', '이름', '연락처', '합계', '입금액', '이전 상태', '취소 사유'];
var TYPE_NAME = { contact: '문의', drawing: '도면 주문', order: '장바구니 주문' };

// =============================== 진입점 ===============================
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'config') return json_(getConfig_());
  return json_({ ok: true, service: '나무의공간 접수', time: new Date() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || '{}');
    var action = body.action || 'submit';
    if (action === 'config') return json_(getConfig_());
    if (action === 'login') return json_(login_(body.pw));
    if (action === 'submit') { lock.waitLock(20000); return json_(submit_(body)); }
    // ---- 관리자 전용 ----
    if (!checkToken_(body.token)) return json_({ ok: false, error: 'auth' });
    lock.waitLock(20000);
    switch (action) {
      case 'admin.list': return json_(adminList_());
      case 'admin.saveConfig': return json_(saveConfig_(body.config));
      case 'admin.update': return json_(updateRow_(body.no, body.patch || {}));
      case 'admin.pay': return json_(addPayment_(body.pay || {}));
      case 'admin.delPay': return json_(delPayment_(body.id));
      case 'admin.delete': return json_(deleteRow_(body.no));
      case 'admin.restore': return json_(restoreRow_(body.no));
      case 'admin.changePw': return json_(changePw_(body.pw));
      case 'admin.rebuild': rebuildSales_(); return json_({ ok: true });
      default: return json_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

// =============================== 접수 ===============================
function submit_(body) {
  if (SECRET && body.secret !== SECRET) return { ok: false, error: 'forbidden' };
  var cfg = getConfig_(), M = cfg.mail;
  var type = body.type || 'contact';
  var subject = String(body.subject || '[홈페이지 접수]').slice(0, 200);
  var text = String(body.text || '');
  var customer = body.customer || {};
  var meta = body.meta || {};
  var doc = body.doc || null;
  var atts = (body.attachments || []).slice(0, 12).map(function (a) {
    var bytes = Utilities.base64Decode(String(a.data || '').replace(/^data:[^,]+,/, ''));
    return Utilities.newBlob(bytes, a.mime || 'image/jpeg', a.name || 'file.jpg');
  });
  var no = meta.no || ('R' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase());
  if (meta.no && findRow_(meta.no)) return { ok: true, no: no, duplicate: true };   // 같은 주문번호가 이미 접수됨 → 중복 발송·기록 방지

  // 1) 도면·사진을 드라이브에 보관
  var links = [];
  try {
    if (atts.length) {
      var folder = folder_();
      atts.forEach(function (b) { var f = folder.createFile(b); f.setName(no + '_' + b.getName()); links.push(f.getUrl()); });
    }
  } catch (x) { links.push('보관 실패: ' + x); }

  // 2) 회사 수신 (여러 주소) — 문서형 HTML (doc 가 있으면) + 첨부
  var inline = {}, imgKeys = [];
  atts.forEach(function (b, i) { if (i < 8 && /^image\//.test(b.getContentType() || '')) { var k = 'img' + i; inline[k] = b; imgKeys.push(k); } });
  var linkHtml = links.length ? '<p style="font-size:12px;color:#888;margin:8px 0 0">보관: ' + links.map(function (u) { return '<a href="' + u + '" style="color:#8b5a2b">' + u + '</a>'; }).join(' · ') + '</p>' : '';
  var html = doc ? renderDoc_(doc, cfg, no, imgKeys, false, '') + linkHtml
    : '<pre style="font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;font-size:14px;white-space:pre-wrap">' + esc_(text) + '</pre>' + linkHtml;
  var to = (M.to || []).filter(String).join(',');
  if (to) GmailApp.sendEmail(to, subject, text, { name: M.fromName, cc: (M.cc || []).filter(String).join(',') || undefined, replyTo: customer.email || undefined, htmlBody: html, inlineImages: doc ? inline : undefined, attachments: atts });

  // 3) 고객 접수 확인
  if (M.ackEnabled !== false && customer.email && /@/.test(customer.email)) {
    var ack = '[' + cfg.company.name + '] 접수 확인 — ' + subject.replace(/^\[[^\]]*\]\s*/, '');
    var head = String(M.ackText || '').replace('{name}', customer.name || '고객').replace('{tel}', customer.tel || '연락처');
    var ackText = head + '\n\n──────────────\n' + text + '\n──────────────\n\n' + cfg.company.name + ' · 대표 ' + cfg.company.ceo + ' · ' + cfg.company.tel + ' · ' + cfg.company.email;
    var ackHtml = doc ? renderDoc_(doc, cfg, no, imgKeys, true, head) : '<pre style="font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif;font-size:14px;white-space:pre-wrap">' + esc_(ackText) + '</pre>';
    GmailApp.sendEmail(customer.email, ack, ackText, { name: M.fromName, replyTo: cfg.company.email || to, htmlBody: ackHtml, inlineImages: doc ? inline : undefined, attachments: atts });
  }

  // 4) 접수 탭 기록
  var now = stamp_();
  var total = num_(meta.total), supply = num_(meta.supply), vat = num_(meta.vat);
  sheetIn_().appendRow([no, now, TYPE_NAME[type] || type, customer.name || '', "'" + (customer.tel || ''), customer.email || '', customer.addr || '',
    subject, text.slice(0, 5000), num_(meta.qty), num_(meta.area), supply, vat, total, num_(meta.cost), 0, type === 'contact' ? '접수' : (total ? '입금대기' : '접수'),
    meta.method || '', '', links.join('\n'), now]);
  rebuildSales_();
  return { ok: true, no: no };
}


// =============================== 문서형 메일 (주문내역서 · 문의 접수서) ===============================
// doc: { kind: 'order'|'drawing'|'contact', title, no, date, customer{name,tel,email,addr}, items[{name, spec[], qty, unit, sub}],
//        totals{supply,vat,total}, payment{method,bank}, memo, notes[], adminNote }
function renderDoc_(doc, cfg, no, imgKeys, forCustomer, ackHead) {
  var co = cfg.company || {}, h = esc_;
  var wonf = function (n) { return Math.round(num_(n)).toLocaleString('ko-KR') + '원'; };
  var kind = doc.kind || 'contact';
  var title = doc.title || (kind === 'contact' ? '문의 접수서' : '주문내역서');
  var c = doc.customer || {};
  var td = 'padding:9px 12px;border-bottom:1px solid #e9e2d6;font-size:14px;vertical-align:top;';
  var th = td + 'background:#f7f2ea;color:#6b4a2b;font-weight:700;width:120px;white-space:nowrap;';
  var out = [];
  out.push('<div style="background:#f4f1eb;padding:24px 12px;font-family:\'Malgun Gothic\',\'Apple SD Gothic Neo\',\'Noto Sans KR\',sans-serif;color:#2b2b2b;line-height:1.6">');
  out.push('<div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e4dacb;border-radius:12px;overflow:hidden">');
  // 머리글
  out.push('<div style="background:#2b2b2b;color:#fff;padding:22px 28px">' +
    '<div style="font-size:12px;letter-spacing:.25em;color:#d9b27f;font-weight:700">' + h(co.name || '나무의공간') + '</div>' +
    '<div style="font-size:24px;font-weight:900;margin-top:4px">' + h(title) + '</div>' +
    '<div style="font-size:13px;color:#cfc6b8;margin-top:6px">접수번호 <b style="color:#fff">' + h(no) + '</b> &nbsp;·&nbsp; ' + h(doc.date || stamp_()) + '</div></div>');
  out.push('<div style="padding:24px 28px">');
  if (forCustomer && ackHead) out.push('<p style="margin:0 0 18px;font-size:15px;white-space:pre-wrap">' + h(ackHead) + '</p>');
  // 고객 정보
  out.push('<h3 style="margin:0 0 8px;font-size:15px;color:#8b5a2b">' + (kind === 'contact' ? '문의자 정보' : '주문자 정보') + '</h3>');
  out.push('<table style="width:100%;border-collapse:collapse;border-top:2px solid #b9814a;margin-bottom:22px">' +
    '<tr><th style="' + th + '">이름</th><td style="' + td + '">' + h(c.name || '-') + '</td><th style="' + th + '">연락처</th><td style="' + td + '">' + h(c.tel || '-') + '</td></tr>' +
    '<tr><th style="' + th + '">이메일</th><td style="' + td + '">' + h(c.email || '-') + '</td><th style="' + th + '">' + (kind === 'contact' ? '관심 제품' : '배송 주소') + '</th><td style="' + td + '">' + h(c.addr || '-') + '</td></tr></table>');
  // 품목
  var items = doc.items || [];
  if (items.length) {
    out.push('<h3 style="margin:0 0 8px;font-size:15px;color:#8b5a2b">주문 품목</h3>');
    out.push('<table style="width:100%;border-collapse:collapse;border-top:2px solid #b9814a;margin-bottom:10px">' +
      '<tr><th style="' + th + 'width:34px;text-align:center">No</th><th style="' + th + 'width:auto">품목 · 사양</th><th style="' + th + 'width:50px;text-align:center">수량</th><th style="' + th + 'width:100px;text-align:right">단가</th><th style="' + th + 'width:110px;text-align:right">금액</th></tr>');
    items.forEach(function (it, i) {
      var spec = (it.spec || []).map(function (s) { return '<div style="font-size:12.5px;color:#555">' + h(s) + '</div>'; }).join('');
      out.push('<tr><td style="' + td + 'text-align:center">' + (i + 1) + '</td><td style="' + td + '"><b>' + h(it.name) + '</b>' + spec + '</td>' +
        '<td style="' + td + 'text-align:center">' + h(it.qty) + '장</td><td style="' + td + 'text-align:right">' + wonf(it.unit) + '</td><td style="' + td + 'text-align:right;font-weight:700">' + wonf(it.sub) + '</td></tr>');
    });
    out.push('</table>');
    var t = doc.totals || {};
    out.push('<table style="width:100%;border-collapse:collapse;margin-bottom:22px"><tr><td style="width:55%"></td><td>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:5px 12px;color:#666">공급가</td><td style="padding:5px 12px;text-align:right">' + wonf(t.supply) + '</td></tr>' +
      '<tr><td style="padding:5px 12px;color:#666">부가세' + (num_(t.vat) ? ' 10%' : '') + '</td><td style="padding:5px 12px;text-align:right">' + wonf(t.vat) + '</td></tr>' +
      '<tr><td style="padding:9px 12px;border-top:2px solid #2b2b2b;font-weight:900;font-size:15px">합계' + (doc.estimated ? ' (예상)' : '') + '</td><td style="padding:9px 12px;border-top:2px solid #2b2b2b;text-align:right;font-weight:900;font-size:18px;color:#8b5a2b">' + wonf(t.total) + '</td></tr>' +
      '</table></td></tr></table>');
  }
  // 결제 안내
  var p = doc.payment;
  if (p && (p.method || p.bank)) {
    out.push('<h3 style="margin:0 0 8px;font-size:15px;color:#8b5a2b">결제 · 입금 안내</h3>');
    out.push('<table style="width:100%;border-collapse:collapse;border-top:2px solid #b9814a;margin-bottom:22px">' +
      (p.method ? '<tr><th style="' + th + '">결제 방법</th><td style="' + td + '">' + h(p.method) + '</td></tr>' : '') +
      (p.bank ? '<tr><th style="' + th + '">입금 계좌</th><td style="' + td + '"><b>' + h(p.bank) + '</b></td></tr>' : '') + '</table>');
  }
  // 문의 내용 / 요청 사항
  if (doc.message) out.push('<h3 style="margin:0 0 8px;font-size:15px;color:#8b5a2b">' + (kind === 'contact' ? '문의 내용' : '요청 사항') + '</h3><div style="background:#fbf8f3;border:1px solid #e4dacb;border-radius:8px;padding:12px 14px;font-size:14px;white-space:pre-wrap;margin-bottom:22px">' + h(doc.message) + '</div>');
  // 도면 · 사진
  if (imgKeys && imgKeys.length) {
    out.push('<h3 style="margin:0 0 8px;font-size:15px;color:#8b5a2b">' + (kind === 'contact' ? '현장 사진' : '주문 도면') + '</h3>');
    imgKeys.forEach(function (k, i) { out.push('<div style="margin-bottom:12px;border:1px solid #e4dacb;border-radius:8px;overflow:hidden"><img src="cid:' + k + '" style="display:block;width:100%;max-width:640px" alt="도면 ' + (i + 1) + '"></div>'); });
    out.push('<div style="margin-bottom:22px"></div>');
  }
  // 안내 문구
  var notes = doc.notes || [];
  if (notes.length) out.push('<ul style="margin:0 0 18px;padding-left:18px;font-size:12.5px;color:#666">' + notes.map(function (n) { return '<li>' + h(n) + '</li>'; }).join('') + '</ul>');
  if (!forCustomer && doc.adminNote) out.push('<div style="background:#fff7ed;border:1px dashed #d9b27f;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#9a3412;white-space:pre-wrap;margin-bottom:10px"><b>[관리자 참고 · 원가]</b>\n' + h(doc.adminNote) + '</div>');
  out.push('</div>');
  // 바닥글
  out.push('<div style="background:#f7f2ea;border-top:1px solid #e4dacb;padding:16px 28px;font-size:12.5px;color:#666;line-height:1.7">' +
    '<b style="color:#2b2b2b">' + h(co.name || '') + '</b> · 대표 ' + h(co.ceo || '') + ' · ' + h(co.tel || '') + ' · ' + h(co.email || '') + '<br>' +
    '사업자등록번호 ' + h(co.bizno || '') + (co.bizname ? ' (' + h(co.bizname) + ')' : '') + ' · ' + h(co.address || '') + '</div>');
  out.push('</div></div>');
  return out.join('');
}

// =============================== 설정 ===============================
function getConfig_() {
  var sh = sheetCfg_(), rows = sh.getDataRange().getValues(), cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  for (var i = 1; i < rows.length; i++) {
    var k = rows[i][0], v = rows[i][1]; if (!k) continue;
    try { cfg[k] = deepMerge_(cfg[k], JSON.parse(v)); } catch (x) {}
  }
  cfg.statuses = STATUSES;
  return cfg;
}
function saveConfig_(c) {
  if (!c || typeof c !== 'object') return { ok: false, error: 'no config' };
  var sh = sheetCfg_(), keys = ['mail', 'company', 'price', 'cost', 'payment', 'texts', 'logo'];
  var rows = [['키', '값(JSON)', '설명']];
  var desc = { mail: '이메일 수신·확인 메일', company: '회사 정보', price: '판매 단가', cost: '원가 기준', payment: '결제·입금 계좌', texts: '화면 문구·공지', logo: '로고 번호' };
  keys.forEach(function (k) { if (c[k] !== undefined) rows.push([k, JSON.stringify(c[k]), desc[k]]); });
  sh.clearContents(); sh.getRange(1, 1, rows.length, 3).setValues(rows);
  return { ok: true, config: getConfig_() };
}

// =============================== 관리자 API ===============================
function adminList_() {
  var rows = sheetIn_().getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    var o = {}; H_IN.forEach(function (h, i) { o[KEY_IN[i]] = r[i] instanceof Date ? stamp_(r[i]) : r[i]; }); o.tel = String(o.tel || '').replace(/^'/, ''); return o;
  });
  var pays = sheetPay_().getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    var o = {}; H_PAY.forEach(function (h, i) { o[KEY_PAY[i]] = r[i] instanceof Date ? Utilities.formatDate(r[i], TZ, 'yyyy-MM-dd') : r[i]; }); return o;
  });
  var cancels = sheetCancel_().getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    var o = {}; KEY_CANCEL.forEach(function (k, i) { o[k] = r[i] instanceof Date ? stamp_(r[i]) : r[i]; }); o.tel = String(o.tel || '').replace(/^'/, ''); return o;
  });
  return { ok: true, rows: rows.reverse(), payments: pays.reverse(), cancels: cancels.reverse(), sales: salesData_(rows, pays), statuses: STATUSES, sheetUrl: ss_().getUrl(), folderUrl: folder_().getUrl(), config: getConfig_() };
}
var KEY_IN = ['no', 'at', 'type', 'name', 'tel', 'email', 'addr', 'subject', 'text', 'qty', 'area', 'supply', 'vat', 'total', 'cost', 'paid', 'status', 'method', 'memo', 'files', 'updated'];
var KEY_PAY = ['id', 'date', 'no', 'name', 'amount', 'method', 'memo', 'created'];
var KEY_CANCEL = ['at', 'no', 'type', 'name', 'tel', 'total', 'paid', 'prevStatus', 'reason'];

function findRow_(no) {
  var sh = sheetIn_(), col = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < col.length; i++) if (String(col[i][0]) === String(no)) return i + 1;
  return 0;
}
function updateRow_(no, patch) {
  var r = findRow_(no); if (!r) return { ok: false, error: 'not found' };
  var sh = sheetIn_(), map = { status: 17, memo: 19, supply: 12, vat: 13, total: 14, cost: 15, method: 18, name: 4, tel: 5, email: 6, addr: 7 };
  var prev = sh.getRange(r, 1, 1, 21).getValues()[0];
  if (patch.status === '취소' && String(prev[16]) !== '취소') {   // 취소 내역 기록
    sheetCancel_().appendRow([stamp_(), no, prev[2], prev[3], "'" + String(prev[4] || '').replace(/^'/, ''), num_(patch.total !== undefined ? patch.total : prev[13]), num_(prev[15]), String(prev[16]), String(patch.cancelReason || '')]);
    if (patch.cancelReason) patch.memo = (patch.memo ? patch.memo + '\n' : '') + '[취소 사유] ' + patch.cancelReason;
  }
  Object.keys(patch).forEach(function (k) { if (map[k]) sh.getRange(r, map[k]).setValue(k === 'tel' ? "'" + patch[k] : patch[k]); });
  sh.getRange(r, 21).setValue(stamp_());
  rebuildSales_();
  return { ok: true };
}
// 취소 복원: 취소 직전 상태로 되돌리고 취소 탭에 복원 기록을 남김
function restoreRow_(no) {
  var r = findRow_(no); if (!r) return { ok: false, error: 'not found' };
  var sh = sheetIn_(), prev = sh.getRange(r, 1, 1, 21).getValues()[0];
  if (String(prev[16]) !== '취소') return { ok: false, error: '취소 상태가 아닙니다' };
  var back = '접수', cs = sheetCancel_().getDataRange().getValues();
  for (var i = cs.length - 1; i >= 1; i--) if (String(cs[i][1]) === String(no) && String(cs[i][7]) !== '취소') { back = String(cs[i][7]) || '접수'; break; }
  if (STATUSES.indexOf(back) < 0 || back === '취소') back = '접수';
  sheetCancel_().appendRow([stamp_(), no, prev[2], prev[3], "'" + String(prev[4] || '').replace(/^'/, ''), num_(prev[13]), num_(prev[15]), '취소', '[복원] → ' + back]);
  sh.getRange(r, 17).setValue(back);
  sh.getRange(r, 19).setValue((prev[18] ? prev[18] + '\n' : '') + '[취소 복원] ' + stamp_() + ' → ' + back);
  sh.getRange(r, 21).setValue(stamp_());
  rebuildSales_();
  return { ok: true, status: back };
}
// 접수 행 삭제 (해당 입금 기록도 함께 삭제)
function deleteRow_(no) {
  var r = findRow_(no); if (!r) return { ok: false, error: 'not found' };
  sheetIn_().deleteRow(r);
  var sh = sheetPay_(), col = sh.getRange(1, 1, sh.getLastRow(), 3).getValues();
  for (var i = col.length - 1; i >= 1; i--) if (String(col[i][2]) === String(no)) sh.deleteRow(i + 1);
  rebuildSales_();
  return { ok: true };
}
function addPayment_(p) {
  var amount = num_(p.amount); if (!p.no || !amount) return { ok: false, error: '접수번호와 금액이 필요합니다' };
  var id = 'P' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss');
  sheetPay_().appendRow([id, p.date || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), p.no, p.name || '', amount, p.method || '계좌이체', p.memo || '', stamp_()]);
  syncPaid_(p.no);
  return { ok: true, id: id };
}
function delPayment_(id) {
  var sh = sheetPay_(), col = sh.getRange(1, 1, sh.getLastRow(), 3).getValues();
  for (var i = 1; i < col.length; i++) if (String(col[i][0]) === String(id)) { var no = col[i][2]; sh.deleteRow(i + 1); syncPaid_(no); return { ok: true }; }
  return { ok: false, error: 'not found' };
}
// 접수 행의 입금액 합계·상태 갱신
function syncPaid_(no) {
  var r = findRow_(no); if (!r) return;
  var pays = sheetPay_().getDataRange().getValues().slice(1), sum = 0;
  pays.forEach(function (p) { if (String(p[2]) === String(no)) sum += num_(p[4]); });
  var sh = sheetIn_(), total = num_(sh.getRange(r, 14).getValue()), st = String(sh.getRange(r, 17).getValue());
  sh.getRange(r, 16).setValue(sum);
  if (sum > 0 && sum >= total && ['접수', '상담중', '견적확정', '입금대기'].indexOf(st) >= 0) sh.getRange(r, 17).setValue('입금완료');
  if (sum === 0 && st === '입금완료') sh.getRange(r, 17).setValue('입금대기');
  sh.getRange(r, 21).setValue(stamp_());
  rebuildSales_();
}

// =============================== 매출 집계 ===============================
function salesData_(rows, pays) {
  var m = {};
  var get = function (k) { return m[k] || (m[k] = { month: k, orders: 0, sales: 0, cost: 0, paid: 0, due: 0, contacts: 0, cancels: 0 }); };
  rows.forEach(function (r) {
    var k = String(r.at || '').slice(0, 7); if (!k) return; var o = get(k);
    if (r.type === '문의') { o.contacts++; return; }
    if (r.status === '취소') { o.cancels++; return; }
    o.orders++; o.sales += num_(r.total); o.cost += num_(r.cost); o.due += Math.max(0, num_(r.total) - num_(r.paid));
  });
  pays.forEach(function (p) { var k = String(p.date || '').slice(0, 7); if (k) get(k).paid += num_(p.amount); });
  return Object.keys(m).sort().reverse().map(function (k) { return m[k]; });
}
function rebuildSales_() {
  var d = adminListRaw_(), s = salesData_(d.rows, d.pays), sh = sheetSales_();
  var out = [H_SALES];
  s.forEach(function (o) { out.push([o.month, o.orders, o.sales, o.cost, o.paid, o.due, o.contacts, o.cancels]); });
  var t = s.reduce(function (a, o) { a[0] += o.orders; a[1] += o.sales; a[2] += o.cost; a[3] += o.paid; a[4] += o.due; a[5] += o.contacts; a[6] += o.cancels; return a; }, [0, 0, 0, 0, 0, 0, 0]);
  out.push(['합계', t[0], t[1], t[2], t[3], t[4], t[5], t[6]]);
  sh.clearContents(); sh.getRange(1, 1, out.length, H_SALES.length).setValues(out);
  sh.getRange(2, 3, Math.max(1, out.length - 1), 4).setNumberFormat('#,##0');
}
function adminListRaw_() {
  var rows = sheetIn_().getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) { var o = {}; KEY_IN.forEach(function (k, i) { o[k] = r[i] instanceof Date ? stamp_(r[i]) : r[i]; }); return o; });
  var pays = sheetPay_().getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) { var o = {}; KEY_PAY.forEach(function (k, i) { o[k] = r[i] instanceof Date ? Utilities.formatDate(r[i], TZ, 'yyyy-MM-dd') : r[i]; }); return o; });
  return { rows: rows, pays: pays };
}

// =============================== 인증 ===============================
function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'namu:' + s, Utilities.Charset.UTF_8)); }
function login_(pw) {
  pw = String(pw || ''); if (!pw) return { ok: false, error: 'pw' };
  var props = PropertiesService.getScriptProperties(), h = props.getProperty('ADMIN_HASH');
  var ok = h ? hash_(pw) === h : (INITIAL_PW && pw === INITIAL_PW);
  if (!ok) { Utilities.sleep(800); return { ok: false, error: '비밀번호가 다릅니다' }; }
  if (!h) props.setProperty('ADMIN_HASH', hash_(pw));
  var token = Utilities.getUuid().replace(/-/g, '');
  var tokens = JSON.parse(props.getProperty('TOKENS') || '{}'), now = Date.now();
  Object.keys(tokens).forEach(function (t) { if (tokens[t] < now) delete tokens[t]; });
  tokens[token] = now + TOKEN_HOURS * 3600 * 1000;
  props.setProperty('TOKENS', JSON.stringify(tokens));
  props.setProperty('LAST_LOGIN', stamp_());
  return { ok: true, token: token, expires: tokens[token] };
}
function checkToken_(t) {
  if (!t) return false;
  var tokens = JSON.parse(PropertiesService.getScriptProperties().getProperty('TOKENS') || '{}');
  return !!(tokens[t] && tokens[t] > Date.now());
}
function changePw_(pw) {
  pw = String(pw || ''); if (pw.length < 6) return { ok: false, error: '6자 이상' };
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_HASH', hash_(pw)); props.setProperty('TOKENS', '{}');
  return { ok: true };
}

// =============================== 시트·폴더 ===============================
function ss_() {
  if (ss_.cache) return ss_.cache;
  var files = DriveApp.getFilesByName(SHEET_NAME), ss;
  if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
  else ss = SpreadsheetApp.create(SHEET_NAME);
  // 예전 형식(9열) 시트는 이름을 바꿔 보존
  ss.getSheets().forEach(function (s) { var h = s.getRange(1, 1, 1, Math.max(1, s.getLastColumn())).getValues()[0]; if (h[0] === '접수일시' && h[1] === '구분' && s.getName() !== '접수(구)') s.setName('접수(구)'); });
  ss_.cache = ss; return ss;
}
function tab_(name, header) {
  var ss = ss_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold'); sh.setFrozenRows(1); }
  var first = ss.getSheets()[0]; if (first.getName() !== '접수' && (first.getName() === '시트1' || first.getName() === 'Sheet1') && first.getLastRow() <= 1) ss.deleteSheet(first);
  return sh;
}
function sheetIn_() { return tab_('접수', H_IN); }
function sheetPay_() { return tab_('입금', H_PAY); }
function sheetSales_() { return tab_('매출', H_SALES); }
function sheetCfg_() { return tab_('설정', ['키', '값(JSON)', '설명']); }
function sheetCancel_() { return tab_('취소', H_CANCEL); }
function folder_() {
  if (folder_.cache) return folder_.cache;
  var it = DriveApp.getFoldersByName(DRAWING_FOLDER);
  folder_.cache = it.hasNext() ? it.next() : DriveApp.createFolder(DRAWING_FOLDER);
  return folder_.cache;
}

// =============================== 유틸 ===============================
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esc_(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
function num_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
function stamp_(d) { return Utilities.formatDate(d || new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function deepMerge_(a, b) {
  if (b === undefined || b === null) return a;
  if (typeof a !== 'object' || a === null || Array.isArray(a) || typeof b !== 'object' || Array.isArray(b)) return b;
  var o = JSON.parse(JSON.stringify(a)); Object.keys(b).forEach(function (k) { o[k] = deepMerge_(a[k], b[k]); }); return o;
}

/** 설치: 편집기에서 한 번 실행해 드라이브 폴더·시트 탭을 만들고 권한을 승인합니다. */
function setup() {
  sheetIn_(); sheetPay_(); sheetSales_(); sheetCfg_(); sheetCancel_();
  Logger.log('시트: ' + ss_().getUrl() + '\n폴더: ' + folder_().getUrl());
}

/** 테스트: 편집기에서 실행하면 권한 승인 창이 뜨고 테스트 접수가 기록·발송됩니다. */
function testSend() {
  var r = doPost({ postData: { contents: JSON.stringify({ type: 'contact', subject: '[테스트] 접수 스크립트 확인', text: '스크립트가 정상 동작합니다.', customer: { name: '테스트', tel: '010-0000-0000', email: '' } }) } });
  Logger.log(r.getContent());
}
