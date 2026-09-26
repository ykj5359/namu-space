# -*- coding: utf-8 -*-
"""catalog/catalog.html → site/catalog.pdf (헤드리스 크롬) + 페이지 썸네일 site/img/catalog/pNN.jpg
사용: python tools/build_catalog.py [로고번호]"""
import os, sys, subprocess, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
logo = sys.argv[1] if len(sys.argv) > 1 else "1"
chrome = next(p for p in [r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"] if os.path.exists(p))
src = "file:///" + os.path.join(ROOT, "catalog", "catalog.html").replace("\\", "/") + "?logo=" + logo
pdf = os.path.join(ROOT, "site", "catalog.pdf")
cmd = [chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=15000",
       "--run-all-compositor-stages-before-draw", f"--print-to-pdf={pdf}", src]
print(" ".join(cmd)); subprocess.run(cmd, check=True, timeout=180)
print("PDF", os.path.getsize(pdf) // 1024, "KB")
try:
    import fitz
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pymupdf"], check=True); import fitz
doc = fitz.open(pdf); out = os.path.join(ROOT, "site", "img", "catalog"); os.makedirs(out, exist_ok=True)
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=60); pix.save(os.path.join(out, f"p{i+1:02d}.jpg"), jpg_quality=80)
print("pages", len(doc))
