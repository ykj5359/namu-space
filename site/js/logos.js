// 나무의공간 로고 후보 10종 (SVG 문자열). 사이트 헤더·로고 선택 페이지·카탈로그에서 공용.
// 각 항목: { id, name, desc, svg }  — svg 는 viewBox 기준 가로형 로고
window.NW_LOGOS = (function () {
  const F = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";
  const S = "'Nanum Myeongjo','Noto Serif KR','Batang',serif";
  const wood = '#B9814A', dark = '#2B2B2B', green = '#2F4A3A', cream = '#F3EBDD', light = '#D9B27F';

  // 1. 세로 슬랫 아이콘 + 고딕 워드마크
  const l1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <g fill="${wood}">
      <rect x="18" y="22" width="12" height="76" rx="2"/><rect x="38" y="22" width="12" height="76" rx="2"/>
      <rect x="58" y="22" width="12" height="76" rx="2"/><rect x="78" y="22" width="12" height="76" rx="2"/>
      <rect x="98" y="22" width="12" height="76" rx="2"/>
    </g>
    <text x="130" y="68" font-family="${F}" font-weight="700" font-size="40" fill="${dark}">나무의공간</text>
    <text x="132" y="96" font-family="${F}" font-weight="400" font-size="15" letter-spacing="6" fill="${wood}">NAMU SPACE</text>
  </svg>`;

  // 2. 나이테 원형 아이콘 + 명조 워드마크
  const l2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <g fill="none" stroke="${wood}" stroke-width="3">
      <circle cx="60" cy="60" r="44"/><circle cx="60" cy="60" r="32" stroke-width="2.5"/>
      <circle cx="60" cy="60" r="21" stroke-width="2"/><circle cx="60" cy="60" r="11" stroke-width="2"/>
      <circle cx="60" cy="60" r="3" fill="${wood}" stroke="none"/>
    </g>
    <text x="122" y="70" font-family="${S}" font-weight="700" font-size="42" fill="${dark}">나무의공간</text>
    <text x="126" y="96" font-family="${F}" font-size="14" letter-spacing="5" fill="#777">나왕 템바보드 · 인테리어 목재</text>
  </svg>`;

  // 3. 사각 프레임 안 '木' + 워드마크 (짙은 녹색)
  const l3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <rect x="14" y="14" width="92" height="92" rx="10" fill="${green}"/>
    <text x="60" y="88" text-anchor="middle" font-family="${S}" font-weight="700" font-size="66" fill="${cream}">木</text>
    <text x="126" y="66" font-family="${F}" font-weight="700" font-size="38" fill="${green}">나무의공간</text>
    <text x="128" y="94" font-family="${F}" font-size="14" letter-spacing="4" fill="${wood}">NAMU · SPACE OF WOOD</text>
  </svg>`;

  // 4. 잎사귀 라인 아이콘 + 얇은 워드마크
  const l4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <g fill="none" stroke="${green}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M30 96 C 30 40, 70 20, 104 22 C 104 60, 84 96, 30 96 Z"/>
      <path d="M32 94 C 50 70, 70 50, 100 26"/>
    </g>
    <text x="126" y="66" font-family="${F}" font-weight="300" font-size="40" letter-spacing="2" fill="${dark}">나무의공간</text>
    <text x="129" y="94" font-family="${F}" font-size="13" letter-spacing="6" fill="${green}">THE SPACE OF WOOD</text>
  </svg>`;

  // 5. 30각 단면 격자 아이콘 (3×3) + 워드마크
  const l5 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <g fill="${wood}">
      ${[0,1,2].map(r => [0,1,2].map(c => `<rect x="${20 + c*28}" y="${20 + r*28}" width="22" height="22" rx="3" fill="${(r+c)%2 ? light : wood}"/>`).join('')).join('')}
    </g>
    <text x="126" y="66" font-family="${F}" font-weight="800" font-size="40" fill="${dark}">나무의공간</text>
    <text x="128" y="94" font-family="${F}" font-size="14" letter-spacing="3" fill="#666">30×30 나왕 템바보드 전문</text>
  </svg>`;

  // 6. 워드마크 단독 (명조) + 우드 밑줄 슬랫
  const l6 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <text x="210" y="62" text-anchor="middle" font-family="${S}" font-weight="700" font-size="50" letter-spacing="6" fill="${dark}">나무의공간</text>
    <g fill="${wood}">${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<rect x="${70 + i*24}" y="78" width="14" height="6" rx="1"/>`).join('')}</g>
    <text x="210" y="106" text-anchor="middle" font-family="${F}" font-size="13" letter-spacing="8" fill="#888">NAMU SPACE</text>
  </svg>`;

  // 7. 집 실루엣 + 슬랫 (인테리어·시공 강조)
  const l7 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <path d="M60 14 L110 56 L98 56 L98 104 L22 104 L22 56 L10 56 Z" fill="${dark}"/>
    <g fill="${wood}"><rect x="34" y="62" width="9" height="42"/><rect x="49" y="62" width="9" height="42"/><rect x="64" y="62" width="9" height="42"/><rect x="79" y="62" width="9" height="42"/></g>
    <text x="126" y="66" font-family="${F}" font-weight="700" font-size="38" fill="${dark}">나무의공간</text>
    <text x="128" y="94" font-family="${F}" font-size="14" letter-spacing="2" fill="${wood}">템바보드 제작 · 현장 시공</text>
  </svg>`;

  // 8. 원형 배경 안 그라데이션 슬랫 + 워드마크
  const l8 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <defs><linearGradient id="g8" x1="0" x2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="#8B5A2B"/></linearGradient>
    <clipPath id="c8"><circle cx="60" cy="60" r="46"/></clipPath></defs>
    <circle cx="60" cy="60" r="46" fill="${cream}"/>
    <g clip-path="url(#c8)" fill="url(#g8)">${[0,1,2,3,4,5,6].map(i => `<rect x="${18 + i*13}" y="10" width="8" height="100"/>`).join('')}</g>
    <text x="126" y="66" font-family="${F}" font-weight="700" font-size="40" fill="${dark}">나무의공간</text>
    <text x="128" y="94" font-family="${F}" font-size="14" letter-spacing="5" fill="#8B5A2B">NAMU SPACE STUDIO</text>
  </svg>`;

  // 9. 모노그램 'N' 슬랫 구성 (모던)
  const l9 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <g fill="${dark}"><rect x="18" y="20" width="16" height="80"/><rect x="82" y="20" width="16" height="80"/></g>
    <polygon points="18,20 34,20 98,100 82,100" fill="${wood}"/>
    <text x="126" y="60" font-family="${F}" font-weight="900" font-size="36" letter-spacing="1" fill="${dark}">나무의공간</text>
    <text x="128" y="90" font-family="${F}" font-weight="500" font-size="15" letter-spacing="7" fill="${wood}">NAMU SPACE</text>
  </svg>`;

  // 10. 원형 스탬프·배지 스타일
  const l10 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120">
    <defs><path id="p10" d="M60,60 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0"/></defs>
    <circle cx="60" cy="60" r="52" fill="none" stroke="${green}" stroke-width="3"/>
    <circle cx="60" cy="60" r="30" fill="${green}"/>
    <text x="60" y="71" text-anchor="middle" font-family="${S}" font-weight="700" font-size="30" fill="${cream}">木</text>
    <text font-family="${F}" font-size="9.5" letter-spacing="2.2" fill="${green}" font-weight="700"><textPath href="#p10" startOffset="3%">NAMU SPACE · LAUAN TEMBA BOARD · SINCE 2026 ·</textPath></text>
    <text x="126" y="66" font-family="${S}" font-weight="700" font-size="40" fill="${green}">나무의공간</text>
    <text x="129" y="94" font-family="${F}" font-size="13" letter-spacing="4" fill="#777">나왕 각재 · 합판 바탕 · 주문 제작</text>
  </svg>`;

  return [
    { id: 1,  name: '슬랫 심볼',     desc: '세로 각재 5개를 상징화한 아이콘 + 굵은 고딕. 가장 무난하고 제품이 바로 연상됩니다.', svg: l1 },
    { id: 2,  name: '나이테 원형',   desc: '나무 단면의 나이테 라인 + 명조 워드마크. 고급스럽고 차분한 인상.', svg: l2 },
    { id: 3,  name: '木 사각 엠블럼', desc: '짙은 녹색 사각에 한자 木. 간판·명함에 강한 인상.', svg: l3 },
    { id: 4,  name: '잎사귀 라인',   desc: '얇은 선의 잎 아이콘 + 가는 워드마크. 자연 친화적, 미니멀.', svg: l4 },
    { id: 5,  name: '30각 격자',     desc: '30×30 각재 단면을 3×3 격자로 표현. 주력 제품 규격을 강조.', svg: l5 },
    { id: 6,  name: '워드마크 단독', desc: '명조 워드마크 + 우드 슬랫 밑줄. 아이콘 없이 이름만 강조.', svg: l6 },
    { id: 7,  name: '집과 슬랫',     desc: '집 실루엣 안 슬랫. 제작과 현장 시공을 함께 알립니다.', svg: l7 },
    { id: 8,  name: '원형 그라데이션', desc: '크림색 원 안에 나무색 그라데이션 슬랫. 부드럽고 따뜻한 느낌.', svg: l8 },
    { id: 9,  name: 'N 모노그램',    desc: '각재 두 개와 사선으로 만든 N. 모던·건축적.', svg: l9 },
    { id: 10, name: '스탬프 배지',   desc: '원형 배지 안 木과 둘레 영문. 라벨·도장·포장에 적합.', svg: l10 },
  ];
})();
