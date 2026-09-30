import tensorflow as tf

m = tf.keras.models.load_model("model/heritage_model.keras")
tflite = tf.lite.TFLiteConverter.from_keras_model(m).convert()
open("model/heritage_model.tflite", "wb").write(tflite)
print("Saved, size in MB:", round(len(tflite) / 1024 / 1024, 2))