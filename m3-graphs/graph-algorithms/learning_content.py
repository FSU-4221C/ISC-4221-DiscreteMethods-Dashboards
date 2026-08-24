"""Instructional copy for the graph-algorithms lab."""

LEARNING_OBJECTIVES = (
    "Step through BFS and DFS on the same undirected graph and compare visit order.",
    "Name the frontier: a queue for BFS, a stack for DFS.",
    "Watch Dijkstra settle vertices in increasing distance from the source.",
    "Read a shortest-path weight as a sum of edge weights, not a hop count.",
)

SECTIONS = {
    "traversal": {
        "title": "1 · Breadth-first versus depth-first search",
        "objective": "Objective: see BFS expand layer by layer while DFS dives along a stack.",
        "instructions": (
            "Choose a start vertex and drag the step control. Gold is the vertex just visited. "
            "BFS uses a queue (neighbors in label order). DFS uses a stack (neighbors pushed in reverse label order). "
            "Both visit every vertex on this connected graph; they disagree about when."
        ),
    },
    "dijkstra": {
        "title": "2 · Dijkstra's shortest path",
        "objective": "Objective: settle vertices by tentative distance and read the path to the goal.",
        "instructions": (
            "Edge labels are positive weights. Dijkstra always settles the unsettled vertex with smallest "
            "tentative distance. The teal path is the reconstructed shortest route from the start to the goal "
            "after the algorithm finishes; earlier steps show the growing settled set."
        ),
    },
}

PRACTICE_INTRO = (
    "These questions freeze the start vertex, goal, and animation step. Changing Explore afterward "
    "cannot silently rescore answers unless you press Use current Explore graph."
)

SOURCES = (
    "ISC 4221C Module 3: graph traversal, shortest paths, and Dijkstra on nonnegative weights.",
    "The classroom graph is a teaching example, not a road network. BFS hop-distance and Dijkstra weighted distance are different quantities.",
)
