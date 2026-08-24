"""Canonical graph state, click-to-edit rules, and representation data.

This is a teaching model of a simple graph: no loops, at most one edge per
ordered pair (directed) or unordered pair (undirected). Isolated vertices are
kept in the vertex list even when they do not appear in the edge list.
"""

from __future__ import annotations

import math
from copy import deepcopy
from typing import Any

MAX_VERTICES = 12
LABELS = "ABCDEFGHIJKL"
HIT_RADIUS = 0.055
CANVAS_MIN = 0.04
CANVAS_MAX = 0.96

Vertex = dict[str, Any]
Edge = dict[str, str]


def simple_vertices() -> list[Vertex]:
    """Return the course SIMPLE layout: triangle ABC, spoke CD, isolated E."""

    return [
        {"id": "A", "x": 0.22, "y": 0.74},
        {"id": "B", "x": 0.58, "y": 0.78},
        {"id": "C", "x": 0.40, "y": 0.46},
        {"id": "D", "x": 0.72, "y": 0.42},
        {"id": "E", "x": 0.86, "y": 0.16},
    ]


def simple_edges() -> list[Edge]:
    """Return SIMPLE's four undirected edges {AB, AC, BC, CD}."""

    return [
        {"source": "A", "target": "B"},
        {"source": "A", "target": "C"},
        {"source": "B", "target": "C"},
        {"source": "C", "target": "D"},
    ]


def default_state() -> dict[str, Any]:
    """Start from SIMPLE so the isolated-vertex lesson is visible immediately."""

    return normalize_state(
        {
            "directed": False,
            "vertices": simple_vertices(),
            "edges": simple_edges(),
            "pending": None,
            "selected": "C",
            "revision": 1,
            "message": (
                "SIMPLE is loaded: A, B, C form a triangle, C joins D, and E is isolated. "
                "Click empty canvas to add a vertex, or click two vertices to add an edge."
            ),
            "undo": None,
        }
    )


def empty_state(directed: bool = False) -> dict[str, Any]:
    """Return a blank canvas of the requested kind."""

    return normalize_state(
        {
            "directed": directed,
            "vertices": [],
            "edges": [],
            "pending": None,
            "selected": None,
            "revision": 1,
            "message": "Click the canvas to place vertex A.",
            "undo": None,
        }
    )


def _clamp(value: float) -> float:
    """Keep a canvas coordinate inside the drawable square."""

    return min(CANVAS_MAX, max(CANVAS_MIN, float(value)))


def _labels(vertices: list[Vertex]) -> list[str]:
    """Return vertex ids in label order."""

    return [str(vertex["id"]) for vertex in sorted(vertices, key=lambda item: str(item["id"]))]


def _vertex_map(vertices: list[Vertex]) -> dict[str, Vertex]:
    """Index vertices by id."""

    return {str(vertex["id"]): vertex for vertex in vertices}


def _canonical_edge(source: str, target: str, directed: bool) -> Edge:
    """Store undirected edges with sorted endpoints; keep directed order."""

    if directed:
        return {"source": source, "target": target}
    first, second = sorted((source, target))
    return {"source": first, "target": second}


def _edge_key(edge: Edge, directed: bool) -> tuple[str, str]:
    """Return a hashable identity for an edge under the current kind."""

    source = str(edge["source"])
    target = str(edge["target"])
    if directed:
        return (source, target)
    first, second = sorted((source, target))
    return (first, second)


def _dedupe_edges(edges: list[Edge], directed: bool, labels: list[str]) -> list[Edge]:
    """Drop loops, missing endpoints, and duplicate pairs."""

    allowed = set(labels)
    seen: set[tuple[str, str]] = set()
    cleaned: list[Edge] = []
    for edge in edges:
        source = str(edge.get("source", ""))
        target = str(edge.get("target", ""))
        if source not in allowed or target not in allowed or source == target:
            continue
        canonical = _canonical_edge(source, target, directed)
        key = _edge_key(canonical, directed)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(canonical)
    return cleaned


def _strip_undo(state: dict[str, Any]) -> dict[str, Any]:
    """Copy editable graph fields without nesting undo snapshots."""

    return {
        "directed": bool(state.get("directed", False)),
        "vertices": deepcopy(state.get("vertices", [])),
        "edges": deepcopy(state.get("edges", [])),
        "pending": state.get("pending"),
        "selected": state.get("selected"),
        "revision": int(state.get("revision", 1)),
        "message": str(state.get("message", "")),
    }


def _with_undo(previous: dict[str, Any], updated: dict[str, Any]) -> dict[str, Any]:
    """Attach a one-step undo snapshot to a mutated graph."""

    result = dict(updated)
    result["undo"] = _strip_undo(previous)
    return normalize_state(result)


def next_label(vertices: list[Vertex]) -> str | None:
    """Return the next unused A–L label, or None when the canvas is full."""

    used = {str(vertex["id"]) for vertex in vertices}
    for label in LABELS:
        if label not in used:
            return label
    return None


def ring_position(index: int) -> tuple[float, float]:
    """Place the index-th vertex on a circle around the canvas center."""

    count = max(index + 1, 6)
    angle = 2.0 * math.pi * index / count - math.pi / 2.0
    return (0.50 + 0.34 * math.cos(angle), 0.50 + 0.34 * math.sin(angle))


def nearest_vertex(state: dict[str, Any], x: float, y: float) -> str | None:
    """Return the id of a vertex within HIT_RADIUS of (x, y), if any."""

    best_id: str | None = None
    best_distance = HIT_RADIUS
    for vertex in state.get("vertices", []):
        distance = math.hypot(float(vertex["x"]) - x, float(vertex["y"]) - y)
        if distance <= best_distance:
            best_distance = distance
            best_id = str(vertex["id"])
    return best_id


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Validate learner-controlled graph fields and drop dangling edges."""

    if not raw:
        return default_state()
    directed = bool(raw.get("directed", False))
    vertices: list[Vertex] = []
    seen: set[str] = set()
    for vertex in raw.get("vertices", []):
        label = str(vertex.get("id", "")).upper()
        if label not in LABELS or label in seen:
            continue
        seen.add(label)
        vertices.append({"id": label, "x": _clamp(vertex.get("x", 0.5)), "y": _clamp(vertex.get("y", 0.5))})
        if len(vertices) >= MAX_VERTICES:
            break
    vertices.sort(key=lambda item: item["id"])
    labels = _labels(vertices)
    edges = _dedupe_edges(list(raw.get("edges", [])), directed, labels)
    pending = raw.get("pending")
    selected = raw.get("selected")
    if pending not in labels:
        pending = None
    if selected not in labels:
        selected = labels[-1] if labels else None
    revision = raw.get("revision", 1)
    try:
        revision = max(1, int(revision))
    except (TypeError, ValueError):
        revision = 1
    undo = raw.get("undo")
    if isinstance(undo, dict):
        undo = _strip_undo(undo)
    else:
        undo = None
    return {
        "directed": directed,
        "vertices": vertices,
        "edges": edges,
        "pending": pending,
        "selected": selected,
        "revision": revision,
        "message": str(raw.get("message", "")),
        "undo": undo,
    }


def set_directed(state: dict[str, Any], directed: bool) -> dict[str, Any]:
    """Switch kind and rewrite stored edges to match that convention."""

    current = normalize_state(state)
    if bool(directed) == current["directed"]:
        return current
    labels = _labels(current["vertices"])
    rewritten = _dedupe_edges(current["edges"], bool(directed), labels)
    updated = dict(current)
    updated["directed"] = bool(directed)
    updated["edges"] = rewritten
    updated["pending"] = None
    updated["revision"] = current["revision"] + 1
    if directed:
        updated["message"] = (
            "Directed mode: each stored pair is a one-way arc. Click source then target. "
            "Existing undirected edges kept their A→B label order; add the reverse if you need it."
        )
    else:
        updated["message"] = (
            "Undirected mode: each pair is one unordered edge and the adjacency matrix is symmetric. "
            "Opposite directed arcs collapsed into a single undirected edge."
        )
    return _with_undo(current, updated)


def select_vertex(state: dict[str, Any], vertex_id: str | None) -> dict[str, Any]:
    """Highlight a vertex in the representations without starting an edge."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    if vertex_id not in labels:
        return current
    updated = dict(current)
    updated["selected"] = vertex_id
    updated["message"] = f"Selected vertex {vertex_id}. Its row, column, and neighborhood are highlighted."
    return normalize_state(updated)


def cancel_pending(state: dict[str, Any]) -> dict[str, Any]:
    """Clear the first endpoint of an in-progress edge."""

    current = normalize_state(state)
    updated = dict(current)
    updated["pending"] = None
    updated["message"] = "Edge click cancelled. Click a vertex to start a new edge, or empty canvas to add a vertex."
    return normalize_state(updated)


def add_vertex_at(state: dict[str, Any], x: float, y: float) -> dict[str, Any]:
    """Place the next labelled vertex at a canvas coordinate."""

    current = normalize_state(state)
    label = next_label(current["vertices"])
    if label is None:
        updated = dict(current)
        updated["message"] = f"The canvas holds at most {MAX_VERTICES} vertices so the matrix stays readable."
        return normalize_state(updated)
    x_value, y_value = _clamp(x), _clamp(y)
    for vertex in current["vertices"]:
        if math.hypot(float(vertex["x"]) - x_value, float(vertex["y"]) - y_value) < 0.07:
            x_value = _clamp(x_value + 0.08)
            y_value = _clamp(y_value - 0.05)
    updated = dict(current)
    updated["vertices"] = [*current["vertices"], {"id": label, "x": x_value, "y": y_value}]
    updated["selected"] = label
    updated["pending"] = None
    updated["message"] = f"Added vertex {label}. Click it, then another vertex, to add an edge."
    return _with_undo(current, updated)


def add_vertex_on_ring(state: dict[str, Any]) -> dict[str, Any]:
    """Place the next vertex on a circle (keyboard-accessible add)."""

    current = normalize_state(state)
    x_value, y_value = ring_position(len(current["vertices"]))
    return add_vertex_at(current, x_value, y_value)


def add_edge(state: dict[str, Any], source: str, target: str) -> dict[str, Any]:
    """Join two existing vertices according to the current directedness."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    if source not in labels or target not in labels:
        updated = dict(current)
        updated["message"] = "Both endpoints must already be on the canvas."
        return normalize_state(updated)
    if source == target:
        updated = dict(current)
        updated["pending"] = None
        updated["message"] = "Simple graphs in this lab have no loops. Click two different vertices."
        return normalize_state(updated)
    canonical = _canonical_edge(source, target, current["directed"])
    key = _edge_key(canonical, current["directed"])
    existing = {_edge_key(edge, current["directed"]) for edge in current["edges"]}
    updated = dict(current)
    updated["pending"] = None
    updated["selected"] = target
    if key in existing:
        updated["message"] = (
            f"Edge {format_edge(canonical, current['directed'])} is already present. "
            "The matrix and lists did not change."
        )
        return normalize_state(updated)
    updated["edges"] = [*current["edges"], canonical]
    if current["directed"]:
        updated["message"] = f"Added directed arc {source} → {target}."
    else:
        updated["message"] = f"Added undirected edge {canonical['source']}{canonical['target']}."
    return _with_undo(current, updated)


def click_vertex(state: dict[str, Any], vertex_id: str) -> dict[str, Any]:
    """Start an edge, complete an edge, or cancel if the same vertex is clicked twice."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    if vertex_id not in labels:
        return current
    pending = current["pending"]
    if pending is None:
        updated = dict(current)
        updated["pending"] = vertex_id
        updated["selected"] = vertex_id
        if current["directed"]:
            updated["message"] = f"Source is {vertex_id}. Click a target vertex, or empty canvas to cancel."
        else:
            updated["message"] = f"First endpoint is {vertex_id}. Click another vertex to connect, or empty canvas to cancel."
        return normalize_state(updated)
    if pending == vertex_id:
        return cancel_pending(current)
    return add_edge(current, pending, vertex_id)


def apply_canvas_click(state: dict[str, Any], x: float, y: float, customdata: Any = None) -> dict[str, Any]:
    """Interpret a Plotly click as vertex-hit, edge-complete, cancel, or add-vertex."""

    current = normalize_state(state)
    label: str | None = None
    if isinstance(customdata, list) and customdata:
        customdata = customdata[0]
    if isinstance(customdata, str) and customdata in _labels(current["vertices"]):
        label = customdata
    if label is None:
        label = nearest_vertex(current, float(x), float(y))
    if label is not None:
        return click_vertex(current, label)
    if current["pending"] is not None:
        return cancel_pending(current)
    return add_vertex_at(current, float(x), float(y))


def delete_selected(state: dict[str, Any]) -> dict[str, Any]:
    """Remove the selected vertex and every incident edge."""

    current = normalize_state(state)
    selected = current["selected"]
    if selected is None:
        updated = dict(current)
        updated["message"] = "Select a vertex first, then delete it."
        return normalize_state(updated)
    remaining = [vertex for vertex in current["vertices"] if vertex["id"] != selected]
    remaining_labels = _labels(remaining)
    edges = _dedupe_edges(current["edges"], current["directed"], remaining_labels)
    updated = dict(current)
    updated["vertices"] = remaining
    updated["edges"] = edges
    updated["pending"] = None
    updated["selected"] = remaining_labels[-1] if remaining_labels else None
    updated["message"] = f"Deleted vertex {selected} and its incident edges."
    return _with_undo(current, updated)


def clear_graph(state: dict[str, Any]) -> dict[str, Any]:
    """Empty the canvas while preserving directedness."""

    current = normalize_state(state)
    blank = empty_state(current["directed"])
    blank["revision"] = current["revision"] + 1
    return _with_undo(current, blank)


def load_simple(state: dict[str, Any] | None = None) -> dict[str, Any]:
    """Replace the canvas with the course SIMPLE graph."""

    previous = normalize_state(state) if state else empty_state()
    restored = default_state()
    restored["revision"] = previous["revision"] + 1
    restored["message"] = (
        "Reloaded SIMPLE. Compare the edge list {AB, AC, BC, CD} with the 5×5 adjacency matrix: "
        "E is missing from the list and present as a zero row."
    )
    return _with_undo(previous, restored)


def undo(state: dict[str, Any]) -> dict[str, Any]:
    """Restore the previous snapshot if one exists."""

    current = normalize_state(state)
    snapshot = current.get("undo")
    if not isinstance(snapshot, dict):
        updated = dict(current)
        updated["message"] = "Nothing to undo."
        return normalize_state(updated)
    restored = normalize_state(snapshot)
    restored["undo"] = None
    restored["message"] = "Undid the last graph change."
    restored["revision"] = current["revision"] + 1
    return restored


def format_edge(edge: Edge, directed: bool) -> str:
    """Format one edge in the course's edge-list notation."""

    source = str(edge["source"])
    target = str(edge["target"])
    if directed:
        return f"{source}→{target}"
    return f"{source}{target}"


def adjacency_matrix(state: dict[str, Any]) -> list[list[int]]:
    """Return A where A[i][j] = 1 iff there is an edge from labels[i] to labels[j]."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    index = {label: position for position, label in enumerate(labels)}
    size = len(labels)
    matrix = [[0 for _ in range(size)] for _ in range(size)]
    for edge in current["edges"]:
        row = index[edge["source"]]
        column = index[edge["target"]]
        matrix[row][column] = 1
        if not current["directed"]:
            matrix[column][row] = 1
    return matrix


def adjacency_structure(state: dict[str, Any]) -> dict[str, list[str]]:
    """Return neighborhood lists; directed graphs list out-neighbors."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    neighbors = {label: [] for label in labels}
    for edge in current["edges"]:
        source = edge["source"]
        target = edge["target"]
        neighbors[source].append(target)
        if not current["directed"] and source != target:
            neighbors[target].append(source)
    for label in labels:
        neighbors[label] = sorted(set(neighbors[label]))
    return neighbors


def degrees(state: dict[str, Any]) -> dict[str, dict[str, int]]:
    """Return degree, or in-degree and out-degree, for every vertex."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    out_counts = {label: 0 for label in labels}
    in_counts = {label: 0 for label in labels}
    for edge in current["edges"]:
        out_counts[edge["source"]] += 1
        in_counts[edge["target"]] += 1
        if not current["directed"]:
            out_counts[edge["target"]] += 1
            in_counts[edge["source"]] += 1
    result: dict[str, dict[str, int]] = {}
    for label in labels:
        if current["directed"]:
            result[label] = {
                "in": in_counts[label],
                "out": out_counts[label],
                "degree": in_counts[label] + out_counts[label],
            }
        else:
            # Undirected storage uses one canonical pair, so out_counts already
            # counted each incident edge once per endpoint.
            result[label] = {
                "in": out_counts[label],
                "out": out_counts[label],
                "degree": out_counts[label],
            }
    return result


def isolated_vertices(state: dict[str, Any]) -> list[str]:
    """Return vertices whose degree is zero."""

    return [label for label, info in degrees(state).items() if info["degree"] == 0]


def edge_list(state: dict[str, Any]) -> list[str]:
    """Return formatted edge-list entries in a stable order."""

    current = normalize_state(state)
    formatted = [format_edge(edge, current["directed"]) for edge in current["edges"]]
    return sorted(formatted)


def graph_view(state: dict[str, Any]) -> dict[str, Any]:
    """Bundle every derived representation used by the UI and by Practice."""

    current = normalize_state(state)
    labels = _labels(current["vertices"])
    structure = adjacency_structure(current)
    degree_table = degrees(current)
    isolated = isolated_vertices(current)
    listed = edge_list(current)
    selected = current["selected"]
    selected_neighbors = structure.get(selected, []) if selected else []
    if current["directed"]:
        kind = "directed graph (digraph)"
        degree_phrase = "in-degree / out-degree"
    else:
        kind = "undirected graph"
        degree_phrase = "degree"
    if listed:
        edge_display = "{" + ", ".join(listed) + "}"
    else:
        edge_display = "{ }"
    return {
        "directed": current["directed"],
        "kind": kind,
        "labels": labels,
        "n": len(labels),
        "m": len(current["edges"]),
        "matrix": adjacency_matrix(current),
        "structure": structure,
        "degrees": degree_table,
        "isolated": isolated,
        "edge_list": listed,
        "edge_display": edge_display,
        "selected": selected,
        "pending": current["pending"],
        "neighbors": selected_neighbors,
        "degree_phrase": degree_phrase,
        "message": current["message"],
        "vertices": current["vertices"],
        "edges": current["edges"],
        "revision": current["revision"],
    }


def build_takeaway(state: dict[str, Any]) -> str:
    """State what the current drawing implies for storage."""

    view = graph_view(state)
    isolated = view["isolated"]
    if view["n"] == 0:
        return "An empty canvas is the empty graph: N = 0, the matrix is 0×0, and every representation is empty."
    isolate_text = (
        f" Isolated {', '.join(isolated)} "
        f"{'is' if len(isolated) == 1 else 'are'} missing from the edge list "
        f"{view['edge_display']} but kept as zero row(s) in the adjacency matrix."
        if isolated
        else " Every vertex appears in at least one edge, so the edge list and the matrix name the same vertices."
    )
    if view["directed"]:
        symmetry = " The adjacency matrix need not be symmetric: A_ij = 1 means an arc i → j."
    else:
        symmetry = " The adjacency matrix is symmetric with a zero diagonal (simple undirected graph, no loops)."
    return (
        f"This {view['kind']} has N = {view['n']} vertices and M = {view['m']} "
        f"{'arcs' if view['directed'] else 'edges'}."
        f"{isolate_text}{symmetry}"
    )


def representations_takeaway(state: dict[str, Any]) -> str:
    """Connect the three live views to the Module 3 storage lesson."""

    view = graph_view(state)
    selected = view["selected"]
    if selected is None:
        return (
            "Add a vertex to see the edge list, adjacency matrix, and adjacency structure update together. "
            "They store the same graph; they differ in what an algorithm can look up quickly."
        )
    info = view["degrees"][selected]
    if view["directed"]:
        degree_text = f"in-degree {info['in']}, out-degree {info['out']}"
        neighbor_text = (
            f"out-neighbors {', '.join(view['neighbors'])}" if view["neighbors"] else "no out-neighbors"
        )
    else:
        degree_text = f"degree {info['degree']}"
        neighbor_text = (
            f"neighbors {', '.join(view['neighbors'])}" if view["neighbors"] else "no neighbors (isolated)"
        )
    return (
        f"Vertex {selected} has {degree_text} — that is the length of its adjacency-structure sublist "
        f"({neighbor_text}). The matrix row/column for {selected} carries the same 0/1 pattern. "
        "Changing the drawing never changes the graph's identity, only how it is stored."
    )


def apply_event(state: dict[str, Any] | None, event: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Apply one named editor action. Used by callbacks and by tests."""

    current = normalize_state(state)
    data = payload or {}
    if event == "click":
        return apply_canvas_click(current, float(data["x"]), float(data["y"]), data.get("customdata"))
    if event == "set_kind":
        return set_directed(current, bool(data.get("directed", False)))
    if event == "select":
        return select_vertex(current, data.get("vertex"))
    if event == "add_vertex":
        return add_vertex_on_ring(current)
    if event == "connect":
        source = data.get("source") or current["selected"]
        target = data.get("target")
        if not source or not target:
            updated = dict(current)
            updated["message"] = "Choose two different vertices to connect."
            return normalize_state(updated)
        return add_edge(current, str(source), str(target))
    if event == "delete":
        return delete_selected(current)
    if event == "clear":
        return clear_graph(current)
    if event == "simple":
        return load_simple(current)
    if event == "undo":
        return undo(current)
    if event == "cancel":
        return cancel_pending(current)
    return current
