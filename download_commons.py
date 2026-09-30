"""Download images from a Wikimedia Commons category into dataset/<folder>.
Usage: python download_commons.py "Kalamkari" kalamkari"""
import os, sys, time
import requests

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "HeritageLensStudentProject/1.0 (educational project)"}


def get(url, **kw):
    """GET with retries. Waits longer each time if the server says slow down."""
    for attempt in range(5):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30, **kw)
            if r.status_code == 200:
                return r
            print(f"  server said {r.status_code}, waiting...")
        except requests.RequestException as e:
            print(f"  network problem ({type(e).__name__}), waiting...")
        time.sleep(5 * (attempt + 1))
    return None


def members(category, kind):
    """List file titles (or subcategory titles) inside a category."""
    out, cont = [], {}
    while True:
        r = get(API, params={
            "action": "query", "list": "categorymembers", "format": "json",
            "cmtitle": "Category:" + category, "cmtype": kind,
            "cmlimit": 500, **cont})
        if r is None:
            return out
        j = r.json()
        out += [m["title"] for m in j["query"]["categorymembers"]]
        if "continue" in j:
            cont = j["continue"]
        else:
            return out


def main(category, folder):
    files = members(category, "file")
    for sub in members(category, "subcat"):  # include one level of subcategories
        files += members(sub.replace("Category:", "", 1), "file")
    print(f"Found {len(files)} files. Downloading JPG/PNG only...")

    out_dir = os.path.join("dataset", folder)
    os.makedirs(out_dir, exist_ok=True)
    saved = 0
    for i, title in enumerate(files):
        path_base = os.path.join(out_dir, f"{folder}_{i:03d}")
        if os.path.exists(path_base + ".jpg") or os.path.exists(path_base + ".png"):
            saved += 1  # already downloaded on an earlier run
            continue
        r = get(API, params={
            "action": "query", "titles": title, "prop": "imageinfo",
            "iiprop": "url|mime", "iiurlwidth": 800, "format": "json"})
        if r is None:
            print(f"  skipped {title}")
            continue
        try:
            page = next(iter(r.json()["query"]["pages"].values()))
        except ValueError:
            print(f"  skipped {title}")
            continue
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime") not in ("image/jpeg", "image/png"):
            continue
        ext = ".png" if info["mime"] == "image/png" else ".jpg"
        img = get(info.get("thumburl") or info["url"])
        if img is None:
            print(f"  skipped {title}")
            continue
        with open(path_base + ext, "wb") as f:
            f.write(img.content)
        saved += 1
        print(f"  {saved} saved")
        time.sleep(2)
    print(f"Saved {saved} images to {out_dir}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])