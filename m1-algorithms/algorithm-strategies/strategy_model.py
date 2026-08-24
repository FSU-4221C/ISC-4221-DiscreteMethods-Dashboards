"""Search and coin-change teaching models for Module 1."""

from __future__ import annotations

from typing import Any

COIN_SYSTEMS: dict[str, dict[str, Any]] = {
    "us": {"label": "US coins {25, 10, 5, 1}", "coins": [25, 10, 5, 1]},
    "134": {"label": "Counterexample {4, 3, 1}", "coins": [4, 3, 1]},
}


def default_state() -> dict[str, Any]:
    """Return the classroom starting configuration."""

    return normalize_state(
        {
            "n": 16,
            "target": 11,
            "coin_system": "134",
            "amount": 6,
        }
    )


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Clamp learner controls to the ranges shown on the dashboard."""

    raw = raw or {}
    n = int(raw.get("n", 16))
    n = min(64, max(4, n))
    target = int(raw.get("target", 11))
    target = min(n, max(1, target))
    system = str(raw.get("coin_system", "134"))
    if system not in COIN_SYSTEMS:
        system = "134"
    amount = int(raw.get("amount", 6))
    amount = min(40, max(1, amount))
    return {"n": n, "target": target, "coin_system": system, "amount": amount}


def sorted_keys(n: int) -> list[int]:
    """Return the sorted array 1, 2, ..., n used by both searches."""

    return list(range(1, n + 1))


def sequential_search(values: list[int], target: int) -> dict[str, Any]:
    """Scan left to right and report the inspected indices."""

    inspected: list[int] = []
    found_at = -1
    for index, value in enumerate(values):
        inspected.append(index)
        if value == target:
            found_at = index
            break
    return {
        "name": "sequential search",
        "found_at": found_at,
        "inspected": inspected,
        "comparisons": len(inspected),
    }


def binary_search(values: list[int], target: int) -> dict[str, Any]:
    """Halve a sorted array and report the midpoints examined."""

    inspected: list[int] = []
    left, right = 0, len(values) - 1
    found_at = -1
    while left <= right:
        mid = (left + right) // 2
        inspected.append(mid)
        if values[mid] == target:
            found_at = mid
            break
        if values[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return {
        "name": "binary search",
        "found_at": found_at,
        "inspected": inspected,
        "comparisons": len(inspected),
    }


def search_query(state: dict[str, Any]) -> dict[str, Any]:
    """Compare sequential and binary search on the current sorted keys."""

    state = normalize_state(state)
    values = sorted_keys(state["n"])
    sequential = sequential_search(values, state["target"])
    binary = binary_search(values, state["target"])
    return {
        "values": values,
        "target": state["target"],
        "n": state["n"],
        "sequential": sequential,
        "binary": binary,
        "ratio": sequential["comparisons"] / max(1, binary["comparisons"]),
    }


def greedy_change(amount: int, coins: list[int]) -> list[int]:
    """Take the largest coin that never exceeds the remaining amount."""

    remaining = amount
    chosen: list[int] = []
    for coin in sorted(coins, reverse=True):
        while remaining >= coin:
            chosen.append(coin)
            remaining -= coin
    return chosen


def optimal_change(amount: int, coins: list[int]) -> list[int]:
    """Return a fewest-coin combination by dynamic programming."""

    inf = amount + 1
    best = [inf] * (amount + 1)
    used = [-1] * (amount + 1)
    best[0] = 0
    for value in range(1, amount + 1):
        for coin in coins:
            if coin <= value and best[value - coin] + 1 < best[value]:
                best[value] = best[value - coin] + 1
                used[value] = coin
    if best[amount] >= inf:
        return []
    result: list[int] = []
    current = amount
    while current > 0:
        coin = used[current]
        result.append(coin)
        current -= coin
    return sorted(result, reverse=True)


def coin_query(state: dict[str, Any]) -> dict[str, Any]:
    """Compare greedy and optimal change for the frozen coin system."""

    state = normalize_state(state)
    spec = COIN_SYSTEMS[state["coin_system"]]
    coins = list(spec["coins"])
    greedy = greedy_change(state["amount"], coins)
    optimal = optimal_change(state["amount"], coins)
    return {
        "label": spec["label"],
        "coins": coins,
        "amount": state["amount"],
        "greedy": greedy,
        "optimal": optimal,
        "greedy_count": len(greedy),
        "optimal_count": len(optimal),
        "greedy_is_optimal": greedy == optimal or len(greedy) == len(optimal),
    }


def search_takeaway(state: dict[str, Any]) -> str:
    """Explain the current search comparison."""

    query = search_query(state)
    return (
        f"Sequential search inspected {query['sequential']['comparisons']} keys to find "
        f"{query['target']} in a sorted list of {query['n']}. Binary search inspected "
        f"{query['binary']['comparisons']} midpoints. The array is already sorted; binary "
        "search is allowed to throw away half of the remaining interval at every comparison."
    )


def coin_takeaway(state: dict[str, Any]) -> str:
    """Explain whether greedy matched the fewest-coin solution."""

    query = coin_query(state)
    if query["greedy_count"] == query["optimal_count"]:
        return (
            f"For amount {query['amount']} with {query['label']}, greedy produced "
            f"{query['greedy']} ({query['greedy_count']} coins) and that count matches "
            "the DP optimum. US coins are a canonical system where greedy is always optimal."
        )
    return (
        f"For amount {query['amount']} with {query['label']}, greedy produced "
        f"{query['greedy']} ({query['greedy_count']} coins) but a fewer-coin combination "
        f"is {query['optimal']} ({query['optimal_count']} coins). A locally largest coin "
        "is not always a globally fewest-coin solution."
    )
