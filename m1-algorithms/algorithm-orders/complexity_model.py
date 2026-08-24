"""Deterministic teaching model for algorithm-order growth.

Costs are evaluated in log10 space so exponential and factorial orders remain
comparable after ordinary floating-point overflow. This is a simplified
operation-count model, not a wall-clock predictor.
"""

from __future__ import annotations

import ast
import math
import re
from typing import Any

LN10 = math.log(10.0)
LOG10_2 = math.log10(2.0)
MAX_LOG10 = 308.0  # roughly the limit of IEEE-754 float64
MAX_CUSTOM_ORDERS = 6
MIN_N = 2
MAX_N = 1_000_000
DEFAULT_N = 1_000
DEFAULT_SELECTED = ("constant", "log_n", "linear", "n_log_n", "quadratic")
DEFAULT_SCALE = "log"

PRESET_ORDERS: tuple[dict[str, str], ...] = (
    {
        "key": "one_over_log",
        "label": "1 / log n",
        "expression": "1/log(n)",
        "family": "decreasing",
        "description": "Shrinks toward 0. Algorithm costs do not; this shows how slowly log n grows.",
    },
    {
        "key": "constant",
        "label": "O(1)",
        "expression": "1",
        "family": "constant",
        "description": "A fixed amount of work, independent of n.",
    },
    {
        "key": "log_n",
        "label": "O(log n)",
        "expression": "log(n)",
        "family": "logarithmic",
        "description": "Work that halves the remaining input each step, such as binary search.",
    },
    {
        "key": "sqrt_n",
        "label": "O(√n)",
        "expression": "sqrt(n)",
        "family": "sublinear",
        "description": "Grows slower than linear, faster than logarithmic.",
    },
    {
        "key": "linear",
        "label": "O(n)",
        "expression": "n",
        "family": "linear",
        "description": "One pass over n items, such as sequential search.",
    },
    {
        "key": "n_log_n",
        "label": "O(n log n)",
        "expression": "n*log(n)",
        "family": "linearithmic",
        "description": "A linear pass that does a logarithmic amount of work at each item, or a typical comparison sort.",
    },
    {
        "key": "n_log2_n",
        "label": "O(n log² n)",
        "expression": "n*log(n)**2",
        "family": "linearithmic",
        "description": "Slightly more expensive than n log n, still far cheaper than n² for large n.",
    },
    {
        "key": "quadratic",
        "label": "O(n²)",
        "expression": "n**2",
        "family": "polynomial",
        "description": "A loop inside a loop, both running about n times, such as selection sort.",
    },
    {
        "key": "cubic",
        "label": "O(n³)",
        "expression": "n**3",
        "family": "polynomial",
        "description": "Three nested linear loops, such as a naive n-by-n matrix product.",
    },
    {
        "key": "quartic",
        "label": "O(n⁴)",
        "expression": "n**4",
        "family": "polynomial",
        "description": "Four nested linear loops. Already impractical for modest n.",
    },
    {
        "key": "exponential",
        "label": "O(2ⁿ)",
        "expression": "2**n",
        "family": "exponential",
        "description": "One independent yes/no choice per element, such as enumerating every subset.",
    },
    {
        "key": "factorial",
        "label": "O(n!)",
        "expression": "factorial(n)",
        "family": "factorial",
        "description": "Every ordering of n items, such as brute-force travelling salesman.",
    },
)

PRESET_BY_KEY = {order["key"]: order for order in PRESET_ORDERS}
PRESET_KEYS = tuple(order["key"] for order in PRESET_ORDERS)

ALLOWED_FUNCTIONS = frozenset({"log", "log2", "ln", "sqrt", "factorial", "exp", "abs"})
ALLOWED_NAMES = frozenset({"n"})


class OrderExpressionError(ValueError):
    """Raised when a learner-supplied order expression cannot be used."""


def default_state() -> dict[str, Any]:
    """Return the canonical Explore controls for a new session."""

    return {
        "selected": list(DEFAULT_SELECTED),
        "custom": [],
        "n": DEFAULT_N,
        "n_log10": round(math.log10(DEFAULT_N), 4),
        "y_scale": DEFAULT_SCALE,
        "custom_error": "",
    }


def clamp_n(value: float) -> int:
    """Return an integer input size inside the supported plotting range."""

    try:
        size = int(round(float(value)))
    except (TypeError, ValueError):
        return DEFAULT_N
    return max(MIN_N, min(MAX_N, size))


def n_from_log_slider(log10_n: float) -> int:
    """Convert a log10 slider value into an integer n."""

    try:
        return clamp_n(10 ** float(log10_n))
    except (TypeError, ValueError):
        return DEFAULT_N


def normalize_expression(expression: str) -> str:
    """Rewrite common math notation into a restricted Python expression."""

    text = (expression or "").strip().replace("^", "**")
    text = text.replace("√", "sqrt")
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"\bn!", "factorial(n)", text)
    if not text:
        raise OrderExpressionError("Enter an expression in n, such as n**3 or n*log(n).")
    return text


def _log10_positive(value: float) -> float:
    """Return log10 of a positive linear value, including infinities."""

    if value < 0:
        raise OrderExpressionError("This order became negative, which is not a valid operation count.")
    if value == 0:
        return float("-inf")
    if not math.isfinite(value):
        return math.inf if value > 0 else float("-inf")
    return math.log10(value)


def _logsumexp10(left: float, right: float) -> float:
    """Return log10(10**left + 10**right) with overflow-safe scaling."""

    if math.isinf(left) and left > 0:
        return math.inf
    if math.isinf(right) and right > 0:
        return math.inf
    if math.isinf(left) and left < 0:
        return right
    if math.isinf(right) and right < 0:
        return left
    peak = max(left, right)
    return peak + math.log10(10 ** (left - peak) + 10 ** (right - peak))


def _logdiffexp10(left: float, right: float) -> float:
    """Return log10(10**left - 10**right) when the difference stays positive."""

    if left <= right:
        raise OrderExpressionError("A subtraction in this order became zero or negative.")
    if math.isinf(left) and left > 0:
        return math.inf
    return left + math.log10(1.0 - 10 ** (right - left))


class _Log10Evaluator(ast.NodeVisitor):
    """Evaluate a restricted AST and return log10 of the result."""

    def __init__(self, n_value: float) -> None:
        self.n_value = float(n_value)
        self._linear_needed = False

    def visit(self, node: ast.AST) -> float:
        method = getattr(self, f"visit_{type(node).__name__}", None)
        if method is None:
            raise OrderExpressionError("Use only n, numbers, + - * / ** , and log, sqrt, factorial, or exp.")
        return method(node)

    def visit_Expression(self, node: ast.Expression) -> float:
        return self.visit(node.body)

    def visit_Constant(self, node: ast.Constant) -> float:
        if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
            raise OrderExpressionError("Only numeric constants are allowed.")
        return _log10_positive(float(node.value))

    def visit_Name(self, node: ast.Name) -> float:
        if node.id != "n":
            raise OrderExpressionError("The only variable allowed is n.")
        return _log10_positive(self.n_value)

    def visit_UnaryOp(self, node: ast.UnaryOp) -> float:
        value = self.visit(node.operand)
        if isinstance(node.op, ast.UAdd):
            return value
        raise OrderExpressionError("Unary minus is not allowed; operation counts must stay positive.")

    def visit_BinOp(self, node: ast.BinOp) -> float:
        if isinstance(node.op, ast.Add):
            return _logsumexp10(self.visit(node.left), self.visit(node.right))
        if isinstance(node.op, ast.Sub):
            return _logdiffexp10(self.visit(node.left), self.visit(node.right))
        if isinstance(node.op, ast.Mult):
            return self.visit(node.left) + self.visit(node.right)
        if isinstance(node.op, ast.Div):
            return self.visit(node.left) - self.visit(node.right)
        if isinstance(node.op, ast.Pow):
            base_log10 = self.visit(node.left)
            exponent = self._linear_value(node.right)
            if base_log10 == float("-inf"):
                return float("-inf") if exponent > 0 else math.inf
            return exponent * base_log10
        raise OrderExpressionError("Supported operators are +, -, *, /, and ** (or ^).")

    def visit_Call(self, node: ast.Call) -> float:
        if not isinstance(node.func, ast.Name) or node.keywords or len(node.args) != 1:
            raise OrderExpressionError("Functions must look like log(n) or factorial(n).")
        name = node.func.id
        if name not in ALLOWED_FUNCTIONS:
            raise OrderExpressionError(f"The function {name} is not allowed.")
        argument_linear = self._linear_value(node.args[0])
        if name in {"log", "log2"}:
            if argument_linear <= 1:
                raise OrderExpressionError("log(n) is defined for n > 1 in this lab.")
            return _log10_positive(math.log(argument_linear, 2.0))
        if name == "ln":
            if argument_linear <= 1:
                raise OrderExpressionError("ln(n) is defined for n > 1 in this lab.")
            return _log10_positive(math.log(argument_linear))
        if name == "sqrt":
            if argument_linear < 0:
                raise OrderExpressionError("sqrt(n) needs a nonnegative n.")
            return 0.5 * _log10_positive(argument_linear)
        if name == "factorial":
            if argument_linear < 0:
                raise OrderExpressionError("factorial(n) needs n ≥ 0.")
            return math.lgamma(argument_linear + 1.0) / LN10
        if name == "exp":
            return argument_linear / LN10
        if name == "abs":
            return _log10_positive(abs(argument_linear))
        raise OrderExpressionError(f"The function {name} is not allowed.")

    def _linear_value(self, node: ast.AST) -> float:
        """Recover a linear value from a log10 result when it still fits in a float."""

        log10_value = self.visit(node)
        if math.isinf(log10_value) and log10_value > 0:
            return math.inf
        if math.isinf(log10_value) and log10_value < 0:
            return 0.0
        if log10_value > MAX_LOG10:
            return math.inf
        return 10.0 ** log10_value


def parse_expression(expression: str) -> ast.Expression:
    """Parse and validate a restricted order expression."""

    normalized = normalize_expression(expression)
    try:
        tree = ast.parse(normalized, mode="eval")
    except SyntaxError as exc:
        raise OrderExpressionError("That expression could not be parsed. Try n**2 or n*log(n).") from exc
    _validate_ast(tree)
    return tree


def _validate_ast(tree: ast.AST) -> None:
    """Reject any AST node that is not part of the teaching expression language."""

    allowed_nodes = (
        ast.Expression,
        ast.BinOp,
        ast.UnaryOp,
        ast.Call,
        ast.Name,
        ast.Constant,
        ast.Load,
        ast.Add,
        ast.Sub,
        ast.Mult,
        ast.Div,
        ast.Pow,
        ast.UAdd,
        ast.USub,
    )
    for node in ast.walk(tree):
        if isinstance(node, ast.USub):
            raise OrderExpressionError("Unary minus is not allowed; operation counts must stay positive.")
        if not isinstance(node, allowed_nodes):
            raise OrderExpressionError("Use only n, numbers, + - * / ** , and log, sqrt, factorial, or exp.")
        if isinstance(node, ast.Name) and node.id not in ALLOWED_NAMES | ALLOWED_FUNCTIONS:
            raise OrderExpressionError("The only variable allowed is n.")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in ALLOWED_FUNCTIONS:
                raise OrderExpressionError("Functions must look like log(n) or factorial(n).")


def log10_cost(expression: str, n_value: float) -> float:
    """Return log10 of the model cost at n, or raise OrderExpressionError."""

    size = float(n_value)
    if size < 1.0:
        raise OrderExpressionError("n must be at least 1.")
    tree = parse_expression(expression)
    return _Log10Evaluator(size).visit(tree)


def linear_cost(expression: str, n_value: float) -> float:
    """Return the model cost as a float, using inf when it exceeds float64."""

    log_value = log10_cost(expression, n_value)
    if math.isinf(log_value) and log_value < 0:
        return 0.0
    if log_value > MAX_LOG10:
        return math.inf
    if math.isinf(log_value):
        return math.inf
    return 10.0 ** log_value


def sample_n_values(n_value: int, count: int = 80) -> list[int]:
    """Return increasing integer n samples from 2 through the current n."""

    end = clamp_n(n_value)
    if count <= 1:
        return [end]
    start_log = math.log10(MIN_N)
    end_log = math.log10(end)
    values = {MIN_N, end}
    for index in range(count):
        fraction = index / (count - 1)
        values.add(clamp_n(10 ** (start_log + fraction * (end_log - start_log))))
    return sorted(values)


def catalog_orders(state: dict[str, Any]) -> list[dict[str, str]]:
    """Return preset and custom orders in display order."""

    custom = [
        {
            "key": item["key"],
            "label": item["label"],
            "expression": item["expression"],
            "family": "custom",
            "description": f"Custom teaching curve {item['expression']}.",
        }
        for item in state.get("custom", [])
    ]
    return list(PRESET_ORDERS) + custom


def order_by_key(state: dict[str, Any], key: str) -> dict[str, str] | None:
    """Look up one order definition from the current catalog."""

    for order in catalog_orders(state):
        if order["key"] == key:
            return order
    return None


def selected_orders(state: dict[str, Any]) -> list[dict[str, str]]:
    """Return the currently selected orders, skipping unknown keys."""

    selected = state.get("selected") or []
    found = []
    seen: set[str] = set()
    for key in selected:
        if key in seen:
            continue
        order = order_by_key(state, key)
        if order is not None:
            found.append(order)
            seen.add(key)
    return found


def evaluate_order(order: dict[str, str], n_value: float) -> dict[str, Any]:
    """Evaluate one order at n and return linear, log10, and display fields."""

    try:
        log_value = log10_cost(order["expression"], n_value)
        finite = log_value <= MAX_LOG10
        linear = 10.0 ** log_value if finite and not math.isinf(log_value) else 0.0 if math.isinf(log_value) and log_value < 0 else math.inf
        return {
            "key": order["key"],
            "label": order["label"],
            "expression": order["expression"],
            "family": order.get("family", ""),
            "description": order.get("description", ""),
            "log10": log_value,
            "cost": linear,
            "defined": True,
            "error": "",
        }
    except OrderExpressionError as exc:
        return {
            "key": order["key"],
            "label": order["label"],
            "expression": order["expression"],
            "family": order.get("family", ""),
            "description": order.get("description", ""),
            "log10": math.nan,
            "cost": math.nan,
            "defined": False,
            "error": str(exc),
        }


def ranked_costs(state: dict[str, Any]) -> list[dict[str, Any]]:
    """Evaluate selected orders at the current n, cheapest first."""

    n_value = clamp_n(state.get("n", DEFAULT_N))
    results = [evaluate_order(order, n_value) for order in selected_orders(state)]
    defined = [item for item in results if item["defined"]]
    undefined = [item for item in results if not item["defined"]]
    defined.sort(key=lambda item: item["log10"])
    return defined + undefined


def growth_series(state: dict[str, Any]) -> dict[str, Any]:
    """Return sampled curves for every selected order."""

    n_value = clamp_n(state.get("n", DEFAULT_N))
    xs = sample_n_values(n_value)
    series = []
    for order in selected_orders(state):
        points_x: list[int] = []
        points_y: list[float] = []
        points_log: list[float] = []
        last_error = ""
        for size in xs:
            evaluated = evaluate_order(order, size)
            if not evaluated["defined"]:
                last_error = evaluated["error"]
                continue
            points_x.append(size)
            points_y.append(evaluated["cost"])
            points_log.append(evaluated["log10"])
        series.append(
            {
                **order,
                "x": points_x,
                "y": points_y,
                "log10": points_log,
                "error": last_error,
            }
        )
    return {"n": n_value, "x": xs, "series": series}


def cost_snapshot(state: dict[str, Any]) -> dict[str, Any]:
    """Return comparison data used by the cost-at-n section and Practice."""

    n_value = clamp_n(state.get("n", DEFAULT_N))
    ranked = ranked_costs(state)
    defined = [item for item in ranked if item["defined"]]
    cheapest = defined[0] if defined else None
    costliest = defined[-1] if defined else None
    ratio = None
    if cheapest is not None and costliest is not None:
        ratio = 10.0 ** (costliest["log10"] - cheapest["log10"])
    return {
        "n": n_value,
        "ranked": ranked,
        "cheapest": cheapest,
        "costliest": costliest,
        "ratio": ratio,
    }


def format_cost(value: float) -> str:
    """Format an operation count for labels, tables, and feedback."""

    if not math.isfinite(value):
        return "too large for float64"
    if value == 0:
        return "0"
    if value >= 1e6 or value < 1e-2:
        return f"{value:.3e}"
    if value >= 100:
        return f"{value:,.0f}"
    if value >= 10:
        return f"{value:.1f}"
    return f"{value:.3g}"


def format_duration(operations: float, seconds_per_op: float = 1e-9) -> str:
    """Translate an operation count into a 1-ns-per-operation duration."""

    if not math.isfinite(operations) or operations < 0:
        return "longer than we can represent"
    seconds = operations * seconds_per_op
    if seconds < 1e-6:
        return f"{seconds * 1e9:.2g} ns"
    if seconds < 1e-3:
        return f"{seconds * 1e6:.2g} µs"
    if seconds < 1:
        return f"{seconds * 1e3:.2g} ms"
    if seconds < 60:
        return f"{seconds:.2g} s"
    if seconds < 3600:
        return f"{seconds / 60:.2g} min"
    if seconds < 86400:
        return f"{seconds / 3600:.2g} h"
    if seconds < 365.25 * 86400:
        return f"{seconds / 86400:.2g} days"
    years = seconds / (365.25 * 86400)
    if years < 1e6:
        return f"{years:.2g} years"
    if years < 1e9:
        return f"{years / 1e6:.2g} million years"
    if years < 1e12:
        return f"{years / 1e9:.2g} billion years"
    return "far longer than the age of the universe"


def pretty_custom_label(expression: str) -> str:
    """Build a compact label for a learner-supplied expression."""

    normalized = normalize_expression(expression)
    return f"O({normalized})"


def next_custom_key(existing: list[dict[str, str]]) -> str:
    """Return a stable key for a newly added custom order."""

    used = {item.get("key", "") for item in existing}
    index = 1
    while f"custom-{index}" in used:
        index += 1
    return f"custom-{index}"


def normalize_state(state: dict[str, Any] | None) -> dict[str, Any]:
    """Validate learner-controlled Explore values and keep them JSON-safe."""

    source = state or default_state()
    n_value = clamp_n(source.get("n", n_from_log_slider(source.get("n_log10", math.log10(DEFAULT_N)))))
    y_scale = source.get("y_scale", DEFAULT_SCALE)
    if y_scale not in {"linear", "log"}:
        y_scale = DEFAULT_SCALE
    custom: list[dict[str, str]] = []
    for item in source.get("custom", [])[:MAX_CUSTOM_ORDERS]:
        try:
            expression = normalize_expression(item.get("expression", ""))
            parse_expression(expression)
        except (OrderExpressionError, AttributeError, TypeError):
            continue
        key = str(item.get("key") or next_custom_key(custom))
        custom.append(
            {
                "key": key,
                "expression": expression,
                "label": str(item.get("label") or pretty_custom_label(expression)),
            }
        )
    known_keys = set(PRESET_KEYS) | {item["key"] for item in custom}
    selected = [key for key in source.get("selected", list(DEFAULT_SELECTED)) if key in known_keys]
    if not selected and custom:
        selected = [custom[0]["key"]]
    return {
        "selected": selected,
        "custom": custom,
        "n": n_value,
        "n_log10": round(math.log10(n_value), 4),
        "y_scale": y_scale,
        "custom_error": str(source.get("custom_error", "")),
    }


def apply_explore_controls(
    selected: list[str] | None,
    n_log10: float,
    y_scale: str,
    custom: list[dict[str, str]] | None,
    custom_error: str = "",
) -> dict[str, Any]:
    """Build canonical state from the Explore control widgets."""

    return normalize_state(
        {
            "selected": selected or [],
            "custom": custom or [],
            "n_log10": n_log10,
            "n": n_from_log_slider(n_log10),
            "y_scale": y_scale,
            "custom_error": custom_error,
        }
    )


def add_custom_order(state: dict[str, Any], expression: str) -> dict[str, Any]:
    """Add a validated custom order and select it."""

    current = normalize_state(state)
    try:
        normalized = normalize_expression(expression)
        parse_expression(normalized)
        log10_cost(normalized, current["n"])
    except OrderExpressionError as exc:
        current["custom_error"] = str(exc)
        return current
    for item in current["custom"]:
        if item["expression"] == normalized:
            if item["key"] not in current["selected"]:
                current["selected"].append(item["key"])
            current["custom_error"] = f"{item['label']} is already on the plot."
            return current
    if len(current["custom"]) >= MAX_CUSTOM_ORDERS:
        current["custom_error"] = f"At most {MAX_CUSTOM_ORDERS} custom orders can be compared at once."
        return current
    key = next_custom_key(current["custom"])
    current["custom"].append({"key": key, "expression": normalized, "label": pretty_custom_label(normalized)})
    current["selected"].append(key)
    current["custom_error"] = ""
    return current


def clear_custom_orders(state: dict[str, Any]) -> dict[str, Any]:
    """Remove every custom order and keep valid preset selections."""

    current = normalize_state(state)
    current["custom"] = []
    current["selected"] = [key for key in current["selected"] if key in PRESET_KEYS]
    current["custom_error"] = ""
    return current


def growth_takeaway(state: dict[str, Any]) -> str:
    """Explain what the current growth plot is showing."""

    snapshot = cost_snapshot(state)
    n_value = snapshot["n"]
    defined = [item for item in snapshot["ranked"] if item["defined"]]
    if len(defined) < 2:
        return (
            f"Takeaway: select at least two orders. At n = {n_value:,}, a single curve cannot show which class grows faster."
        )
    cheapest = snapshot["cheapest"]
    costliest = snapshot["costliest"]
    assert cheapest is not None and costliest is not None
    if cheapest["key"] == "one_over_log":
        extra = " 1/log n is decreasing, so it is a comparison curve, not a typical algorithm cost."
    else:
        extra = ""
    scale_note = (
        " A logarithmic vertical axis keeps slow orders visible next to fast ones."
        if state.get("y_scale") == "log"
        else " A linear vertical axis makes the fastest-growing selected order dominate the picture."
    )
    return (
        f"Takeaway: at n = {n_value:,}, {costliest['label']} is the most expensive selected curve "
        f"and {cheapest['label']} is the cheapest.{extra}{scale_note}"
    )


def snapshot_takeaway(state: dict[str, Any]) -> str:
    """Explain the cost-at-n comparison, including the 1 ns metaphor."""

    snapshot = cost_snapshot(state)
    n_value = snapshot["n"]
    cheapest = snapshot["cheapest"]
    costliest = snapshot["costliest"]
    if cheapest is None or costliest is None:
        return "Takeaway: select at least one defined order to compare operation counts at this n."
    if cheapest["key"] == costliest["key"]:
        duration = format_duration(cheapest["cost"])
        return (
            f"Takeaway: {cheapest['label']} uses {format_cost(cheapest['cost'])} model operations at n = {n_value:,}. "
            f"If each operation took 1 ns, that would be {duration}."
        )
    ratio = snapshot["ratio"]
    ratio_text = format_cost(ratio) if ratio is not None else "an enormous factor"
    return (
        f"Takeaway: at n = {n_value:,}, {costliest['label']} is about {ratio_text} times "
        f"{cheapest['label']}. At 1 ns per operation that is "
        f"{format_duration(costliest['cost'])} versus {format_duration(cheapest['cost'])}."
    )


def most_expensive_key(state: dict[str, Any]) -> str | None:
    """Return the key of the most expensive defined selected order."""

    snapshot = cost_snapshot(state)
    costliest = snapshot["costliest"]
    return None if costliest is None else str(costliest["key"])


def ratio_costliest_to_cheapest(state: dict[str, Any]) -> float | None:
    """Return costliest/cheapest at the current n when both are defined."""

    snapshot = cost_snapshot(state)
    ratio = snapshot["ratio"]
    if ratio is None or not math.isfinite(ratio):
        return None
    return float(ratio)
