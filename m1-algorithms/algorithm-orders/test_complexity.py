"""Model, parser, question-bank, and session tests for the algorithm-order lab."""

from __future__ import annotations

import math
import unittest
from collections import Counter

from complexity_model import (
    OrderExpressionError,
    add_custom_order,
    apply_explore_controls,
    cost_snapshot,
    default_state,
    linear_cost,
    log10_cost,
    most_expensive_key,
    n_from_log_slider,
    parse_expression,
    ratio_costliest_to_cheapest,
)
from practice_model import (
    DEFAULT_CONFIG,
    available_questions,
    build_session,
    clear_current_answer,
    current_question,
    expected_state_answer,
    move,
    progress,
    review_missed,
    score_warm_up,
    submit_answer,
)
from question_bank import ORDER_LABELS, QUESTION_BY_ID, QUESTIONS, TOPICS


class ComplexityModelTests(unittest.TestCase):
    def test_standard_values_at_n_16(self) -> None:
        self.assertAlmostEqual(linear_cost("1", 16), 1.0)
        self.assertAlmostEqual(linear_cost("log(n)", 16), 4.0)
        self.assertAlmostEqual(linear_cost("n", 16), 16.0)
        self.assertAlmostEqual(linear_cost("n*log(n)", 16), 64.0)
        self.assertAlmostEqual(linear_cost("n**2", 16), 256.0)
        self.assertAlmostEqual(linear_cost("2**n", 16), 65536.0)

    def test_one_over_log_decreases(self) -> None:
        small = linear_cost("1/log(n)", 4)
        large = linear_cost("1/log(n)", 1024)
        self.assertGreater(small, large)
        self.assertAlmostEqual(small, 0.5)

    def test_factorial_matches_gamma(self) -> None:
        self.assertAlmostEqual(linear_cost("factorial(n)", 6), 720.0)
        self.assertGreater(log10_cost("factorial(n)", 200), 300)

    def test_course_ordering_at_n_20(self) -> None:
        n_value = 20
        labels = ["n", "n*log(n)", "n**2", "n**3", "2**n", "factorial(n)"]
        values = [log10_cost(expression, n_value) for expression in labels]
        self.assertEqual(values, sorted(values))

    def test_caret_and_factorial_syntax(self) -> None:
        self.assertAlmostEqual(linear_cost("n^3", 10), 1000.0)
        self.assertAlmostEqual(linear_cost("n!", 5), 120.0)

    def test_parser_rejects_imports_and_names(self) -> None:
        for expression in ("__import__('os')", "open('x')", "a+1", "n.bit_length()"):
            with self.subTest(expression=expression):
                with self.assertRaises(OrderExpressionError):
                    parse_expression(expression)

    def test_custom_order_is_selected_and_ranked(self) -> None:
        state = add_custom_order(default_state(), "n**4")
        self.assertTrue(any(item["expression"] == "n**4" for item in state["custom"]))
        self.assertIn(state["custom"][0]["key"], state["selected"])
        self.assertEqual(most_expensive_key(state), state["custom"][0]["key"])

    def test_ratio_matches_n_for_quadratic_over_linear(self) -> None:
        state = apply_explore_controls(["linear", "quadratic"], 3, "log", [])
        self.assertEqual(state["n"], 1000)
        ratio = ratio_costliest_to_cheapest(state)
        self.assertIsNotNone(ratio)
        assert ratio is not None
        self.assertAlmostEqual(ratio, 1000.0, delta=1.0)

    def test_n_slider_conversion(self) -> None:
        self.assertEqual(n_from_log_slider(2), 100)
        self.assertEqual(n_from_log_slider(3), 1000)
        self.assertEqual(n_from_log_slider(6), 1_000_000)

    def test_snapshot_identifies_costliest_order(self) -> None:
        state = apply_explore_controls(["linear", "quadratic", "cubic"], math.log10(100), "log", [])
        snapshot = cost_snapshot(state)
        self.assertEqual(snapshot["costliest"]["key"], "cubic")
        self.assertEqual(snapshot["cheapest"]["key"], "linear")


class QuestionBankTests(unittest.TestCase):
    def test_bank_has_exactly_50_unique_questions(self) -> None:
        self.assertEqual(len(QUESTIONS), 50)
        self.assertEqual(len(QUESTION_BY_ID), 50)
        self.assertEqual([question["id"] for question in QUESTIONS], [f"AO{i:03d}" for i in range(1, 51)])
        counts = Counter(question["topic"] for question in QUESTIONS)
        self.assertEqual(set(counts), set(TOPICS))
        self.assertEqual(sum(counts.values()), 50)

    def test_options_match_authored_order_and_compile(self) -> None:
        for question in QUESTIONS:
            with self.subTest(question=question["id"]):
                self.assertEqual(len(question["options"]), 4)
                self.assertEqual(len(set(question["options"])), 4)
                self.assertIn(question["difficulty"], {"beginner", "intermediate"})
                self.assertIn(question["correct"], range(4))
                self.assertEqual(question["options"][question["correct"]], ORDER_LABELS[question["topic"]])
                compile(question["code"], f"<{question['id']}>", "exec")


class PracticeModelTests(unittest.TestCase):
    def test_selection_is_deterministic_and_respects_filters(self) -> None:
        config = {
            "topics": ["Quadratic"],
            "difficulties": ["beginner"],
            "kinds": ["classify_order"],
            "count": 5,
        }
        first = build_session(config, seed=8)
        second = build_session(config, seed=8)
        self.assertEqual(first["question_ids"], second["question_ids"])
        self.assertTrue(first["question_ids"])
        for question_id in first["question_ids"]:
            question = QUESTION_BY_ID[question_id]
            self.assertEqual(question["topic"], "Quadratic")
            self.assertEqual(question["difficulty"], "beginner")

    def test_scoring_retry_navigation_reset_and_review(self) -> None:
        session = build_session(DEFAULT_CONFIG, seed=4)
        question = current_question(session)
        assert question is not None
        wrong = (question["correct"] + 1) % 4
        session = submit_answer(session, wrong)
        self.assertFalse(session["correct"][question["id"]])
        session = submit_answer(session, question["correct"])
        self.assertTrue(session["correct"][question["id"]])
        self.assertEqual(session["attempts"][question["id"]], 2)
        moved = move(session, 1)
        self.assertEqual(moved["index"], 1)
        cleared = clear_current_answer(moved)
        self.assertEqual(progress(cleared)["answered"], 1)

        second = current_question(moved)
        assert second is not None
        moved = submit_answer(moved, (second["correct"] + 1) % 4)
        review = review_missed(moved)
        self.assertEqual(review["mode"], "review missed")
        self.assertIn(second["id"], review["question_ids"])
        self.assertEqual(progress(review)["answered"], 0)

    def test_empty_filter_returns_deliberate_empty_state(self) -> None:
        config = {"topics": [], "difficulties": ["beginner"], "kinds": ["classify_order"], "count": 10}
        self.assertEqual(available_questions(config), [])
        self.assertEqual(build_session(config)["question_ids"], [])

    def test_warmup_uses_the_same_ratio_as_the_plot(self) -> None:
        state = apply_explore_controls(["linear", "quadratic"], 3, "log", [])
        expected, _note = expected_state_answer(state)
        self.assertAlmostEqual(expected, 1000.0, delta=1.0)
        result = score_warm_up("add", "quadratic", 1000, state)
        self.assertEqual(result["correct_count"], 3)
        incomplete = score_warm_up(None, None, None, state)
        self.assertEqual(incomplete["q1"]["status"], "incomplete")
        self.assertEqual(incomplete["correct_count"], 0)


if __name__ == "__main__":
    unittest.main()
