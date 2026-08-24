"""Tests for seeded Monte Carlo models."""

from __future__ import annotations

import math
import unittest

from mc_model import clt_sample, dart_sample, default_state
from practice_model import score_practice


class DartTests(unittest.TestCase):
    def test_default_seed_is_reproducible(self) -> None:
        first = dart_sample(default_state())
        second = dart_sample(default_state())
        self.assertEqual(first["hits"], second["hits"])
        self.assertAlmostEqual(first["estimate"], 4 * first["hits"] / first["n"])
        self.assertGreater(first["hits"], 0)
        self.assertLess(first["hits"], first["n"])


class CltTests(unittest.TestCase):
    def test_exponential_standard_error_formula(self) -> None:
        sample = clt_sample(default_state())
        self.assertAlmostEqual(sample["theoretical_se"], 1.0 / math.sqrt(12), places=6)
        self.assertEqual(len(sample["means"]), 400)


class PracticeTests(unittest.TestCase):
    def test_default_scores_when_using_model_values(self) -> None:
        state = default_state()
        darts = dart_sample(state)
        clt = clt_sample(state)
        result = score_practice("area", "parent", darts["estimate"], clt["theoretical_se"], state)
        self.assertEqual(result["correct_count"], 4)


if __name__ == "__main__":
    unittest.main()
