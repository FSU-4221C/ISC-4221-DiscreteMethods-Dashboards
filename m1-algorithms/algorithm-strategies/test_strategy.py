"""Tests for search and coin-change models."""

from __future__ import annotations

import unittest

from practice_model import score_practice
from strategy_model import binary_search, coin_query, default_state, greedy_change, optimal_change, search_query


class SearchTests(unittest.TestCase):
    def test_binary_search_on_sixteen_finds_eleven_in_four_probes(self) -> None:
        query = search_query(default_state())
        self.assertEqual(query["sequential"]["comparisons"], 11)
        self.assertEqual(query["binary"]["found_at"], 10)
        self.assertEqual(binary_search(list(range(1, 17)), 11)["comparisons"], query["binary"]["comparisons"])


class CoinTests(unittest.TestCase):
    def test_counterexample_six_with_four_three_one(self) -> None:
        self.assertEqual(greedy_change(6, [4, 3, 1]), [4, 1, 1])
        self.assertEqual(optimal_change(6, [4, 3, 1]), [3, 3])
        query = coin_query(default_state())
        self.assertEqual(query["greedy_count"], 3)
        self.assertEqual(query["optimal_count"], 2)

    def test_us_coins_greedy_matches_optimum_for_forty_one(self) -> None:
        greedy = greedy_change(41, [25, 10, 5, 1])
        optimal = optimal_change(41, [25, 10, 5, 1])
        self.assertEqual(len(greedy), len(optimal))
        self.assertEqual(sum(greedy), 41)


class PracticeTests(unittest.TestCase):
    def test_default_state_scores_all_four(self) -> None:
        state = default_state()
        result = score_practice("sorted", "counterexample", search_query(state)["binary"]["comparisons"], 2, state)
        self.assertEqual(result["correct_count"], 4)


if __name__ == "__main__":
    unittest.main()
