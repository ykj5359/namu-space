# 나무의공간 — 템바보드 홈페이지·전자 카탈로그

나왕 30×30 각재 템바보드 제작·시공 업체 홈페이지. 정적 HTML이라 서버 없이 GitHub Pages 등에 그대로 올릴 수 있습니다.

## 폴더 구조

```
site/                  배포용 홈페이지 (이 폴더만 올리면 됨)
  index.html           메인 (제품·규격·마감·연출 갤러리·시공 현장·주문 방법·문의)
  order.html           도면 주문 페이지 (A~F 입력 → 도면 자동 작성 → 이메일 접수)
  catalog.html         전자 카탈로그 보기·내려받기
  catalog.pdf          A4 카탈로그 11페이지
  logo.html            로고 후보 10종 선택 페이지
  css/style.css        공통 스타일
  js/main.js           회사 정보(SITE)·로고 삽입·메뉴·라이트박스·문의 폼
  js/logos.js          로고 10종 SVG
  js/order.js          도면 계산·캔버스 작도·주문서 저장/전송
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
- A(폭), B(높이), C(시작 여백), D(각재 구간), E(끝 여백), F(코너 돌림 길이) — 입력
- D는 60mm 단위로 맞춰지고 나머지는 E에 더해짐
- 합판 원장 1220×2440 기준으로 가로·세로 이음선(회색 점선)과 원장 장수를 계산 (크기 제한 없음)
- 코너: 없음/좌/우/양쪽. 코너 평면 상세(22mm 노출)가 시트에 같이 그려짐
- URL 로 미리 채우기: `order.html?A=3000&B=1500&C=45&E=45&corner=both&F=300`

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
