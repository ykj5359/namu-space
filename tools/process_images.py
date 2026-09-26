# -*- coding: utf-8 -*-
"""원본 사진(이미지/) → 웹용 이미지(site/img/) 변환
사용:  python tools/process_images.py resize    # 리사이즈·워터마크 제거·참조용 축소본
       python tools/process_images.py cutout    # 제품 사진 누끼(rembg) → PNG
"""
import os, sys, json
from PIL import Image, ImageOps
import numpy as np
Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "이미지")
IMG = os.path.join(ROOT, "site", "img")
REF = os.path.join(ROOT, "tools", "ref")

def load(name):
    return ImageOps.exif_transpose(Image.open(os.path.join(SRC, name + ".jpg"))).convert("RGB")

def save_jpg(im, path, maxside=1600, q=82):
    im = im.copy(); im.thumbnail((maxside, maxside), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    return im.size

# ---- 분류 ----
SITE_PHOTOS = ["1790414471577", "1790414471619", "1790414471689", "1790414513484",
               "1790414513590", "1790414513662", "1790414513743", "1790414513812"]
# 누끼 대상: (파일, 출력이름, 설명)
CUTOUT = [
    ("20260926_133742", "slim_v_natural",   "슬림형 세로 패널 (무도장)"),
    ("20260926_133900", "slim_v_natural2",  "슬림형 세로 패널 (무도장) 2"),
    ("20260926_134423", "slim_v_oil",       "슬림형 세로 패널 (오일 도장)"),
    ("20260926_134428", "slim_v_oil2",      "슬림형 세로 패널 (오일 도장) 2"),
    ("20260926_140456", "wide_board",       "와이드 평살 보드"),
    ("20260926_140519", "wide_board2",      "와이드 평살 보드 2"),
    ("20260926_140534", "wide_v_long",      "와이드 평살 세로 롱 패널"),
    ("20260926_143419", "sq30_v_long",      "30각 세로 롱 패널 (무도장)"),
    ("20260926_143554", "sq30_h_long",      "30각 가로 롱 패널 (무도장)"),
    ("20260926_143618", "sq30_h_long2",     "30각 가로 롱 패널 (무도장) 2"),
    ("20260926_145327", "sq30_v_stain",     "30각 세로 롱 패널 (스테인)"),
    ("20260926_145411", "sq30_h_stain",     "30각 가로 롱 패널 (스테인)"),
    ("20260926_145547", "sq30_h_stain2",    "30각 가로 롱 패널 (스테인) 2"),
]
DETAIL = {  # 클로즈업·질감·상세 (crop 없이 리사이즈)
    "20260926_133829": "slim_tex1", "20260926_133837": "slim_tex2", "20260926_134438": "slim_oil_tex1",
    "20260926_134446": "slim_oil_tex2", "20260926_140619": "wide_tex1", "20260926_140628": "wide_tex2",
    "20260926_140659": "wide_section", "20260926_143433": "sq30_side1", "20260926_143454": "sq30_side2",
    "20260926_143500": "sq30_side3", "20260926_143508": "sq30_top", "20260926_145337": "sq30_stain_side1",
    "20260926_145345": "sq30_stain_side2", "20260926_145439": "sq30_stain_tex1", "20260926_145445": "sq30_stain_tex2",
    "20260926_145524": "sq30_stain_side3", "20260926_145537": "sq30_stain_side4", "20260926_145558": "sq30_stain_tex3",
    "20260926_145611": "sq30_stain_tex4", "20260926_145729": "factory_stack1", "20260926_145735": "factory_stack2",
    "20260926_145739": "factory_stack3", "20260926_145752": "factory_angle1", "20260926_145801": "factory_angle2",
    "20260926_145806": "factory_angle3", "20260926_145812": "factory_dark1", "20260926_145822": "factory_edge",
    "20260926_145843": "factory_wide1", "20260926_145846": "factory_wide2",
    "20260926_151640": "corner_finish1", "20260926_151644": "corner_finish2", "20260926_151650": "corner_finish3",
    "20260926_151657": "corner_finish4", "20260926_154542": "corner_joint1", "20260926_154552": "corner_joint2",
    "20260926_154555": "corner_joint3", "20260926_154558": "corner_joint4", "20260926_154601": "corner_joint5",
    "20260926_154605": "corner_joint6",
}

def remove_watermark(im):
    """좌하단 'Galaxy S23+' 워터마크 영역 인페인팅"""
    import cv2
    a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    h, w = a.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    mask[int(h*0.905):int(h*0.965), int(w*0.03):int(w*0.26)] = 255
    out = cv2.inpaint(a, mask, 9, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))

def do_resize():
    meta = {"site": [], "detail": {}, "cutout": []}
    for i, n in enumerate(SITE_PHOTOS):
        im = load(n); im.thumbnail((2000, 2000), Image.LANCZOS)
        im = remove_watermark(im)
        p = os.path.join(IMG, "site", f"site{i+1:02d}.jpg")
        print("site", n, save_jpg(im, p))
        meta["site"].append(f"site{i+1:02d}.jpg")
    for n, out in DETAIL.items():
        im = load(n)
        p = os.path.join(IMG, "detail", out + ".jpg")
        print("detail", n, save_jpg(im, p, 1600))
        meta["detail"][out] = n
    # 제미나이 참조용 축소본 (누끼 전 원본)
    os.makedirs(REF, exist_ok=True)
    for n, out, _ in CUTOUT + [("20260926_143500", "sq30_side3", ""), ("20260926_145729", "factory_stack1", ""), ("20260926_154552", "corner_joint2", ""), ("20260926_140659", "wide_section", "")]:
        save_jpg(load(n), os.path.join(REF, out + ".jpg"), 1024, 85)
    json.dump(meta, open(os.path.join(IMG, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

def do_cutout():
    from rembg import remove, new_session
    sess = new_session("isnet-general-use")
    for n, out, desc in CUTOUT:
        p = os.path.join(IMG, "product", out + ".png")
        if os.path.exists(p): print("skip", out); continue
        im = load(n); im.thumbnail((1400, 1400), Image.LANCZOS)
        cut = remove(im, session=sess, alpha_matting=True, alpha_matting_foreground_threshold=240,
                     alpha_matting_background_threshold=10, alpha_matting_erode_size=10)
        # 투명 여백 잘라내기
        bbox = cut.getbbox()
        if bbox: cut = cut.crop(bbox)
        cut.save(p, "PNG", optimize=True)
        print("cutout", out, cut.size, desc)

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "resize"
    {"resize": do_resize, "cutout": do_cutout}[mode]()
