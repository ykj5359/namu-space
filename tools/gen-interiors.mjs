// 제미나이 실내 연출 이미지 생성 (실제 제품 사진을 참조 이미지로 첨부)
// 사용: node tools/gen-interiors.mjs [키 ...]   (인자 없으면 전체, 이미 있으면 건너뜀)  FORCE=1 로 재생성
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const KEY = env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY 없음'); process.exit(1); }
const OUT = path.join(root, 'site', 'img', 'interior');
const REF = path.join(root, 'tools', 'ref');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'Photorealistic interior architecture photograph, editorial magazine quality, natural daylight mixed with warm accent lighting, realistic materials, no people, no text, no watermark, no logo, full-frame camera 24mm lens, soft shadows. IMPORTANT: The attached photo shows the real wooden slat wall panel product (Korean tembaboard: solid lauan wood battens glued onto a plywood backing). Reproduce this exact product faithfully - same batten proportions, same spacing rhythm, same wood color and grain - as the wall cladding described below. Do not change the product into a different slat design.';

const S = {
  sq30:    { ref: 'sq30_side3.jpg',     d: 'square 30x30mm lauan battens with 30mm gaps, natural unfinished wood' },
  sq30st:  { ref: 'sq30_v_stain.jpg',   d: 'square 30x30mm lauan battens with 30mm gaps, oil-stained warm brown finish' },
  slim:    { ref: 'slim_v_natural.jpg', d: 'slim narrow lauan battens tightly spaced, natural light wood' },
  slimoil: { ref: 'slim_v_oil.jpg',     d: 'slim narrow lauan battens tightly spaced, oiled honey-brown finish' },
  wide:    { ref: 'wide_board.jpg',     d: 'wide flat lauan slats with narrow gaps, natural light wood' },
  corner:  { ref: 'corner_joint2.jpg',  d: 'square 30x30mm lauan battens wrapping around an outside corner' },
  vsite:   { ref: ['site01.jpg', 'sq30_side3.jpg'], d: 'VERTICAL square 30x30mm lauan battens with 30mm gaps on plywood, natural unfinished wood, installed exactly as in the first attached real construction-site photo (vertical battens wrapping columns and walls, white ceiling with black track lights); the second photo shows the batten close-up' },
  vsite2:  { ref: ['site02.jpg', 'sq30_side3.jpg'], d: 'VERTICAL square 30x30mm lauan battens with 30mm gaps on plywood, natural wood, installed as in the first attached real site photo (vertical battens on the walls beside a glass entrance door); the second photo shows the batten close-up' },
  vcol:    { ref: ['site06.jpg', 'corner_joint2.jpg'], d: 'VERTICAL square 30x30mm lauan battens wrapping a column on all sides with clean corner joints, as in the attached real site photos' },
};

const IMAGES = {
  hero:            { ar: '16:9', s: 'sq30',    p: 'Wide shot of a modern Korean living room. The entire TV feature wall is clad floor-to-ceiling with the vertical wooden batten panel. Low grey sofa, oak floor, large window on the left, linear indirect ceiling light washing down the slats.' },
  cafe_counter:    { ar: '4:3',  s: 'sq30',    p: 'Specialty coffee shop interior. The wall behind the espresso bar counter is clad with the vertical wooden batten panel, with a floating shelf and small pendant lights in front of it. Terrazzo counter, black stools, concrete floor.' },
  living_tv:       { ar: '4:3',  s: 'slim',    p: 'Apartment living room. The TV wall is clad with the slim vertical batten panel, a wall-mounted TV centered on it, a low white console below, soft afternoon light from the balcony window.' },
  bedroom_head:    { ar: '4:3',  s: 'wide',    p: 'Calm bedroom. The headboard wall is clad with the wooden slat panel installed horizontally behind a low platform bed with linen bedding, two wall-mounted reading lamps, beige curtains.' },
  office_lobby:    { ar: '4:3',  s: 'sq30st',  p: 'Corporate office lobby reception. The wall behind the reception desk is clad with the vertical stained wooden batten panel, backlit at the top and bottom, white stone desk, large-format grey floor tiles.' },
  column_wrap:     { ar: '4:3',  s: 'sq30',    p: 'Retail store interior with a structural column wrapped on all four sides with the vertical wooden batten panel, white ceiling with track lights, glass storefront visible behind, polished concrete floor.' },
  ceiling:         { ar: '4:3',  s: 'sq30',    p: 'Restaurant dining room. The ceiling is finished with the wooden batten panel installed as a slatted ceiling with recessed downlights between slats, oak tables, white walls, warm evening lighting.' },
  entrance:        { ar: '4:3',  s: 'slimoil', p: 'Apartment entrance hall. One side wall is clad with the slim oiled batten panel, a built-in bench and a tall mirror beside it, stone floor tiles, ceiling downlights.' },
  stairs:          { ar: '4:3',  s: 'sq30',    p: 'Staircase of a two-story house. The tall wall along the stairs is clad with the vertical wooden batten panel from floor to the upper ceiling, oak stair treads, thin black railing, skylight above.' },
  partition:       { ar: '4:3',  s: 'sq30',    p: 'Open-plan living and dining space divided by a free-standing double-sided partition wall clad with the wooden batten panel, light passing between the battens, dining table on one side and sofa on the other.' },
  restaurant_wall: { ar: '4:3',  s: 'sq30st',  p: 'Korean restaurant private dining room. The long back wall is clad with the horizontal stained wooden batten panel, with wall sconces casting raking light across the slats, dark wood table, minimal styling.' },
  corner_detail:   { ar: '4:3',  s: 'corner',  p: 'Close-up interior detail of a wall corner where the wooden batten panel wraps continuously around the outside corner, showing the neat corner joint of the square battens, soft window light, white ceiling above.' },
  hallway:         { ar: '4:3',  s: 'wide',    p: 'Long hotel corridor. One wall is clad with the horizontal wooden slat panel, continuous linear light at the base, carpet floor, doors with brass numbers, calm and warm.' },
  showroom:        { ar: '4:3',  s: 'sq30st',  p: 'Furniture showroom feature wall clad with the stained wooden batten panel, a walnut sideboard in front, a large abstract artwork hung on the slats, spotlights.' },
  // ---- 세로 배열 · 상가/약국/병원 (현장 사진 참조) ----
  v_pharmacy:      { ar: '4:3',  s: 'vsite',   p: 'Finished modern Korean pharmacy interior. The wall behind the white prescription counter and the square column beside it are fully clad with the vertical wooden batten panel, white shelving with neatly arranged medicine boxes on the side walls, bright white ceiling with track lights, grey tile floor, glass storefront with daylight.' },
  v_store_column:  { ar: '4:3',  s: 'vcol',    p: 'Finished retail clothing store. Two structural columns in the middle of the sales floor are wrapped on all four sides with the vertical wooden batten panel, clothing racks and a white display table around them, polished concrete floor, track lighting, glass storefront behind.' },
  v_clinic:        { ar: '4:3',  s: 'vsite2',  p: 'Finished dental clinic reception and waiting area. The wall behind the reception desk and the wall beside the glass entrance door are clad with the vertical wooden batten panel from floor to ceiling, light grey waiting chairs, white ceiling, warm downlights.' },
  v_bank:          { ar: '4:3',  s: 'vsite',   p: 'Finished bank branch lobby. A long feature wall behind the teller counters and a square column are clad with the vertical wooden batten panel, white counters, grey large-format floor tiles, linear ceiling lights, calm and professional.' },
  v_cafe_pillar:   { ar: '4:3',  s: 'vcol',    p: 'Finished coffee shop with a central square pillar wrapped in the vertical wooden batten panel, small round tables and chairs around it, pendant lights, big windows with street view, warm evening light.' },
  v_restaurant:    { ar: '4:3',  s: 'vsite',   p: 'Finished Korean restaurant interior. The long side wall and the kitchen pass-through column are clad with the vertical wooden batten panel, wooden tables in rows, white ceiling with black track lights, tile floor, daylight from the storefront.' },
  v_office_wall:   { ar: '4:3',  s: 'vsite2',  p: 'Finished small office entrance. The wall beside the glass door and the partition wall behind it are clad with the vertical wooden batten panel, a company sign area left blank, white ceiling, grey carpet tiles, daylight.' },
  v_shop_front:    { ar: '16:9', s: 'vsite',   p: 'Wide interior view of a finished corner shop seen from the entrance: the columns and the back wall are clad with the vertical wooden batten panel, white ceiling with track lights, glass walls on two sides showing the street, clean and bright, ready for opening.' },
  v_hair_salon:    { ar: '4:3',  s: 'vcol',    p: 'Finished hair salon. Mirror stations along one wall, and the square column in the middle of the room wrapped in the vertical wooden batten panel, black styling chairs, white ceiling, warm accent lighting.' },
  v_apartment_col: { ar: '4:3',  s: 'vcol',    p: 'Apartment living room where a structural column next to the balcony window is wrapped in the vertical wooden batten panel, beige sofa, oak floor, white walls, soft daylight.' },
};

async function gen(prompt, refFile, ar) {
  const refs = Array.isArray(refFile) ? refFile : [refFile];
  const parts = refs.map(f => ({ inlineData: { mimeType: 'image/jpeg', data: fs.readFileSync(path.join(REF, f)).toString('base64') } }));
  parts.push({ text: prompt });
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + KEY, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ar } } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(r.status + ': ' + JSON.stringify(j).slice(0, 300));
  const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error('이미지 없음 ' + JSON.stringify(j).slice(0, 300));
  return { buf: Buffer.from(part.inlineData.data, 'base64'), mime: part.inlineData.mimeType };
}

const args = process.argv.slice(2);
const keys = args.length ? args : Object.keys(IMAGES);
for (const k of keys) {
  const spec = IMAGES[k]; if (!spec) { console.log('알 수 없는 키', k); continue; }
  const exists = ['jpg', 'png'].some(e => fs.existsSync(path.join(OUT, k + '.' + e)));
  if (exists && !process.env.FORCE) { console.log('skip', k); continue; }
  const st = S[spec.s];
  const prompt = BASE + ' Product in the photo: ' + st.d + '. Scene: ' + spec.p;
  let done = false;
  for (let t = 0; t < 3 && !done; t++) {
    try {
      const { buf, mime } = await gen(prompt, st.ref, spec.ar);
      const ext = mime.includes('png') ? 'png' : 'jpg';
      fs.writeFileSync(path.join(OUT, k + '.' + ext), buf);
      console.log('ok', k, (buf.length / 1024).toFixed(0) + 'KB', ext);
      done = true;
    } catch (e) { console.log('fail', k, e.message); await new Promise(r => setTimeout(r, 3000)); }
  }
}
