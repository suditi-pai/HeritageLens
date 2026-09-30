"""Model layer. To use another model, change `predict` only.
Real mode : model/heritage_model.tflite exists (made by convert.py).
Demo mode : otherwise. Output is NOT real classification and returns mock=True."""
import json, hashlib, io, os
import numpy as np
from PIL import Image

try:  # small runtime used on Render
    from ai_edge_litert.interpreter import Interpreter
except ImportError:  # falls back to full TensorFlow on your laptop
    import tensorflow as tf
    Interpreter = tf.lite.Interpreter

HERE = os.path.dirname(__file__)
LABELS = json.load(open(os.path.join(HERE, "labels.json")))
MODEL_PATH = os.path.join(HERE, "heritage_model.tflite")

_model = None
if os.path.exists(MODEL_PATH):
    _model = Interpreter(model_path=MODEL_PATH, num_threads=1)
    _model.allocate_tensors()
    _in = _model.get_input_details()[0]["index"]
    _out = _model.get_output_details()[0]["index"]


def preprocess(raw):
    img = Image.open(io.BytesIO(raw)).convert("RGB").resize((224, 224))
    return np.expand_dims(np.asarray(img, dtype="float32"), 0)


def predict(raw):
    x = preprocess(raw)
    if _model is not None:
        _model.set_tensor(_in, x)
        _model.invoke()
        p = _model.get_tensor(_out)[0]
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