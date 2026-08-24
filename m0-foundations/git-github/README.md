# Git & GitHub Repository Lab

An interactive Dash learning application for beginning ISC 4221C students. It
uses a deterministic teaching model; it never runs Git commands or changes the
learner's files.

## Learning scope

- working tree → staging area → local commit;
- branch pointers, `HEAD`, divergence, and merges;
- local history versus a GitHub remote;
- push, pull, pull requests, and a simulated collaborator; and
- conceptual plus simulation-state practice with feedback and retry.

Prerequisite: recognize a terminal command and a project file. No prior Git
experience is assumed.

## Run

From this folder:

```bash
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:8050>. Set `GIT_DASHBOARD_PORT` to use another port.

## Check

```bash
python -m unittest -v test_git_model.py
python -m py_compile app.py figures.py git_model.py learning_content.py
```
