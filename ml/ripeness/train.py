import argparse
import json
import sys
from pathlib import Path

import tensorflow as tf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import validate_class_names


IMAGE_SIZE = (224, 224)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}
AUTOTUNE = tf.data.AUTOTUNE


def load_datasets(
    dataset_dir: Path, batch_size: int, validation_split: float, seed: int
) -> tuple[tf.data.Dataset, tf.data.Dataset, list[str]]:
    if not dataset_dir.is_dir():
        raise FileNotFoundError(
            f"Dataset folder not found: {dataset_dir}. See ml/ripeness/README.md."
        )

    class_dirs = sorted(path for path in dataset_dir.iterdir() if path.is_dir())
    class_names = [path.name for path in class_dirs]
    validate_class_names(class_names)

    for class_dir in class_dirs:
        image_count = sum(
            1
            for path in class_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        )
        if image_count < 5:
            raise ValueError(
                f"Class '{class_dir.name}' has {image_count} images; at least 5 are "
                "needed for a train/validation split. More varied, correctly labeled "
                "images are strongly recommended for useful model quality."
            )

    train_dataset, validation_dataset = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        labels="inferred",
        label_mode="int",
        class_names=class_names,
        image_size=IMAGE_SIZE,
        batch_size=batch_size,
        validation_split=validation_split,
        subset="both",
        seed=seed,
        shuffle=True,
    )
    return (
        train_dataset.prefetch(AUTOTUNE),
        validation_dataset.prefetch(AUTOTUNE),
        class_names,
    )


def load_test_dataset(
    dataset_dir: Path, batch_size: int, class_names: list[str]
) -> tf.data.Dataset:
    if not dataset_dir.is_dir():
        raise FileNotFoundError(f"Test dataset folder not found: {dataset_dir}")

    test_class_names = sorted(path.name for path in dataset_dir.iterdir() if path.is_dir())
    if test_class_names != class_names:
        raise ValueError(
            "Train and test datasets must contain exactly the same crop/ripeness classes."
        )

    test_dataset = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        labels="inferred",
        label_mode="int",
        class_names=class_names,
        image_size=IMAGE_SIZE,
        batch_size=batch_size,
        shuffle=False,
    )
    return test_dataset.prefetch(AUTOTUNE)


def create_model(class_count: int) -> tuple[tf.keras.Model, tf.keras.Model]:
    inputs = tf.keras.Input(shape=(*IMAGE_SIZE, 3), name="image")
    augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.08),
            tf.keras.layers.RandomZoom(0.1),
        ],
        name="augmentation",
    )
    backbone = tf.keras.applications.EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMAGE_SIZE, 3),
    )
    backbone.trainable = False

    features = backbone(augmentation(inputs), training=False)
    features = tf.keras.layers.GlobalAveragePooling2D()(features)
    features = tf.keras.layers.Dropout(0.25)(features)
    outputs = tf.keras.layers.Dense(class_count, activation="softmax", name="prediction")(features)
    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
            
    )
    return model, backbone


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train a crop and ripe/unripe image classifier."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path(__file__).parent / "dataset",
        help="Folder containing one <crop>__<ripe|unripe> folder per class.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent / "artifacts",
        help="Directory where the trained model and class labels are saved.",
    )
    parser.add_argument(
        "--test-dataset",
        type=Path,
        help="Optional independent test folder with the same class subfolders as --dataset.",
    )
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--fine-tune-epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--validation-split", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.epochs < 1 or args.fine_tune_epochs < 0 or args.batch_size < 1:
        parser.error("Epochs and batch size must be positive; fine-tune epochs cannot be negative.")
    if not 0.1 <= args.validation_split <= 0.5:
        parser.error("Validation split must be between 0.1 and 0.5.")

    tf.keras.utils.set_random_seed(args.seed)
    train_dataset, validation_dataset, class_names = load_datasets(
        args.dataset, args.batch_size, args.validation_split, args.seed
    )
    model, backbone = create_model(len(class_names))
    args.output.mkdir(parents=True, exist_ok=True)
    model_path = args.output / "ripeness.keras"
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            model_path,
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            mode="max",
            patience=3,
            restore_best_weights=True,
        ),
    ]

    model.fit(
        train_dataset,
        validation_data=validation_dataset,
        epochs=args.epochs,
        callbacks=callbacks,
    )

    if args.fine_tune_epochs:
        backbone.trainable = True
        for layer in backbone.layers[:-30]:
            layer.trainable = False
        for layer in backbone.layers:
            if isinstance(layer, tf.keras.layers.BatchNormalization):
                layer.trainable = False
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )
        model.fit(
            train_dataset,
            validation_data=validation_dataset,
            epochs=args.fine_tune_epochs,
            callbacks=callbacks,
        )

    model.save(model_path)
    if args.test_dataset:
        test_dataset = load_test_dataset(args.test_dataset, args.batch_size, class_names)
        test_loss, test_accuracy = model.evaluate(test_dataset, verbose=2)
        print(f"Independent test loss: {test_loss:.4f}")
        print(f"Independent test accuracy: {test_accuracy:.4f}")
    (args.output / "labels.json").write_text(
        json.dumps({"class_names": class_names}, indent=2),
        encoding="utf-8",
    )
    print(f"Model saved to {model_path}")
    print(f"Class labels saved to {args.output / 'labels.json'}")
    print("Validation metrics are estimates; assess the model on a separate field image set before relying on it.")


if __name__ == "__main__":
    main()
