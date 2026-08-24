"""Instructional copy kept separate from dashboard layout and callbacks."""

AUDIENCE = "Beginning ISC 4221C students with basic command-line familiarity"

LEARNING_OBJECTIVES = (
    "Predict where a change exists after edit, add, commit, push, and pull.",
    "Explain how a branch pointer isolates work without copying the repository.",
    "Distinguish local Git history from GitHub remotes and pull requests.",
    "Choose Git commands from repository state rather than memorizing a script.",
)

SECTIONS = {
    "snapshots": {
        "title": "1 · Build a snapshot",
        "objective": "Objective: predict how edit, add, and commit move project state.",
        "instructions": (
            "Edit one or both files, stage their current snapshots, then commit them. "
            "Try committing before staging to see why Git stops you."
        ),
        "takeaway": (
            "A commit records exactly the staged snapshots in the local repository. "
            "Unstaged edits remain outside that checkpoint."
        ),
    },
    "branches": {
        "title": "2 · Let history branch",
        "objective": "Objective: explain how branch pointers diverge and later rejoin.",
        "instructions": (
            "Create feature, make a commit there, and switch between feature and main. "
            "Watch HEAD move while the other branch pointer stays put."
        ),
        "takeaway": (
            "A branch is a movable name for a commit, not another folder. Work on feature "
            "does not change main until a merge incorporates it."
        ),
    },
    "github": {
        "title": "3 · Share and collaborate on GitHub",
        "objective": "Objective: distinguish commit, push, pull, and pull-request effects.",
        "instructions": (
            "Push a branch to publish its commits. Open and merge a pull request, or simulate "
            "a collaborator updating main and observe why your local copy becomes behind."
        ),
        "takeaway": (
            "Git records local history. Push and pull synchronize commits with a remote; a pull "
            "request is a reviewed proposal to merge one GitHub branch into another."
        ),
    },
}

PRACTICE_INTRO = (
    "The first three questions test the workflow. Question 4 uses a frozen copy of your current "
    "simulation, so Explore changes cannot silently change its answer."
)
