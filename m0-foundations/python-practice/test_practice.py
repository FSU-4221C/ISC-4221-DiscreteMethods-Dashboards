"""Question-bank and session-model verification."""

from __future__ import annotations

import contextlib
import io
import unittest
from collections import Counter

from practice_model import (
    DEFAULT_CONFIG,
    available_questions,
    build_session,
    clear_current_answer,
    current_question,
    move,
    progress,
    review_missed,
    submit_answer,
)
from question_bank import QUESTION_BY_ID, QUESTIONS, TOPICS


class QuestionBankTests(unittest.TestCase):
    def test_bank_has_exactly_100_unique_questions(self) -> None:
        self.assertEqual(len(QUESTIONS), 100)
        self.assertEqual(len(QUESTION_BY_ID), 100)
        self.assertEqual([q["id"] for q in QUESTIONS], [f"PY{i:03d}" for i in range(1, 101)])
        self.assertEqual(Counter(q["topic"] for q in QUESTIONS), {topic: 10 for topic in TOPICS})

    def test_options_and_authored_syntax_are_valid(self) -> None:
        for question in QUESTIONS:
            with self.subTest(question=question["id"]):
                self.assertEqual(len(question["options"]), 4)
                self.assertEqual(len(set(question["options"])), 4)
                self.assertIn(question["difficulty"], {"beginner", "intermediate"})
                self.assertIn(question["correct"], range(4))
                try:
                    compile(question["code"], f"<{question['id']}>", "exec")
                    syntax_error = None
                except SyntaxError as exc:
                    syntax_error = exc
                if "syntax_error_line" in question:
                    self.assertIsNotNone(syntax_error)
                    self.assertEqual(syntax_error.lineno, question["syntax_error_line"])
                else:
                    self.assertIsNone(syntax_error)

    def test_predict_output_snippets_execute_without_failure(self) -> None:
        for question in QUESTIONS:
            if question["kind"] != "predict_output":
                continue
            with self.subTest(question=question["id"]), contextlib.redirect_stdout(io.StringIO()):
                exec(compile(question["code"], f"<{question['id']}>", "exec"), {})


class PracticeModelTests(unittest.TestCase):
    def test_selection_is_deterministic_and_respects_filters(self) -> None:
        config = {
            "topics": ["Loops"],
            "difficulties": ["beginner"],
            "kinds": ["predict_output"],
            "count": 5,
        }
        first = build_session(config, seed=8)
        second = build_session(config, seed=8)
        self.assertEqual(first["question_ids"], second["question_ids"])
        self.assertTrue(first["question_ids"])
        for question_id in first["question_ids"]:
            question = QUESTION_BY_ID[question_id]
            self.assertEqual(question["topic"], "Loops")
            self.assertEqual(question["difficulty"], "beginner")
            self.assertEqual(question["kind"], "predict_output")

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
        self.assertEqual(review["question_ids"], [second["id"]])
        self.assertEqual(progress(review)["answered"], 0)

    def test_empty_filter_returns_deliberate_empty_state(self) -> None:
        config = {"topics": [], "difficulties": ["beginner"], "kinds": ["predict_output"], "count": 10}
        self.assertEqual(available_questions(config), [])
        self.assertEqual(build_session(config)["question_ids"], [])


if __name__ == "__main__":
    unittest.main()
