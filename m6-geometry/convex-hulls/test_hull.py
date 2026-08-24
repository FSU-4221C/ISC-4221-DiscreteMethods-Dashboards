"""Tests for the monotone-chain hull."""

from __future__ import annotations

import unittest

from hull_model import default_state, hull_query
from practice_model import score_practice


class HullTests(unittest.TestCase):
    def test_sample_has_four_hull_vertices_and_two_interior(self) -> None:
        query = hull_query(default_state())
        self.assertEqual(query["n"], 6)
        self.assertEqual(query["h"], 4)
        self.assertEqual(query["interior_count"], 2)

    def test_triangle_has_empty_interior(self) -> None:
        state = {"points": [{"x": 0.1, "y": 0.1}, {"x": 0.9, "y": 0.1}, {"x": 0.5, "y": 0.9}]}
        query = hull_query(state)
        self.assertEqual(query["h"], 3)
        self.assertEqual(query["interior_count"], 0)


class PracticeTests(unittest.TestCase):
    def test_sample_scores_all_four(self) -> None:
        result = score_practice("convex", "interior", 4, 2, default_state())
        self.assertEqual(result["correct_count"], 4)


if __name__ == "__main__":
    unittest.main()
