"""Train the classifier. Reads classes from model/labels.json and images
from dataset/<class_id>/. Saves model/heritage_model.keras when done."""
import json, os
import tensorflow as tf

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "dataset")
labels = json.load(open(os.path.join(HERE, "labels.json")))

# Load images; 80% for training, 20% held back to check accuracy
common = dict(image_size=(224, 224), batch_size=16, class_names=labels,
              validation_split=0.2, seed=42)
train = tf.keras.utils.image_dataset_from_directory(DATA, subset="training", **common)
val = tf.keras.utils.image_dataset_from_directory(DATA, subset="validation", **common)

# Start from MobileNetV2, already trained on millions of everyday images
base = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3), include_top=False, weights="imagenet")
base.trainable = False  # keep its learned features; only train our new top layer

model = tf.keras.Sequential([
    tf.keras.layers.Rescaling(1 / 127.5, offset=-1),
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.1),
    base,
    tf.keras.layers.GlobalAveragePooling2D(),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(len(labels), activation="softmax"),
])

model.compile(optimizer="adam",
              loss="sparse_categorical_crossentropy",
              metrics=["accuracy"])

model.fit(train, validation_data=val, epochs=10)

model.save(os.path.join(HERE, "heritage_model.keras"))
print("Saved model/heritage_model.keras")