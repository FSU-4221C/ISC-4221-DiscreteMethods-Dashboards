"""Tests for two-variable LP vertex enumeration."""

from __future__ import annotations

import unittest

from lp_model import default_state, lp_query
from practice_model import score_practice


class FurnitureTests(unittest.TestCase):
    def test_furniture_optimum_is_four_two(self) -> None:
        query = lp_query(default_state())
        self.assertEqual(query["title"], "Furniture factory")
        self.assertIsNotNone(query["best"])
        assert query["best"] is not None
        self.assertAlmostEqual(query["best"]["x"], 4.0, places=5)
        self.assertAlmostEqual(query["best"]["y"], 2.0, places=5)
        self.assertAlmostEqual(query["best"]["z"], 220.0, places=5)
        self.assertEqual(len(query["vertices"]), 4)


class PracticeTests(unittest.TestCase):
    def test_furniture_scores_all_four(self) -> None:
        result = score_practice("vertex", "halfplanes", 220, 4, default_state())
        self.assertEqual(result["correct_count"], 4)


if __name__ == "__main__":
    unittest.main()
