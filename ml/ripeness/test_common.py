import unittest

from common import map_source_label, parse_class_name, validate_class_names


class ClassNameTests(unittest.TestCase):
    def test_parse_crop_and_ripeness(self) -> None:
        self.assertEqual(parse_class_name("bell_pepper__unripe"), ("bell_pepper", "unripe"))

    def test_reject_malformed_class_name(self) -> None:
        with self.assertRaises(ValueError):
            parse_class_name("tomato-ripe")

    def test_require_both_ripeness_labels_for_every_crop(self) -> None:
        with self.assertRaisesRegex(ValueError, "tomato"):
            validate_class_names(["tomato__ripe", "pepper__ripe", "pepper__unripe"])

    def test_accept_multiple_complete_crops(self) -> None:
        validate_class_names(
            ["tomato__ripe", "tomato__unripe", "bell_pepper__ripe", "bell_pepper__unripe"]
        )

    def test_map_public_dataset_label_ids(self) -> None:
        self.assertEqual(map_source_label(0), "banana__unripe")
        self.assertEqual(map_source_label(1), "mango__unripe")
        self.assertEqual(map_source_label(2), "banana__ripe")
        self.assertEqual(map_source_label(3), "mango__ripe")
        self.assertEqual(map_source_label("Ripe_Mango"), "mango__ripe")

    def test_reject_unknown_public_dataset_label(self) -> None:
        with self.assertRaises(ValueError):
            map_source_label(4)
        with self.assertRaises(ValueError):
            map_source_label("Damaged")


if __name__ == "__main__":
    unittest.main()
