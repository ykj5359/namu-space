# 나무의공간 — 템바보드 홈페이지·전자 카탈로그

나왕 30×30 각재 템바보드 제작·시공 업체 홈페이지. 정적 HTML이라 서버 없이 GitHub Pages 등에 그대로 올릴 수 있습니다.

## 폴더 구조

```
site/                  배포용 홈페이지 (이 폴더만 올리면 됨)
  index.html           메인 (제품·규격·마감·연출 갤러리·시공 현장·주문 방법·문의)
  order.html           도면 주문 페이지 (치수 입력 → 도면 자동 작성 → 장바구니 담기 / 이메일 접수)
  cart.html            장바구니 (도면 목록·수량·예상 금액)
  checkout.html        주문·결제 (주문자 정보, 결제 방법)
  complete.html        주문 완료 (주문번호, 도면 이미지, 주문서 메일)
  catalog.html         전자 카탈로그 보기·내려받기
  catalog.pdf          A4 카탈로그 11페이지
  logo.html            로고 후보 10종 선택 페이지
  css/style.css        공통 스타일
  js/main.js           회사 정보(SITE)·로고 삽입·메뉴·라이트박스·문의 폼
  js/logos.js          로고 10종 SVG
  js/order.js          도면 계산·다이어그램(SVG)·캔버스 시트·주문서 저장/전송·장바구니 스냅샷
  js/cart.js           장바구니 저장(localStorage)·예상 금액·우측 주문내역 팝업
  js/payments.js       결제 모듈 (토스페이먼츠 결제창 / 모의 결제)
  js/view3d.js         3D 시뮬레이션 (Three.js, CDN) — 벽면/기둥/상담 책상/벽 상단/제품만 장면
  img/product/         누끼 제품 사진 (PNG, 투명 배경)
  img/detail/          제품 디테일·공장·코너 사진
  img/site/            시공 현장 사진 (워터마크 제거)
  img/interior/        제미나이 실내 연출 이미지 24장 (v_* 10장은 현장 사진 참조 세로 시공)
  img/catalog/         카탈로그 페이지 썸네일
catalog/catalog.html   카탈로그 원본 (A4 페이지 HTML) → PDF 로 변환
tools/
  process_images.py    원본 → 리사이즈·워터마크 제거(resize) / 누끼(cutout)
  gen-interiors.mjs    제미나이로 실내 연출 이미지 생성 (실제 제품 사진 참조)
  build_catalog.py     catalog.html → site/catalog.pdf + 썸네일
이미지/                 원본 사진 (배포 제외)
img-original/          제미나이 생성 원본 PNG (보관용)
.env                   API 키 (공개 저장소에 올리지 말 것)
```

## 회사 정보 바꾸기

`site/js/main.js` 맨 위 `SITE` 객체만 고치면 모든 페이지에 반영됩니다. 주소·사업자번호·카카오 채널은 현재 비어 있습니다.

## 로고 정하기

`site/logo.html` 에서 클릭하면 그 브라우저에서 즉시 바뀝니다. 확정하려면 `SITE.defaultLogo` 번호를 바꾸고,
카탈로그는 `python tools/build_catalog.py <번호>` 로 다시 만듭니다.

## 도면 주문 페이지 규칙

- 각재 30×30, 간격 30(피치 60), 합판 8 — 고정
- A(폭), B(높이), C(각재 길이), D(끝 여백), F(시작 여백), E(각재 구간), G(끝 여백), K(코너 돌림 길이) — 입력 (그림 속 네모칸 또는 패널)
- E는 60mm 단위로 맞춰지고 나머지는 G에 더해짐. C + D = 각재 길이 방향 전체, F + E + G = 쌓임 방향 전체
- 화면 다이어그램과 도면 시트는 같은 장면 데이터를 그려 항상 동일 (세로 치수는 왼쪽, 가로 치수는 위·아래)
- 합판 원장 1220×2440 기준으로 가로·세로 이음선(회색 점선)과 원장 장수를 계산 (크기 제한 없음)
- 코너: 없음/좌/우/양쪽. 코너 평면 상세(22mm 노출)가 시트에 같이 그려짐
- URL 로 미리 채우기: `order.html?dir=v&A=1200&B=2400&D=0&F=60&G=60&corner=left&K=300`

## 3D 시뮬레이션

도면 주문 페이지의 3D 카드는 같은 치수 데이터로 패널을 세워 올립니다. 자동 모드 규칙: 코너형 → 기둥, 각재 길이 1,800 이상 → 벽면, 그보다 짧고 높이 1,200 이하 → 상담 책상 전면, 그 외 → 벽 상단. 버튼으로 장면을 바꿀 수 있습니다. Three.js 는 jsdelivr CDN 에서 불러옵니다. 3D 옆에는 장면·마감별 실사 예시(`img/interior/sim_*.jpg`, 제미나이 생성)가 자동으로 붙습니다.

## 장바구니 · 예상 금액 · 결제

- 도면 주문 페이지에서 수량을 정하고 **장바구니에 담기** → 우측 **주문내역** 패널에 도면·수량·예상 금액이 쌓입니다. **추가 도면 만들기**로 새 치수를 넣고 또 담을 수 있습니다.
- 장바구니(`cart.html`)에서 수량 조정·복제·삭제·수정(도면 주문 페이지로 불러오기)이 되고, 결제(`checkout.html`)에서 주문자 정보와 결제 방법을 고릅니다.
- 예상 금액 단가는 `site/js/main.js` 의 `SITE.price` 에서 바꿉니다 (㎡당 무도장/스테인 단가, 코너 1면당, 현장 시공 ㎡당, 1장 최소 금액). 부가세 10%는 자동으로 더해집니다.
- 장바구니와 주문 내역은 방문자 브라우저(localStorage)에만 저장됩니다. 서버가 없으므로 주문은 완료 페이지의 **주문서 이메일로 보내기**(모바일은 도면 첨부 공유, PC는 도면 저장 + 메일 열기)로 전달됩니다.

### 결제 연동 (실제 결제를 켜는 방법)

현재는 `SITE.payment.clientKey` 가 비어 있어 **모의 결제**로 동작합니다(주문번호 발급 → 완료 페이지 → 무통장입금 안내). 실제 결제는 다음 순서로 켭니다.

1. **결제대행사(PG) 가입**: 토스페이먼츠(tosspayments.com) 또는 포트원(portone.io)에 사업자등록증·통장으로 가맹 신청. 심사 후 클라이언트 키와 시크릿 키를 받습니다. (테스트 키는 즉시 발급되어 결제창 동작을 먼저 확인할 수 있습니다.)
2. **클라이언트 키 입력**: `SITE.payment.clientKey` 에 넣으면 결제하기 버튼이 토스 결제창(카드·계좌이체·가상계좌)을 엽니다. 이 코드는 이미 `js/payments.js` 에 있습니다.
3. **승인 서버 만들기 (필수)**: 결제창에서 성공하면 `complete.html?paymentKey=…&orderId=…&amount=…` 로 돌아오는데, 이 결제를 **확정(승인)** 하려면 시크릿 키로 토스 승인 API(`POST /v1/payments/confirm`)를 호출해야 합니다. 시크릿 키는 홈페이지에 넣으면 안 되므로 작은 서버가 필요합니다. GitHub Pages 는 서버가 없으니 **Cloudflare Workers(무료)** 나 **Vercel Functions** 에 승인 함수 하나를 올리고, `complete.html` 에서 그 주소로 `paymentKey/orderId/amount` 를 보내 승인 결과를 받으면 됩니다. 같은 서버에서 주문 내용을 이메일(ykj5359@daum.net)로 보내면 주문 접수까지 자동화됩니다.
4. **정산·환불**: PG 관리자 화면에서 처리합니다. 가상계좌 입금 통보(웹훅)도 3의 서버가 받습니다.

서버 없이 당장 쓰려면: 무통장입금(현재 방식) 또는 토스/카카오페이 **송금 링크**를 완료 페이지에 넣는 방법이 있습니다. 카드 결제는 반드시 PG 가맹과 승인 서버가 있어야 합니다.

## 주문서 전송 (현재 상태: 이메일 자동 발송 보류)

1. EmailJS 설정이 있으면 자동 발송 (미설정)
2. 모바일: 공유 시트로 도면 이미지 첨부 → 메일 앱 선택
3. PC: 도면 PNG 자동 다운로드 + 메일 앱이 열리며 내용 자동 작성 → 파일 첨부 후 발송

자동 발송을 켜려면 EmailJS(emailjs.com) 가입 후 `SITE.emailjs` 의 publicKey/serviceId/templateId 를 채우고,
`order.html` 하단의 EmailJS 스크립트 주석을 풀면 됩니다.

## 로컬에서 보기

```bash
python -m http.server 8766 --directory site
```

## 이미지 다시 만들기

```bash
python tools/process_images.py resize     # 리사이즈·워터마크 제거
python tools/process_images.py cutout     # 누끼 (rembg)
node tools/gen-interiors.mjs              # 없는 연출 이미지만 생성, FORCE=1 로 재생성
python tools/build_catalog.py 1           # 카탈로그 PDF (로고 1번)
```

## 배포

GitHub 저장소 `ykj5359/namu-space` 의 `main` 에 푸시하면 Actions 워크플로(`.github/workflows/pages.yml`)가 `site/` 폴더를 GitHub Pages 로 배포합니다.
주소: https://ykj5359.github.io/namu-space/

```bash
git add -A
git commit -m "내용 수정"
git push
```
