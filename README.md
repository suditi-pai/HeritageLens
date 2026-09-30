# HeritageLens

An AI-powered web app that identifies traditional Indian art forms from an
uploaded image, and lets users explore India's historical dynasties and
temples through an interactive timeline.

## Features

**AI Art Recognition**
- Upload a photo of a traditional Indian artwork
- A trained CNN (MobileNetV2, transfer learning) identifies the likely art form
- Shows confidence score, alternate guesses, and full cultural information
- Recognizes when an uploaded photo is not a traditional art form at all,
  rather than forcing a wrong guess
- Warns the user when the model's confidence is low

**Explore Heritage**
- Gallery of all 10 traditional Indian art forms with real photos
- Search and filter by region and technique

**Dynasties & Heritage**
- Interactive timeline of 8 major Indian dynasties
- Dedicated dynasty and temple detail pages with hero photography
- Legends clearly separated from documented historical fact
- Sources cited for each temple
- Smart search across dynasty, temple, ruler, state and art form

**Learn & Discover / About**
- Educational cards and a disclaimer on AI prediction accuracy

## Tech stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Python, Flask (REST API)
- AI: TensorFlow/Keras, MobileNetV2 (transfer learning + fine-tuning), CNN image classification
- Data: JSON knowledge base (`data/art_forms.json`, `data/dynasties.json`, `data/temples.json`)

## Run it
python -m venv venv
venv\Scripts\Activate.ps1 # Windows PowerShell
pip install flask pillow numpy tensorflow
python backend/app.py

Open http://127.0.0.1:5000

## What the AI recognizes
The trained model classifies 9 classes: 8 real art forms
(Gond, Kalamkari, Kerala Mural, Madhubani, Mandana, Pattachitra, Tanjore, Warli)
plus a 9th "other" class for photos that aren't a traditional art form at all.

Two art forms (Phad, Cheriyal) are documented on Explore Heritage but not yet
supported by the recognizer, since no training images were available for them.

## Accuracy
~78% validation accuracy across the 9 trained classes. Varies by class based
on how much training data each had (see `model/train.py` output for details).

## Retraining / adding more classes
1. Add images to `dataset/<class_id>/` (one folder per class, images only —
   this folder is not included in the repo; see `.gitignore`)
2. Update `model/labels.json` to include the new class id
3. Run `python model/train.py`
4. Restart the server

`download_commons.py` can pull images from a Wikimedia Commons category:
python download_commons.py "Category Name" folder_name

Always manually review downloaded images before training — Commons
categories often include unrelated photos that need to be removed.

## Project structure
frontend/ UI (HTML/CSS/JS), including images/ for photos
backend/ Flask API (app.py)
model/ predictor.py, train.py, labels.json, trained model file
data/ art_forms.json, dynasties.json, temples.json
dataset/ training images (not tracked in git — see .gitignore)


## Notes on scope
- No interactive map (would require a paid API key)
- The "AI assistant" is a smart search bar (dynasty/temple/ruler/state/art
  form matching), not a conversational chat interface