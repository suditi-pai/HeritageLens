import json, os, sys
from flask import Flask, jsonify, request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)
from model.predictor import predict, _model

app = Flask(__name__, static_folder=os.path.join(ROOT, "frontend"), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB limit

ARTS = json.load(open(os.path.join(ROOT, "data", "art_forms.json"), encoding="utf-8"))
BY_ID = {a["id"]: a for a in ARTS}
ALLOWED = {"jpg", "jpeg", "png"}


@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.get("/api/arts")
def arts():
    return jsonify(ARTS)

DYNASTIES = json.load(open(os.path.join(ROOT, "data", "dynasties.json"), encoding="utf-8"))
TEMPLES = json.load(open(os.path.join(ROOT, "data", "temples.json"), encoding="utf-8"))

@app.get("/api/dynasties")
def dynasties():
    return jsonify(DYNASTIES)

@app.get("/api/temples")
def temples():
    return jsonify(TEMPLES)


@app.get("/api/status")
def status():
    return jsonify({"mode": "real" if _model else "demo"})


@app.post("/api/predict")
def do_predict():
    f = request.files.get("image")
    if not f or not f.filename:
        return jsonify(error="Choose an image to upload."), 400
    if f.filename.rsplit(".", 1)[-1].lower() not in ALLOWED:
        return jsonify(error="Unsupported file. Upload a JPG, JPEG or PNG."), 400
    try:
        res = predict(f.read())
    except Exception:
        return jsonify(error="This file could not be read as an image."), 400
    top_id = res["top"][0]["id"]
    res["art"] = BY_ID.get(top_id)  # None when the top guess is "other" (not a real art form)
    return jsonify(res)


@app.errorhandler(413)
def too_big(_):
    return jsonify(error="Image is over 5 MB. Upload a smaller file."), 413


if __name__ == "__main__":
    app.run(debug=True)