import re


CLASS_NAME_PATTERN = re.compile(
    r"(?P<crop>[a-z0-9]+(?:_[a-z0-9]+)*)__(?P<ripeness>ripe|unripe)$"
)
SOURCE_LABEL_NAMES = ("Raw_Banana", "Raw_Mango", "Ripe_Banana", "Ripe_Mango")
SOURCE_LABEL_TO_CLASS = {
    "Raw_Banana": "banana__unripe",
    "Raw_Mango": "mango__unripe",
    "Ripe_Banana": "banana__ripe",
    "Ripe_Mango": "mango__ripe",
}


def map_source_label(label: int | str) -> str:
    if isinstance(label, int) and not isinstance(label, bool):
        if label < 0 or label >= len(SOURCE_LABEL_NAMES):
            raise ValueError(f"Unexpected numeric dataset label: {label}")
        source_label = SOURCE_LABEL_NAMES[label]
    elif isinstance(label, str):
        source_label = label
    else:
        raise ValueError(f"Unexpected dataset label type: {type(label).__name__}")

    try:
        return SOURCE_LABEL_TO_CLASS[source_label]
    except KeyError as error:
        raise ValueError(f"Unexpected dataset label: {source_label!r}") from error


def parse_class_name(class_name: str) -> tuple[str, str]:
    match = CLASS_NAME_PATTERN.fullmatch(class_name)
    if match is None:
        raise ValueError(
            f"Invalid class folder '{class_name}'. Use a crop slug followed by "
            "'__ripe' or '__unripe', for example 'bell_pepper__ripe'."
        )
    return match.group("crop"), match.group("ripeness")


def validate_class_names(class_names: list[str]) -> None:
    if len(class_names) < 2:
        raise ValueError("The dataset must contain at least two crop/ripeness classes.")

    crop_labels: dict[str, set[str]] = {}
    for class_name in class_names:
        crop, ripeness = parse_class_name(class_name)
        crop_labels.setdefault(crop, set()).add(ripeness)

    incomplete_crops = sorted(
        crop for crop, labels in crop_labels.items() if labels != {"ripe", "unripe"}
    )
    if incomplete_crops:
        raise ValueError(
            "Each crop must have both ripe and unripe class folders. Missing a "
            f"label for: {', '.join(incomplete_crops)}."
        )
