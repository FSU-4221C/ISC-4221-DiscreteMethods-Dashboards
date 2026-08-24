"""Instructional copy for the graph builder dashboard."""

AUDIENCE = "Beginning ISC 4221C students in the Module 3 graphs sequence"

LEARNING_OBJECTIVES = (
    "Build a simple graph on a canvas by placing vertices and joining pairs.",
    "Distinguish an undirected edge {uv} from a directed arc u → v.",
    "Read the same graph as an edge list, an adjacency matrix, and an adjacency structure.",
    "Explain why an isolated vertex survives in the matrix but vanishes from the edge list.",
)

SECTIONS = {
    "build": {
        "title": "1 · Build a graph on the canvas",
        "objective": "Objective: create vertices by clicking empty space and edges by clicking two vertices.",
        "instructions": (
            "SIMPLE starts loaded: A–B, A–C, B–C, C–D, and isolated E. Click empty canvas to add "
            "the next labelled vertex. Click one vertex and then another to add an edge. In directed "
            "mode the first click is the tail and the second is the head. Empty space cancels an "
            "unfinished edge. Use the buttons if you are on a keyboard."
        ),
    },
    "representations": {
        "title": "2 · Read three representations of the same graph",
        "objective": "Objective: watch the edge list, adjacency matrix, and adjacency structure stay in lockstep.",
        "instructions": (
            "These three views are computed from the canvas, not typed separately. The edge list stores "
            "pairs; it cannot mention an isolated vertex. The adjacency matrix A is N × N with "
            "A_ij = 1 iff i is joined to j (and symmetric when the graph is undirected). The adjacency "
            "structure is a sublist of neighbors for every vertex — empty for E."
        ),
    },
}

PRACTICE_INTRO = (
    "These questions freeze the graph you built in Explore. Changing the canvas afterward cannot "
    "silently change the scored answers unless you press Use current Explore graph."
)

SOURCES = (
    "ISC 4221C Module 3, Graphs — foundations: SIMPLE (A, B, C, D, isolated E), "
    "edge lists, adjacency matrices, adjacency structures, directed vs undirected graphs.",
    "A_ij = 1 if vertices i and j are joined, else 0. Simple graphs in this lab have no loops.",
    "An edge list cannot represent an isolated vertex; the adjacency matrix keeps a zero row and column.",
)
