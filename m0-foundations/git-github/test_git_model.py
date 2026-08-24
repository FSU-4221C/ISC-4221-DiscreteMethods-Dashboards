"""Representative learning-path tests for the Git teaching model."""

import unittest

from git_model import apply_action, commits_behind, file_change_status, git_status_summary, initial_state, unpublished_commits


class GitModelTests(unittest.TestCase):
    def test_commit_stays_local_until_push(self) -> None:
        state = initial_state()
        for action in ("edit-readme", "stage"):
            state = apply_action(state, action)
        state = apply_action(state, "commit", "Explain project")
        self.assertEqual(len(unpublished_commits(state)), 1)
        self.assertNotEqual(state["local_branches"]["main"], state["remote_branches"]["main"])
        state = apply_action(state, "push")
        self.assertEqual(unpublished_commits(state), [])
        self.assertEqual(state["local_branches"]["main"], state["remote_branches"]["main"])

    def test_feature_pull_request_does_not_move_local_main(self) -> None:
        state = initial_state()
        original_main = state["local_branches"]["main"]
        for action in ("create-feature", "edit-code", "stage"):
            state = apply_action(state, action)
        state = apply_action(state, "commit", "Try a faster method")
        for action in ("push", "open-pr"):
            state = apply_action(state, action)
        self.assertEqual(state["pull_request"]["status"], "open")
        self.assertEqual(state["local_branches"]["main"], original_main)
        state = apply_action(state, "merge-pr")
        self.assertEqual(state["local_branches"]["main"], original_main)
        state = apply_action(state, "checkout", "main")
        # The feature commit is already local; only GitHub's merge commit is new.
        self.assertEqual(len(commits_behind(state)), 1)
        state = apply_action(state, "pull")
        self.assertEqual(commits_behind(state), [])

    def test_remote_change_rejects_non_fast_forward_push(self) -> None:
        state = initial_state()
        for action in ("edit-code", "stage"):
            state = apply_action(state, action)
        state = apply_action(state, "commit", "Local experiment")
        state = apply_action(state, "collaborator")
        state = apply_action(state, "push")
        self.assertEqual(state["action_kind"], "warning")
        state = apply_action(state, "pull")
        status = git_status_summary(state)
        self.assertEqual(status["behind"], 0)
        self.assertGreaterEqual(status["unpublished"], 1)

    def test_file_status_tracks_edit_stage_and_commit(self) -> None:
        state = initial_state()
        self.assertEqual(file_change_status(state, "README.md"), "clean")
        state = apply_action(state, "edit-readme")
        self.assertEqual(file_change_status(state, "README.md"), "edited")
        self.assertEqual(file_change_status(state, "analysis.py"), "clean")
        state = apply_action(state, "stage")
        self.assertEqual(file_change_status(state, "README.md"), "staged")
        state = apply_action(state, "commit", "Document the change")
        self.assertEqual(file_change_status(state, "README.md"), "clean")


if __name__ == "__main__":
    unittest.main()
