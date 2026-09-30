"""Model layer. To use another model, change `predict` only.
Real mode : model/heritage_model.keras exists (see train.py).
Demo mode : otherwise. Output is NOT real classification and returns mock=True."""
import json, hashlib, io, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
LABELS = json.load(open(os.path.join(HERE, "labels.json")))
MODEL_PATH = os.path.join(HERE, "heritage_model.keras")

_model = None
if os.path.exists(MODEL_PATH):
    import tensorflow as tf
    _model = tf.keras.models.load_model(MODEL_PATH)


def preprocess(raw):
    img = Image.open(io.BytesIO(raw)).convert("RGB").resize((224, 224))
    return np.expand_dims(np.asarray(img, dtype="float32"), 0)


def predict(raw):
    x = preprocess(raw)
    if _model is not None:
        p = _model(x, training=False).numpy()[0]
        mock = False
    else:  # demo: deterministic per image, placeholder only
        seed = int(hashlib.sha256(raw).hexdigest(), 16) % (2**32)
        p = np.random.default_rng(seed).dirichlet(np.ones(len(LABELS)) * .4)
        mock = True
    top = np.argsort(p)[::-1][:3]
    return {
        "mock": mock,
        "top": [{"id": LABELS[i], "confidence": round(float(p[i]) * 100, 1)} for i in top],
    }