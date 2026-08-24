"""Pure, JSON-safe teaching model for the Git and GitHub dashboard."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Callable

GitState = dict[str, Any]


def initial_state() -> GitState:
    commits = [
        {"id": "C0", "parents": [], "lane": "main", "message": "Initialize repository", "author": "You"},
        {"id": "C1", "parents": ["C0"], "lane": "main", "message": "Add README", "author": "You"},
        {"id": "C2", "parents": ["C1"], "lane": "main", "message": "Add analysis starter", "author": "You"},
    ]
    return {
        "commits": commits,
        "local_known": ["C0", "C1", "C2"],
        "remote_known": ["C0", "C1", "C2"],
        "local_branches": {"main": "C2"},
        "remote_branches": {"main": "C2"},
        "current_branch": "main",
        "working_changes": [],
        "staged_changes": [],
        "next_commit": 3,
        "pull_request": {"status": "none", "source": "feature", "target": "main"},
        "last_action": "Repository ready: local main matches GitHub main.",
        "action_kind": "info",
        "history": ["git clone · local main now matches origin/main"],
        "revision": 0,
    }


def _commit_map(state: GitState) -> dict[str, dict[str, Any]]:
    return {commit["id"]: commit for commit in state["commits"]}


def ancestors(state: GitState, head: str | None) -> set[str]:
    """Return every commit reachable from head, including head."""
    if not head:
        return set()
    commits = _commit_map(state)
    found: set[str] = set()
    stack = [head]
    while stack:
        commit_id = stack.pop()
        if commit_id in found or commit_id not in commits:
            continue
        found.add(commit_id)
        stack.extend(commits[commit_id]["parents"])
    return found


def is_ancestor(state: GitState, possible_ancestor: str, head: str) -> bool:
    return possible_ancestor in ancestors(state, head)


def unpublished_commits(state: GitState, branch: str | None = None) -> list[str]:
    """Return branch-reachable local commits that have not reached GitHub."""
    branch_name = branch or state["current_branch"]
    reachable = ancestors(state, state["local_branches"].get(branch_name))
    remote_known = set(state["remote_known"])
    return [c["id"] for c in state["commits"] if c["id"] in reachable - remote_known]


def commits_behind(state: GitState, branch: str | None = None) -> list[str]:
    """Return remote branch commits not yet known by the local repository."""
    branch_name = branch or state["current_branch"]
    reachable = ancestors(state, state["remote_branches"].get(branch_name))
    local_known = set(state["local_known"])
    return [c["id"] for c in state["commits"] if c["id"] in reachable - local_known]


def git_status_summary(state: GitState) -> dict[str, Any]:
    branch = state["current_branch"]
    return {
        "branch": branch,
        "working": len(state["working_changes"]),
        "staged": len(state["staged_changes"]),
        "unpublished": len(unpublished_commits(state, branch)),
        "behind": len(commits_behind(state, branch)),
        "local_head": state["local_branches"][branch],
        "remote_head": state["remote_branches"].get(branch),
        "pr_status": state["pull_request"]["status"],
    }


def file_change_status(state: GitState, filename: str) -> str:
    """Return whether one teaching file is clean, edited, or staged.

    Parameters
    ----------
    state : GitState
        Current simulated repository.
    filename : str
        File name used by the edit controls, such as ``README.md``.

    Returns
    -------
    str
        ``edited`` when the file is in the working tree, ``staged`` when it is
        selected for the next commit, otherwise ``clean``.
    """
    if filename in state.get("working_changes", []):
        return "edited"
    if filename in state.get("staged_changes", []):
        return "staged"
    return "clean"


def _record(state: GitState, message: str, command: str, kind: str = "success") -> GitState:
    state["last_action"] = message
    state["action_kind"] = kind
    state["history"] = ([command] + state["history"])[:8]
    state["revision"] += 1
    return state


def _reject(state: GitState, message: str, command: str) -> GitState:
    return _record(state, message, f"{command} · stopped", "warning")


def edit_file(source: GitState, filename: str) -> GitState:
    state = deepcopy(source)
    if filename not in state["working_changes"]:
        state["working_changes"].append(filename)
    return _record(state, f"Edited {filename}. The new content is only in the working tree.", f"edit {filename}")


def stage_all(source: GitState) -> GitState:
    state = deepcopy(source)
    if not state["working_changes"]:
        return _reject(state, "Nothing changed, so there is nothing to stage.", "git add .")
    for filename in state["working_changes"]:
        if filename not in state["staged_changes"]:
            state["staged_changes"].append(filename)
    state["working_changes"] = []
    return _record(state, "Staged the current file snapshots. They are selected for the next commit.", "git add .")


def commit_staged(source: GitState, message: str | None) -> GitState:
    state = deepcopy(source)
    if not state["staged_changes"]:
        return _reject(state, "No staged snapshots. Run git add before git commit.", "git commit")
    clean_message = (message or "Checkpoint staged work").strip() or "Checkpoint staged work"
    commit_id = f"C{state['next_commit']}"
    branch = state["current_branch"]
    state["commits"].append({
        "id": commit_id,
        "parents": [state["local_branches"][branch]],
        "lane": branch,
        "message": clean_message,
        "author": "You",
    })
    state["next_commit"] += 1
    state["local_known"].append(commit_id)
    state["local_branches"][branch] = commit_id
    count = len(state["staged_changes"])
    state["staged_changes"] = []
    return _record(state, f"Created local commit {commit_id} on {branch} from {count} staged file snapshot(s).", f'git commit -m "{clean_message}"')


def create_feature_branch(source: GitState) -> GitState:
    state = deepcopy(source)
    if "feature" in state["local_branches"]:
        return _reject(state, "The feature branch already exists.", "git switch -c feature")
    head = state["local_branches"][state["current_branch"]]
    state["local_branches"]["feature"] = head
    state["current_branch"] = "feature"
    return _record(state, "Created feature at the current commit and switched to it. main did not move.", "git switch -c feature")


def checkout_branch(source: GitState, branch: str | None) -> GitState:
    state = deepcopy(source)
    if branch not in state["local_branches"]:
        return _reject(state, "That local branch does not exist yet.", f"git switch {branch}")
    if state["working_changes"] or state["staged_changes"]:
        return _reject(state, "Commit the current file changes before switching in this teaching model.", f"git switch {branch}")
    state["current_branch"] = branch
    return _record(state, f"Switched to {branch}. HEAD now points to its tip.", f"git switch {branch}")


def push_current(source: GitState) -> GitState:
    state = deepcopy(source)
    branch = state["current_branch"]
    local_head = state["local_branches"][branch]
    remote_head = state["remote_branches"].get(branch)
    if remote_head and not is_ancestor(state, remote_head, local_head):
        return _reject(state, "Push rejected: GitHub has commits this branch does not contain. Pull first.", f"git push -u origin {branch}")
    new_ids = ancestors(state, local_head) - set(state["remote_known"])
    state["remote_known"].extend(c["id"] for c in state["commits"] if c["id"] in new_ids)
    state["remote_branches"][branch] = local_head
    if not new_ids and remote_head == local_head:
        return _record(state, f"Everything on {branch} was already visible on GitHub.", f"git push origin {branch}", "info")
    return _record(state, f"Published {len(new_ids)} commit(s). GitHub {branch} now points to {local_head}.", f"git push -u origin {branch}")


def open_pull_request(source: GitState) -> GitState:
    state = deepcopy(source)
    feature_head = state["remote_branches"].get("feature")
    main_head = state["remote_branches"].get("main")
    if not feature_head:
        return _reject(state, "GitHub has no feature branch. Push it before opening a pull request.", "gh pr create")
    if feature_head == main_head or is_ancestor(state, feature_head, main_head):
        return _reject(state, "The feature branch has no change to propose to main.", "gh pr create")
    state["pull_request"]["status"] = "open"
    return _record(state, "Opened a pull request on GitHub. It proposes feature → main; main is unchanged.", "gh pr create --base main --head feature")


def merge_pull_request(source: GitState) -> GitState:
    state = deepcopy(source)
    if state["pull_request"]["status"] != "open":
        return _reject(state, "There is no open pull request to merge.", "gh pr merge")
    commit_id = f"C{state['next_commit']}"
    state["commits"].append({
        "id": commit_id,
        "parents": [state["remote_branches"]["main"], state["remote_branches"]["feature"]],
        "lane": "main",
        "message": "Merge pull request: feature",
        "author": "GitHub",
    })
    state["next_commit"] += 1
    state["remote_known"].append(commit_id)
    state["remote_branches"]["main"] = commit_id
    state["pull_request"]["status"] = "merged"
    return _record(state, f"GitHub created merge commit {commit_id}. Local main is behind until you pull.", "gh pr merge --merge")


def collaborator_commit(source: GitState) -> GitState:
    state = deepcopy(source)
    commit_id = f"C{state['next_commit']}"
    state["commits"].append({
        "id": commit_id,
        "parents": [state["remote_branches"]["main"]],
        "lane": "main",
        "message": "Update from collaborator",
        "author": "Collaborator",
    })
    state["next_commit"] += 1
    state["remote_known"].append(commit_id)
    state["remote_branches"]["main"] = commit_id
    return _record(state, f"A collaborator pushed {commit_id} to GitHub main. Your local main has not received it.", "collaborator: git push origin main")


def pull_current(source: GitState) -> GitState:
    state = deepcopy(source)
    branch = state["current_branch"]
    local_head = state["local_branches"][branch]
    remote_head = state["remote_branches"].get(branch)
    if not remote_head:
        return _reject(state, "This branch has no matching branch on GitHub.", f"git pull origin {branch}")
    unseen = ancestors(state, remote_head) - set(state["local_known"])
    state["local_known"].extend(c["id"] for c in state["commits"] if c["id"] in unseen)
    if is_ancestor(state, local_head, remote_head):
        state["local_branches"][branch] = remote_head
        return _record(state, f"Fast-forwarded local {branch} to {remote_head}; received {len(unseen)} commit(s).", f"git pull origin {branch}")
    if is_ancestor(state, remote_head, local_head):
        return _record(state, f"Local {branch} already contains GitHub {branch}; nothing changed.", f"git pull origin {branch}", "info")
    commit_id = f"C{state['next_commit']}"
    state["commits"].append({
        "id": commit_id,
        "parents": [local_head, remote_head],
        "lane": branch,
        "message": f"Merge origin/{branch}",
        "author": "You",
    })
    state["next_commit"] += 1
    state["local_known"].append(commit_id)
    state["local_branches"][branch] = commit_id
    return _record(state, f"Local and GitHub {branch} diverged, so pull created merge commit {commit_id}.", f"git pull origin {branch}")


def apply_action(source: GitState, action: str, value: str | None = None) -> GitState:
    actions: dict[str, Callable[[], GitState]] = {
        "edit-readme": lambda: edit_file(source, "README.md"),
        "edit-code": lambda: edit_file(source, "analysis.py"),
        "stage": lambda: stage_all(source),
        "commit": lambda: commit_staged(source, value),
        "create-feature": lambda: create_feature_branch(source),
        "checkout": lambda: checkout_branch(source, value),
        "push": lambda: push_current(source),
        "open-pr": lambda: open_pull_request(source),
        "merge-pr": lambda: merge_pull_request(source),
        "collaborator": lambda: collaborator_commit(source),
        "pull": lambda: pull_current(source),
        "reset": initial_state,
    }
    if action not in actions:
        state = deepcopy(source)
        return _reject(state, f"Unknown teaching action: {action}", action)
    return actions[action]()
