"""Tests for convolution and connected components."""

from __future__ import annotations

import unittest

from image_model import component_query, convolution_query, default_state
from practice_model import score_practice


class ConvolutionTests(unittest.TestCase):
    def test_identity_preserves_the_source_mean(self) -> None:
        query = convolution_query({"kernel": "identity", "connectivity": 4})
        self.assertAlmostEqual(query["source_mean"], query["filtered_mean"], places=5)
        self.assertEqual(query["matrix"][1][1], 1)


class ComponentTests(unittest.TestCase):
    def test_diagonal_squares_split_under_four_connect(self) -> None:
        four = component_query({"kernel": "identity", "connectivity": 4})
        eight = component_query({"kernel": "identity", "connectivity": 8})
        self.assertEqual(four["count"], 2)
        self.assertEqual(eight["count"], 1)


class PracticeTests(unittest.TestCase):
    def test_default_sharpen_and_four_connect(self) -> None:
        state = default_state()
        result = score_practice("neighborhood", "diagonal", 5, 2, state)
        self.assertEqual(result["correct_count"], 4)


if __name__ == "__main__":
    unittest.main()
