# Python Syntax Practice Lab

A practice-first Dash application for beginning ISC 4221C students. The bank
contains exactly 100 authored, multiple-choice Python 3 snippets across ten
topics. The application does not execute learner-supplied code.

## Question bank

- core values and types;
- strings;
- lists and tuples;
- dictionaries and sets;
- conditionals;
- loops;
- functions;
- comprehensions and generators;
- errors and exceptions; and
- classes and modules.

Question styles include predicting output, tracing final state, explaining
behavior, locating errors, and choosing corrections. Sessions support filtering,
retry, per-question reset, navigation, progress, and a missed-question review.

## Run

```bash
python -m pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:8051>. Set `PYTHON_PRACTICE_PORT` to use another port.

## Check

```bash
python -m unittest -v test_practice.py
python -m py_compile app.py figures.py practice_model.py question_bank.py
```
