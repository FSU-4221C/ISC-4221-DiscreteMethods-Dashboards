# Algorithm Orders Lab

An interactive Dash application for beginning ISC 4221C students. It plots
standard complexity classes as n grows, accepts extra custom orders, and
practices classifying fifty short programs by their tightest Big-O class.

The app uses a deterministic operation-count model. It does not time real
algorithms, and it never executes learner-supplied code.

## Learning scope

- compare O(1), O(log n), O(n), O(n log n), O(n²), O(n³), O(2ⁿ), O(n!), and
  related curves such as 1/log n and √n;
- add a custom expression in n, for example `n**4` or `n*log(n)**2`;
- see why a logarithmic vertical axis is needed once the fast-growing classes
  appear;
- classify nested loops, doubling/halving, divide-and-conquer, exponential
  recursion, and permutation search.

`log(n)` means log₂(n), matching the Module 1 convention.

## Run

From this folder, using the course environment:

```bash
python app.py
```

Open <http://127.0.0.1:8052>. Set `ALGORITHM_ORDERS_PORT` to use another port.

## Check

```bash
python -m unittest -v test_complexity.py
python -m py_compile app.py figures.py complexity_model.py practice_model.py question_bank.py learning_content.py
```
