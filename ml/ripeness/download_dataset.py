import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
import time

import requests
from PIL import Image, UnidentifiedImageError

from common import map_source_label


DATASET_ID = "darthraider/fruit-ripeness-detection-dataset"
ROWS_API = "https://datasets-server.huggingface.co/rows"
PAGE_SIZE = 100
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def fetch_rows(split: str, offset: int) -> dict:
    for attempt in range(5):
        try:
            response = requests.get(
                ROWS_API,
                params={
                    "dataset": DATASET_ID,
                    "config": "default",
                    "split": split,
                    "offset": offset,
                    "length": PAGE_SIZE,
                },
                timeout=60,
            )
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError):
            if attempt == 4:
                raise
            time.sleep(2**attempt)
    raise RuntimeError("Unable to retrieve dataset rows.")


def download_image(url: str, image_path: Path) -> None:
    for attempt in range(5):
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            if len(response.content) > MAX_IMAGE_BYTES:
                raise ValueError(f"Dataset image exceeds the 10 MB limit: {image_path}")
            try:
                with Image.open(BytesIO(response.content)) as image:
                    image.convert("RGB").save(image_path, format="JPEG", quality=95)
            except (UnidentifiedImageError, OSError) as error:
                raise ValueError(f"Dataset returned an invalid image for {image_path}") from error
            return
        except requests.RequestException:
            if attempt == 4:
                raise
            time.sleep(2**attempt)
    raise RuntimeError(f"Unable to download dataset image: {image_path}")


def download_split(split: str, output_dir: Path, overwrite: bool) -> int:
    split_dir = output_dir / split
    if split_dir.exists():
        existing_images = list(split_dir.glob("*/*"))
        if existing_images and not overwrite:
            raise FileExistsError(
                f"{split_dir} already contains files. Use --overwrite to replace them."
            )
        if overwrite:
            for class_dir in split_dir.iterdir():
                if class_dir.is_dir():
                    for image_path in class_dir.iterdir():
                        if image_path.is_file():
                            image_path.unlink()

    split_dir.mkdir(parents=True, exist_ok=True)
    first_page = fetch_rows(split, 0)
    total_rows = first_page["num_rows_total"]
    saved = 0
    pending_downloads = []

    with ThreadPoolExecutor(max_workers=8) as executor:
        for offset in range(0, total_rows, PAGE_SIZE):
            page = first_page if offset == 0 else fetch_rows(split, offset)
            for row_entry in page["rows"]:
                row = row_entry["row"]
                class_dir = split_dir / map_source_label(row["label"])
                class_dir.mkdir(parents=True, exist_ok=True)
                image_path = class_dir / f"{split}_{row_entry['row_idx']:05d}.jpg"
                if image_path.is_file():
                    saved += 1
                    continue

                pending_downloads.append(
                    executor.submit(download_image, row["image"]["src"], image_path)
                )

            for future in as_completed(pending_downloads):
                future.result()
                saved += 1
                if saved % PAGE_SIZE == 0 or saved == total_rows:
                    print(f"{split}: downloaded {saved}/{total_rows} images")
            pending_downloads = []

    print(f"Saved {saved} {split} images to {split_dir}")
    return saved


def main() -> None:
    parser = argparse.ArgumentParser(
        description=f"Download and arrange {DATASET_ID} for the ripeness trainer."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "dataset",
        help="Destination directory (default: ml/ripeness/dataset).",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace image files in existing train and test split folders.",
    )
    args = parser.parse_args()

    train_count = download_split("train", args.output, args.overwrite)
    test_count = download_split("test", args.output, args.overwrite)
    print(f"Dataset ready: {train_count} train images and {test_count} held-out test images.")


if __name__ == "__main__":
    main()
