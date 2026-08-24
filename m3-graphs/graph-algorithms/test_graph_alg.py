"""Tests for BFS, DFS, and Dijkstra on the classroom graph."""

from __future__ import annotations

import unittest

from graph_alg_model import bfs_trace, default_state, dijkstra_query, dfs_trace, traversal_query
from practice_model import score_practice


class TraversalTests(unittest.TestCase):
    def test_bfs_from_a_visits_every_vertex(self) -> None:
        order = bfs_trace("A")[-1]["visited"]
        self.assertEqual(set(order), set("ABCDEFG"))
        self.assertEqual(order[0], "A")

    def test_dfs_order_differs_from_bfs(self) -> None:
        self.assertNotEqual(bfs_trace("A")[-1]["visited"], dfs_trace("A")[-1]["visited"])


class DijkstraTests(unittest.TestCase):
    def test_shortest_a_to_f_has_weight_nine(self) -> None:
        query = dijkstra_query(default_state())
        self.assertEqual(query["goal_dist"], 9)
        self.assertEqual(query["path"][0], "A")
        self.assertEqual(query["path"][-1], "F")


class PracticeTests(unittest.TestCase):
    def test_default_scores_all_four(self) -> None:
        state = default_state()
        third = traversal_query(state)["bfs_order"][2]
        result = score_practice("queue", "weights", third, 9, state)
        self.assertEqual(result["correct_count"], 4)


if __name__ == "__main__":
    unittest.main()
