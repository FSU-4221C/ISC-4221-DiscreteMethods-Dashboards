"""Model and scoring tests for the PDF/CDF lab."""

from __future__ import annotations

import math
import unittest

import numpy as np

from distribution_model import (
    continuous_curves,
    continuous_query,
    default_state,
    discrete_query,
    normalize_state,
    normalize_weights,
)
from practice_model import expected_continuous_cdf, expected_discrete_mean, score_practice


class ContinuousModelTests(unittest.TestCase):
    def test_standard_gaussian_at_the_mean(self) -> None:
        state = normalize_state(default_state())
        query = continuous_query(state)
        self.assertEqual(query["family"], "gaussian")
        self.assertAlmostEqual(query["x"], 0.0)
        self.assertAlmostEqual(query["cdf"], 0.5, places=6)
        self.assertAlmostEqual(query["point_probability"], 0.0)
        self.assertAlmostEqual(query["pdf"], 1.0 / math.sqrt(2.0 * math.pi), places=5)
        self.assertAlmostEqual(query["mean"], 0.0)

    def test_pdf_integrates_to_one(self) -> None:
        curves = continuous_curves(default_state())
        area = float(np.trapezoid(np.asarray(curves["pdf"]), np.asarray(curves["x"])))
        self.assertAlmostEqual(area, 1.0, delta=0.02)

    def test_uniform_cdf_is_linear_on_support(self) -> None:
        state = normalize_state(
            {**default_state(), "continuous_family": "uniform", "uniform_a": 0.0, "uniform_b": 4.0, "x": 1.0}
        )
        query = continuous_query(state)
        self.assertAlmostEqual(query["cdf"], 0.25, places=5)
        self.assertAlmostEqual(query["mean"], 2.0, places=5)


class DiscreteModelTests(unittest.TestCase):
    def test_fair_die_moments(self) -> None:
        state = normalize_state({**default_state(), "discrete_family": "fair_die", "k": 3})
        query = discrete_query(state)
        self.assertAlmostEqual(query["point_probability"], 1.0 / 6.0)
        self.assertAlmostEqual(query["cdf"], 0.5)
        self.assertAlmostEqual(query["mean"], 3.5)
        self.assertAlmostEqual(query["variance"], 35.0 / 12.0, places=5)

    def test_two_dice_mean_is_seven(self) -> None:
        state = normalize_state({**default_state(), "discrete_family": "two_dice", "k": 7})
        query = discrete_query(state)
        self.assertAlmostEqual(query["mean"], 7.0)
        self.assertAlmostEqual(query["point_probability"], 6.0 / 36.0)
        self.assertAlmostEqual(query["cdf"], (1 + 2 + 3 + 4 + 5 + 6) / 36.0)

    def test_invented_masses_renormalize_and_shift_expectation(self) -> None:
        self.assertEqual(normalize_weights([0, 0, 0, 0, 0, 0]), [1.0 / 6.0] * 6)
        state = normalize_state({**default_state(), "discrete_family": "invented", "weights": [0, 0, 0, 0, 0, 4], "k": 6})
        query = discrete_query(state)
        self.assertAlmostEqual(query["point_probability"], 1.0)
        self.assertAlmostEqual(query["cdf"], 1.0)
        self.assertAlmostEqual(query["mean"], 6.0)
        five = discrete_query({**state, "k": 5})
        self.assertAlmostEqual(five["point_probability"], 0.0)
        self.assertAlmostEqual(five["cdf"], 0.0)


class PracticeScoringTests(unittest.TestCase):
    def test_default_frozen_state_scores_all_four(self) -> None:
        state = default_state()
        self.assertAlmostEqual(expected_continuous_cdf(state), 0.5, places=6)
        self.assertAlmostEqual(expected_discrete_mean(state), 3.5, places=6)
        result = score_practice("zero", "cdf", 0.5, 3.5, state)
        self.assertEqual(result["correct_count"], 4)

    def test_incomplete_and_wrong_answers_are_distinct(self) -> None:
        incomplete = score_practice(None, None, None, None, default_state())
        self.assertEqual(incomplete["correct_count"], 0)
        self.assertEqual(incomplete["q1"]["status"], "incomplete")
        wrong = score_practice("height", "point", 0.9, 0.0, default_state())
        self.assertEqual(wrong["correct_count"], 0)
        self.assertEqual(wrong["q1"]["status"], "incorrect")
        self.assertEqual(wrong["q3"]["status"], "incorrect")


if __name__ == "__main__":
    unittest.main()
