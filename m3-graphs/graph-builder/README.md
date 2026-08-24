# Graph Builder Lab

An interactive Dash application for ISC 4221C Module 3. Learners place
vertices on a canvas, join them as an undirected graph or a directed
digraph, and watch three representations update together: the edge list,
the adjacency matrix, and the adjacency structure.

The course running example **SIMPLE** loads first: triangle ABC, spoke CD,
and isolated E. E is missing from `{AB, AC, BC, CD}` and present as a zero
row of A.

## Learning scope

- click empty canvas to add the next labelled vertex A, B, C, …;
- click two vertices to add an edge (first click is the tail when directed);
- undirected vs directed kind, with a symmetric matrix only in the undirected case;
- isolated vertices survive in the matrix and as empty neighbor sublists;
- concept plus frozen-graph practice with retry.

## Run

From this folder, using the course environment:

```bash
python app.py
```

Open <http://127.0.0.1:8054>. Set `GRAPH_DASHBOARD_PORT` to use another port.

## Check

```bash
python -m unittest -v test_graph_model.py
python -m py_compile app.py figures.py graph_model.py practice_model.py learning_content.py
```
