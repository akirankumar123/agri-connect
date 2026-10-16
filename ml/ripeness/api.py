import json
import os
import sys
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import parse_class_name, validate_class_names


IMAGE_SIZE = (224, 224)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MODEL_DIR = Path(os.environ.get("RIPENESS_MODEL_DIR", Path(__file__).parent / "artifacts"))
MODEL_PATH = MODEL_DIR / "ripeness.keras"
LABELS_PATH = MODEL_DIR / "labels.json"

app = FastAPI(title="Agri-Assist Ripeness Model API")
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "RIPENESS_ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

model: tf.keras.Model | None = None
class_names: list[str] = []
startup_error: str | None = None


@app.on_event("startup")
def load_model() -> None:
    global model, class_names, startup_error

    if not MODEL_PATH.is_file() or not LABELS_PATH.is_file():
        startup_error = "Trained model not found. Train it with: python ml/ripeness/train.py"
        return

    try:
        metadata: Any = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
        loaded_class_names = metadata.get("class_names")
        if not isinstance(loaded_class_names, list) or not all(
            isinstance(name, str) for name in loaded_class_names
        ):
            raise ValueError("labels.json must contain a string class_names list.")
        validate_class_names(loaded_class_names)

        loaded_model = tf.keras.models.load_model(MODEL_PATH)
        if loaded_model.output_shape[-1] != len(loaded_class_names):
            raise ValueError("Model output count does not match labels.json.")
        model = loaded_model
        class_names = loaded_class_names
        startup_error = None
    except (OSError, ValueError, json.JSONDecodeError) as error:
        startup_error = f"Unable to load the trained model: {error}"
        raise RuntimeError(startup_error) from error


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "model_loaded": model is not None,
        "model_error": startup_error,
        "classes": class_names,
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...)) -> dict[str, Any]:
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=startup_error or "The trained ripeness model is unavailable.",
        )

    content = await image.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB upload limit.")

    try:
        with Image.open(BytesIO(content)) as uploaded_image:
            rgb_image = uploaded_image.convert("RGB").resize(IMAGE_SIZE)
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="Upload a valid image file.") from error
    finally:
        await image.close()

    image_array = np.asarray(rgb_image, dtype=np.float32)
    probabilities = model.predict(np.expand_dims(image_array, axis=0), verbose=0)[0]
    class_index = int(np.argmax(probabilities))
    crop_slug, ripeness = parse_class_name(class_names[class_index])
    return {
        "crop": crop_slug,
        "ripeness": ripeness,
        "confidence": float(probabilities[class_index]),
    }
