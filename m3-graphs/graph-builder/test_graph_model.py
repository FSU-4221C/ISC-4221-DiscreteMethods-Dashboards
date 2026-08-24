"""Model and scoring tests for the graph builder lab."""

from __future__ import annotations

import unittest

from graph_model import (
    adjacency_matrix,
    adjacency_structure,
    apply_event,
    default_state,
    edge_list,
    graph_view,
    isolated_vertices,
    load_simple,
    normalize_state,
)
from practice_model import expected_selected_degree, expected_vertex_count, score_practice


class SimpleGraphTests(unittest.TestCase):
    def test_simple_matrix_matches_the_lecture(self) -> None:
        matrix = adjacency_matrix(default_state())
        expected = [
            [0, 1, 1, 0, 0],
            [1, 0, 1, 0, 0],
            [1, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0],
        ]
        self.assertEqual(matrix, expected)

    def test_edge_list_omits_isolated_e(self) -> None:
        listed = edge_list(default_state())
        self.assertEqual(listed, ["AB", "AC", "BC", "CD"])
        self.assertEqual(isolated_vertices(default_state()), ["E"])
        self.assertNotIn("E", "".join(listed))

    def test_adjacency_structure_keeps_empty_sublist_for_e(self) -> None:
        structure = adjacency_structure(default_state())
        self.assertEqual(structure["A"], ["B", "C"])
        self.assertEqual(structure["C"], ["A", "B", "D"])
        self.assertEqual(structure["E"], [])
        view = graph_view(default_state())
        self.assertEqual(view["degrees"]["C"]["degree"], 3)
        self.assertEqual(view["degrees"]["E"]["degree"], 0)
        self.assertEqual(view["n"], 5)
        self.assertEqual(view["m"], 4)


class EditorTests(unittest.TestCase):
    def test_click_empty_canvas_adds_next_label(self) -> None:
        blank = apply_event(default_state(), "clear")
        added = apply_event(blank, "click", {"x": 0.3, "y": 0.4})
        self.assertEqual([vertex["id"] for vertex in added["vertices"]], ["A"])
        self.assertEqual(added["selected"], "A")

    def test_two_vertex_clicks_add_an_undirected_edge(self) -> None:
        state = apply_event(default_state(), "clear")
        state = apply_event(state, "click", {"x": 0.2, "y": 0.2})
        state = apply_event(state, "click", {"x": 0.8, "y": 0.8})
        state = apply_event(state, "click", {"x": 0.2, "y": 0.2, "customdata": "A"})
        state = apply_event(state, "click", {"x": 0.8, "y": 0.8, "customdata": "B"})
        self.assertEqual(edge_list(state), ["AB"])
        matrix = adjacency_matrix(state)
        self.assertEqual(matrix[0][1], 1)
        self.assertEqual(matrix[1][0], 1)
        self.assertEqual(matrix[0][0], 0)

    def test_directed_edge_is_one_way(self) -> None:
        state = apply_event(default_state(), "clear")
        state = apply_event(state, "set_kind", {"directed": True})
        state = apply_event(state, "add_vertex")
        state = apply_event(state, "add_vertex")
        state = apply_event(state, "connect", {"source": "A", "target": "B"})
        matrix = adjacency_matrix(state)
        self.assertEqual(matrix[0][1], 1)
        self.assertEqual(matrix[1][0], 0)
        self.assertEqual(edge_list(state), ["A→B"])
        view = graph_view(state)
        self.assertEqual(view["degrees"]["A"]["out"], 1)
        self.assertEqual(view["degrees"]["A"]["in"], 0)
        self.assertEqual(view["degrees"]["B"]["in"], 1)

    def test_loops_are_rejected(self) -> None:
        state = apply_event(default_state(), "connect", {"source": "A", "target": "A"})
        self.assertEqual(edge_list(state), ["AB", "AC", "BC", "CD"])
        self.assertIsNone(state["pending"])

    def test_pending_click_on_empty_cancels(self) -> None:
        state = apply_event(default_state(), "click", {"x": 0.22, "y": 0.74, "customdata": "A"})
        self.assertEqual(state["pending"], "A")
        cancelled = apply_event(state, "click", {"x": 0.05, "y": 0.05})
        self.assertIsNone(cancelled["pending"])
        self.assertEqual(len(cancelled["vertices"]), 5)

    def test_switching_to_undirected_collapses_opposite_arcs(self) -> None:
        state = apply_event(default_state(), "clear")
        state = apply_event(state, "set_kind", {"directed": True})
        state = apply_event(state, "add_vertex")
        state = apply_event(state, "add_vertex")
        state = apply_event(state, "connect", {"source": "A", "target": "B"})
        state = apply_event(state, "connect", {"source": "B", "target": "A"})
        self.assertEqual(len(state["edges"]), 2)
        undirected = apply_event(state, "set_kind", {"directed": False})
        self.assertEqual(edge_list(undirected), ["AB"])
        self.assertFalse(undirected["directed"])

    def test_delete_selected_drops_incident_edges(self) -> None:
        state = apply_event(default_state(), "select", {"vertex": "C"})
        deleted = apply_event(state, "delete")
        self.assertNotIn("C", [vertex["id"] for vertex in deleted["vertices"]])
        self.assertEqual(edge_list(deleted), ["AB"])
        self.assertEqual(isolated_vertices(deleted), ["D", "E"])

    def test_undo_restores_previous_graph(self) -> None:
        state = apply_event(default_state(), "delete")
        restored = apply_event(state, "undo")
        self.assertEqual([vertex["id"] for vertex in restored["vertices"]], ["A", "B", "C", "D", "E"])
        self.assertEqual(edge_list(restored), ["AB", "AC", "BC", "CD"])

    def test_load_simple_replaces_a_cleared_canvas(self) -> None:
        state = apply_event(default_state(), "clear")
        restored = load_simple(state)
        self.assertEqual(graph_view(restored)["n"], 5)
        self.assertEqual(graph_view(restored)["isolated"], ["E"])


class PracticeScoringTests(unittest.TestCase):
    def test_default_frozen_simple_scores_all_four(self) -> None:
        state = default_state()
        self.assertEqual(expected_vertex_count(state), 5)
        self.assertEqual(expected_selected_degree(state), 3)
        result = score_practice("symmetric", "isolated", 5, 3, state)
        self.assertEqual(result["correct_count"], 4)

    def test_wrong_theory_and_stale_counts_need_revision(self) -> None:
        result = score_practice("alpha", "last", 4, 0, default_state())
        self.assertEqual(result["q1"]["status"], "incorrect")
        self.assertEqual(result["q2"]["status"], "incorrect")
        self.assertEqual(result["q3"]["status"], "incorrect")
        self.assertEqual(result["q4"]["status"], "incorrect")
        self.assertEqual(result["correct_count"], 0)

    def test_directed_out_degree_is_scored_from_the_model(self) -> None:
        state = apply_event(default_state(), "set_kind", {"directed": True})
        state = apply_event(state, "select", {"vertex": "A"})
        self.assertEqual(expected_selected_degree(state), 2)
        result = score_practice("symmetric", "isolated", 5, 2, state)
        self.assertEqual(result["q4"]["status"], "correct")

    def test_incomplete_answers_are_not_marked_correct(self) -> None:
        result = score_practice(None, None, None, None, default_state())
        self.assertEqual(result["correct_count"], 0)
        self.assertEqual(result["q1"]["status"], "incomplete")
        self.assertEqual(result["q3"]["status"], "incomplete")

    def test_normalize_drops_edges_to_missing_vertices(self) -> None:
        raw = {
            "directed": False,
            "vertices": [{"id": "A", "x": 0.2, "y": 0.2}],
            "edges": [{"source": "A", "target": "Z"}],
            "selected": "Z",
        }
        state = normalize_state(raw)
        self.assertEqual(state["edges"], [])
        self.assertEqual(state["selected"], "A")


if __name__ == "__main__":
    unittest.main()
