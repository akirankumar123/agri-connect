# Fruit and vegetable ripeness model

This training pipeline uses TensorFlow/Keras transfer learning (EfficientNetB0) to predict **one crop and one ripe/unripe label per image**. It does not count multiple items in an image, control a harvesting cutter, or connect a camera to the rover. The dashboard presents predictions for farmer review; validate the model on local field images before using its advice.

## Download the existing dataset

This repo uses the public **Mango and Banana Dataset (Ripe Unripe)** mirrored on Hugging Face: [darthraider/fruit-ripeness-detection-dataset](https://huggingface.co/datasets/darthraider/fruit-ripeness-detection-dataset). It provides 3,999 train and 1,000 held-out test images, with four labels (`Raw_Banana`, `Raw_Mango`, `Ripe_Banana`, `Ripe_Mango`), under Apache-2.0. The upstream source is [Mendeley Data y3649cmgg6](https://data.mendeley.com/datasets/y3649cmgg6/3), licensed CC BY 4.0. This dataset covers only mangoes and bananas; it is not a general vegetable dataset.

After installing dependencies below, download/arrange the dataset from the public Hugging Face dataset viewer API:

```powershell
python ml/ripeness/download_dataset.py
```

The dataset files total about 390 MB before the viewer converts them to individual image files. The script keeps the source training and test splits separate, downloads images in parallel with retries, supports resuming an interrupted download, and maps labels into the trainer format:

```text
ml/ripeness/dataset/
  train/
    banana__ripe/
    banana__unripe/
    mango__ripe/
    mango__unripe/
  test/
    banana__ripe/
    banana__unripe/
    mango__ripe/
    mango__unripe/
```

You may instead provide your own labeled images using the same four (or additional matched crop/ripeness) class names. Each crop must have both ripe and unripe classes; each training class needs at least five images.

The downloaded images and trained weights are ignored by Git because they are large.

## Train

Use a Python version supported by the installed TensorFlow wheel, then install this service's dependencies:

```powershell
py -3.12 -m venv C:\rvml
C:\rvml\Scripts\Activate.ps1
python -m pip install -r ml/ripeness/requirements.txt
python ml/ripeness/download_dataset.py
python ml/ripeness/train.py --dataset ml/ripeness/dataset/train --test-dataset ml/ripeness/dataset/test
```

Use a short virtual-environment path on Windows: TensorFlow contains deeply nested headers and can exceed the Windows path-length limit when unpacked inside a deeply nested project directory.

Training uses the dataset's train split to create a deterministic 80/20 train/validation split and evaluates on the untouched test split. TensorFlow also downloads ImageNet EfficientNetB0 base weights on the first training run. The model and labels are written to:

```text
ml/ripeness/artifacts/ripeness.keras
ml/ripeness/artifacts/labels.json
```

Options include `--epochs`, `--fine-tune-epochs`, `--batch-size`, `--validation-split`, `--dataset`, `--test-dataset`, and `--output`. Results on this public dataset do not establish accuracy on a particular farm; collect and evaluate separate local field images before relying on predictions.

## Run the inference API

After training:

```powershell
python -m uvicorn ml.ripeness.api:app --host 127.0.0.1 --port 8000
```

The dashboard calls `GET /health` and uploads photos to `POST /predict`. If the model isn't trained or the API can't be reached, predictions remain unavailable and the dashboard reports that explicitly; farmer-confirmed records still work. Set `VITE_RIPENESS_API_URL` if the API is hosted at a different address. Set `RIPENESS_ALLOWED_ORIGINS` to a comma-separated list of trusted dashboard origins when deploying; the default only allows local development origins.
