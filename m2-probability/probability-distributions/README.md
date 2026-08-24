# PDF & CDF Lab

An interactive Dash application for ISC 4221C Module 2. Learners probe a
named continuous density and an invented discrete PDF, read the value at a
point, and watch the cumulative distribution catch up.

The course uses **PDF** for both the discrete mass function and the continuous
density. For a continuous random variable the height is density and
P(X = x) = 0; probability is the shaded area, which equals F_X(x).

## Learning scope

- Gaussian, uniform, and exponential PDFs with a movable probe x;
- side-by-side PDF and CDF, with P(X ≤ x) shaded on the density;
- a fair die, two-dice sum, Poisson, or an invented 1–6 die whose masses you
  set and renormalize;
- P(X = k), F_X(k), E[X], and Var(X) on the discrete side;
- concept plus frozen-plot practice with retry.

## Run

From this folder, using the course environment:

```bash
python app.py
```

Open <http://127.0.0.1:8053>. Set `PROBABILITY_DASHBOARD_PORT` to use another port.

## Check

```bash
python -m unittest -v test_distributions.py
python -m py_compile app.py figures.py distribution_model.py practice_model.py learning_content.py
```
