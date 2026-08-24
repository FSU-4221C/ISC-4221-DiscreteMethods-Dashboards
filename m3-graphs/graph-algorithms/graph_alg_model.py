"""BFS, DFS, and Dijkstra teaching models on one small weighted graph."""

from __future__ import annotations

from collections import deque
from heapq import heappop, heappush
from typing import Any

# Classroom graph: undirected, positive weights. Positions are canvas coordinates.
VERTICES = {
    "A": (0.18, 0.78),
    "B": (0.50, 0.82),
    "C": (0.82, 0.74),
    "D": (0.22, 0.42),
    "E": (0.52, 0.38),
    "F": (0.84, 0.36),
    "G": (0.52, 0.12),
}

EDGES: list[tuple[str, str, int]] = [
    ("A", "B", 4),
    ("A", "D", 2),
    ("B", "C", 3),
    ("B", "E", 5),
    ("C", "F", 2),
    ("D", "E", 3),
    ("D", "G", 8),
    ("E", "F", 4),
    ("E", "G", 1),
]


def adjacency() -> dict[str, list[tuple[str, int]]]:
    """Return an undirected adjacency list with neighbor labels sorted."""

    graph: dict[str, list[tuple[str, int]]] = {label: [] for label in VERTICES}
    for source, target, weight in EDGES:
        graph[source].append((target, weight))
        graph[target].append((source, weight))
    for label in graph:
        graph[label].sort(key=lambda item: item[0])
    return graph


def default_state() -> dict[str, Any]:
    """Start BFS/DFS/Dijkstra at A, on the first algorithm step."""

    return normalize_state({"start": "A", "goal": "F", "step": 99, "dijkstra_step": 99})


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Validate vertex names and clamp animation steps."""

    raw = raw or {}
    start = str(raw.get("start", "A")).upper()
    goal = str(raw.get("goal", "F")).upper()
    if start not in VERTICES:
        start = "A"
    if goal not in VERTICES:
        goal = "F"
    bfs_steps = bfs_trace(start)
    dfs_steps = dfs_trace(start)
    dij_steps = dijkstra_trace(start)
    step = int(raw.get("step", 0))
    dij_step = int(raw.get("dijkstra_step", 0))
    step = min(max(0, step), max(0, len(bfs_steps) - 1))
    dij_step = min(max(0, dij_step), max(0, len(dij_steps) - 1))
    return {
        "start": start,
        "goal": goal,
        "step": step,
        "dijkstra_step": dij_step,
        "bfs_len": len(bfs_steps),
        "dfs_len": len(dfs_steps),
        "dij_len": len(dij_steps),
    }


def bfs_trace(start: str) -> list[dict[str, Any]]:
    """Return BFS snapshots: current vertex, queue, visited order."""

    graph = adjacency()
    visited: list[str] = []
    in_visited = set()
    queue: deque[str] = deque([start])
    queued = {start}
    steps: list[dict[str, Any]] = []
    while queue:
        current = queue.popleft()
        queued.discard(current)
        if current in in_visited:
            continue
        in_visited.add(current)
        visited.append(current)
        for neighbor, _weight in graph[current]:
            if neighbor not in in_visited and neighbor not in queued:
                queue.append(neighbor)
                queued.add(neighbor)
        steps.append({"current": current, "frontier": list(queue), "visited": list(visited), "kind": "bfs"})
    return steps


def dfs_trace(start: str) -> list[dict[str, Any]]:
    """Return DFS snapshots using an explicit stack (neighbors in reverse label order)."""

    graph = adjacency()
    visited: list[str] = []
    in_visited = set()
    stack = [start]
    steps: list[dict[str, Any]] = []
    while stack:
        current = stack.pop()
        if current in in_visited:
            continue
        in_visited.add(current)
        visited.append(current)
        neighbors = [neighbor for neighbor, _weight in graph[current] if neighbor not in in_visited]
        for neighbor in reversed(neighbors):
            stack.append(neighbor)
        steps.append({"current": current, "frontier": list(stack), "visited": list(visited), "kind": "dfs"})
    return steps


def dijkstra_trace(start: str) -> list[dict[str, Any]]:
    """Return Dijkstra snapshots with tentative distances and the settled set."""

    graph = adjacency()
    dist = {label: math_inf() for label in VERTICES}
    dist[start] = 0
    prev: dict[str, str | None] = {label: None for label in VERTICES}
    settled: list[str] = []
    heap: list[tuple[int, str]] = [(0, start)]
    steps: list[dict[str, Any]] = []
    in_settled: set[str] = set()
    while heap:
        cost, current = heappop(heap)
        if current in in_settled:
            continue
        in_settled.add(current)
        settled.append(current)
        for neighbor, weight in graph[current]:
            candidate = cost + weight
            if candidate < dist[neighbor]:
                dist[neighbor] = candidate
                prev[neighbor] = current
                heappush(heap, (candidate, neighbor))
        steps.append(
            {
                "current": current,
                "settled": list(settled),
                "dist": dict(dist),
                "prev": dict(prev),
                "frontier": [node for node, _cost in heap if node not in in_settled],
            }
        )
    return steps


def math_inf() -> int:
    """Return a finite sentinel used as Dijkstra's +∞ in this tiny graph."""

    return 10**6


def reconstruct_path(prev: dict[str, str | None], start: str, goal: str) -> list[str]:
    """Walk predecessor pointers from goal back to start."""

    if prev.get(goal) is None and goal != start:
        return []
    path = [goal]
    while path[-1] != start:
        parent = prev.get(path[-1])
        if parent is None:
            return []
        path.append(parent)
    path.reverse()
    return path


def traversal_query(state: dict[str, Any]) -> dict[str, Any]:
    """Bundle the current BFS and DFS snapshots."""

    state = normalize_state(state)
    bfs_steps = bfs_trace(state["start"])
    dfs_steps = dfs_trace(state["start"])
    return {
        "start": state["start"],
        "step": state["step"],
        "bfs": bfs_steps[state["step"]],
        "dfs": dfs_steps[min(state["step"], len(dfs_steps) - 1)],
        "bfs_order": bfs_steps[-1]["visited"],
        "dfs_order": dfs_steps[-1]["visited"],
        "bfs_len": len(bfs_steps),
        "dfs_len": len(dfs_steps),
    }


def dijkstra_query(state: dict[str, Any]) -> dict[str, Any]:
    """Bundle the current Dijkstra snapshot and the eventual shortest path."""

    state = normalize_state(state)
    steps = dijkstra_trace(state["start"])
    snap = steps[state["dijkstra_step"]]
    final = steps[-1]
    path = reconstruct_path(final["prev"], state["start"], state["goal"])
    goal_dist = final["dist"][state["goal"]]
    return {
        "start": state["start"],
        "goal": state["goal"],
        "step": state["dijkstra_step"],
        "snap": snap,
        "path": path,
        "goal_dist": goal_dist if goal_dist < math_inf() else None,
        "n_steps": len(steps),
    }


def traversal_takeaway(state: dict[str, Any]) -> str:
    """Contrast queue versus stack on this graph."""

    query = traversal_query(state)
    return (
        f"From {query['start']}, BFS visit order is {query['bfs_order']} (queue, layer by layer). "
        f"DFS visit order is {query['dfs_order']} (stack, dive first). Same graph, different frontier."
    )


def dijkstra_takeaway(state: dict[str, Any]) -> str:
    """State the settled distance to the chosen goal."""

    query = dijkstra_query(state)
    if query["goal_dist"] is None:
        return f"No path from {query['start']} to {query['goal']}."
    return (
        f"Dijkstra settles vertices in increasing distance from {query['start']}. "
        f"The shortest {query['start']}–{query['goal']} path is {'–'.join(query['path'])} "
        f"with total weight {query['goal_dist']}. Greedy local edge weight would not guarantee that path."
    )
