"""Pick one training image per art form and save a clean copy as
frontend/images/<id>.jpg for use as the card cover photo."""
import os
from PIL import Image

IDS = ["madhubani", "warli", "kalamkari", "pattachitra", "gond",
       "tanjore", "kerala-mural", "mandana"]

os.makedirs("frontend/images", exist_ok=True)

for art_id in IDS:
    folder = os.path.join("dataset", art_id)
    if not os.path.isdir(folder):
        print(f"skip {art_id}: no dataset folder")
        continue
    files = sorted(os.listdir(folder))
    if not files:
        print(f"skip {art_id}: folder empty")
        continue
    src = os.path.join(folder, files[0])
    try:
        img = Image.open(src).convert("RGB")
        img.save(os.path.join("frontend", "images", art_id + ".jpg"), "JPEG", quality=85)
        print(f"{art_id}: used {files[0]}")
    except Exception as e:
        print(f"skip {art_id}: could not read {files[0]} ({e})")