"""Fifty authored snippets for classifying the tightest standard order.

The dashboard never executes learner-supplied code. These programs are fixed
course examples. Assume n is the input size named in the snippet, and choose
the tightest class from the options.
"""

from __future__ import annotations

from typing import Any

TOPICS = (
    "Constant",
    "Logarithmic",
    "Linear",
    "Linearithmic",
    "Quadratic",
    "Cubic",
    "Exponential",
    "Factorial",
)

KINDS = ("classify_order",)
KIND_LABELS = {"classify_order": "Choose the order"}

ORDER_LABELS = {
    "Constant": "O(1)",
    "Logarithmic": "O(log n)",
    "Linear": "O(n)",
    "Linearithmic": "O(n log n)",
    "Quadratic": "O(n²)",
    "Cubic": "O(n³)",
    "Exponential": "O(2ⁿ)",
    "Factorial": "O(n!)",
}


def Q(
    key: str,
    topic: str,
    difficulty: str,
    prompt: str,
    code: str,
    options: tuple[str, str, str, str],
    correct: int,
    explanation: str,
) -> dict[str, Any]:
    """Build one JSON-safe multiple-choice record."""

    return {
        "id": key,
        "topic": topic,
        "difficulty": difficulty,
        "kind": "classify_order",
        "prompt": prompt,
        "code": code.strip("\n"),
        "options": list(options),
        "correct": correct,
        "explanation": explanation,
        "order": ORDER_LABELS[topic],
    }


PROMPT = "What is the tightest standard order of this snippet as n grows?"

QUESTIONS = [
    Q("AO001", "Constant", "beginner", PROMPT, """
def first_entry(values):
    return values[0]
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 0,
        "Indexing one array entry does a fixed amount of work. n = len(values) never enters the runtime."),
    Q("AO002", "Constant", "beginner", PROMPT, """
total = 0
for i in range(8):
    total += i
""", ("O(1)", "O(n)", "O(n²)", "O(8n)"), 0,
        "The loop bound is the constant 8, not n. A constant number of additions is O(1)."),
    Q("AO003", "Constant", "beginner", PROMPT, """
def midpoint(left, right):
    return (left + right) / 2
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 0,
        "A fixed arithmetic formula does not grow with any input size."),
    Q("AO004", "Constant", "intermediate", PROMPT, """
def ends(values, n):
    if n <= 0:
        return 0
    return values[0] + values[n - 1]
""", ("O(1)", "O(n)", "O(log n)", "O(n²)"), 0,
        "The function reads two entries and returns. n is used as an index, not as a loop bound."),
    Q("AO005", "Constant", "intermediate", PROMPT, """
def closed_formula(n):
    return n * n + 3 * n + 1
""", ("O(1)", "O(n)", "O(n²)", "O(n³)"), 0,
        "Evaluating a closed formula from n is arithmetic, not a loop over n items. The work does not grow with n."),
    Q("AO006", "Logarithmic", "beginner", PROMPT, """
i = 1
steps = 0
while i < n:
    i *= 2
    steps += 1
""", ("O(1)", "O(log n)", "O(n)", "O(n log n)"), 1,
        "i takes the values 1, 2, 4, 8, … until it reaches n. The body runs once per doubling: Θ(log n)."),
    Q("AO007", "Logarithmic", "beginner", PROMPT, """
i = n
while i > 1:
    i //= 2
    print(i)
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 1,
        "Each iteration halves i. The number of halvings from n down to 1 is floor(log₂ n)."),
    Q("AO008", "Logarithmic", "beginner", PROMPT, """
def binary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
""", ("O(1)", "O(log n)", "O(n)", "O(n log n)"), 1,
        "n is the length of a. Each comparison discards half of the remaining range, so the worst case is O(log n)."),
    Q("AO009", "Logarithmic", "intermediate", PROMPT, """
def bit_length(n):
    bits = 0
    while n:
        n >>= 1
        bits += 1
    return bits
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 1,
        "Shifting n right until it becomes 0 peels off one bit per step. An integer n has about log₂ n bits."),
    Q("AO010", "Logarithmic", "intermediate", PROMPT, """
def last_power_of_two(n):
    p = 1
    while p * 2 <= n:
        p *= 2
    return p
""", ("O(n)", "O(n log n)", "O(log n)", "O(1)"), 2,
        "p doubles until it would pass n. The loop count is the number of doublings that fit in n, which is O(log n)."),
    Q("AO011", "Logarithmic", "intermediate", PROMPT, """
def recursive_halve(n):
    if n <= 1:
        return 0
    return 1 + recursive_halve(n // 2)
""", ("O(1)", "O(log n)", "O(n)", "O(2ⁿ)"), 1,
        "Each call halves n and makes one recursive call. The depth is the number of halvings, O(log n), not a branching tree."),
    Q("AO012", "Linear", "beginner", PROMPT, """
total = 0
for i in range(n):
    total += i
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 2,
        "The loop body runs once for each of the n values of i. Sequential accumulation is O(n)."),
    Q("AO013", "Linear", "beginner", PROMPT, """
def sequential_search(a, target):
    for item in a:
        if item == target:
            return True
    return False
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 2,
        "n is the length of a. In the worst case the target is missing and every entry is compared once."),
    Q("AO014", "Linear", "beginner", PROMPT, """
def two_passes(a):
    total = 0
    for item in a:
        total += item
    biggest = a[0]
    for item in a:
        if item > biggest:
            biggest = item
    return total, biggest
""", ("O(n)", "O(n²)", "O(2ⁿ)", "O(n log n)"), 0,
        "Two loops in sequence each cost O(n). O(n) + O(n) is still O(n), not O(n²). Nested loops multiply; sequential loops add."),
    Q("AO015", "Linear", "beginner", PROMPT, """
count = 0
for i in range(n):
    for j in range(4):
        count += 1
""", ("O(1)", "O(n)", "O(n²)", "O(4ⁿ)"), 1,
        "The inner loop bound is the constant 4. The body runs 4n times, which is O(n)."),
    Q("AO016", "Linear", "intermediate", PROMPT, """
def copy_and_scan(a):
    b = []
    for item in a:
        b.append(item)
    total = 0
    for item in b:
        total += item
    return total
""", ("O(1)", "O(n)", "O(n²)", "O(n log n)"), 1,
        "Building b visits n items; summing b visits n items. Two linear passes remain O(n)."),
    Q("AO017", "Linear", "intermediate", PROMPT, """
i = 0
total = 0
while i < n:
    total += i
    i += 1
""", ("O(log n)", "O(n)", "O(n²)", "O(1)"), 1,
        "i increases by 1 each time, so the body runs n times. This is the same class as for i in range(n)."),
    Q("AO018", "Linear", "intermediate", PROMPT, """
def max_minus_min(a):
    smallest = a[0]
    largest = a[0]
    for item in a:
        if item < smallest:
            smallest = item
        if item > largest:
            largest = item
    return largest - smallest
""", ("O(1)", "O(log n)", "O(n)", "O(n²)"), 2,
        "One pass over n entries, with a constant amount of work per entry, is O(n)."),
    Q("AO019", "Linear", "intermediate", PROMPT, """
def three_sums(a, b, c):
    total = 0
    for x in a:
        total += x
    for y in b:
        total += y
    for z in c:
        total += z
    return total
""", ("O(n)", "O(n²)", "O(n³)", "O(3ⁿ)"), 0,
        "If a, b, and c each have length n, the three sequential loops cost 3n operations: still O(n)."),
    Q("AO020", "Linearithmic", "beginner", PROMPT, """
count = 0
for i in range(n):
    j = n
    while j > 1:
        count += 1
        j //= 2
""", ("O(n)", "O(n log n)", "O(n²)", "O(log n)"), 1,
        "The outer loop runs n times. The inner loop halves j from n down to 1, so it is O(log n). The product is O(n log n)."),
    Q("AO021", "Linearithmic", "beginner", PROMPT, """
def merge_sort_shape(n):
    if n <= 1:
        return 0
    return merge_sort_shape(n // 2) + merge_sort_shape(n // 2) + n
""", ("O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"), 1,
        "The recursion tree has log n levels, and the + n work on each level sums to n per level, which is the merge-sort recurrence Θ(n log n)."),
    Q("AO022", "Linearithmic", "beginner", PROMPT, """
count = 0
for i in range(n):
    k = 1
    while k < n:
        count += 1
        k *= 2
""", ("O(log n)", "O(n)", "O(n log n)", "O(n²)"), 2,
        "n outer iterations, each doubling k until it reaches n. Doubling is logarithmic, so the total is n · log n."),
    Q("AO023", "Linearithmic", "intermediate", PROMPT, """
def sort_then_scan(a):
    b = sorted(a)
    total = 0
    for item in b:
        total += item
    return total
""", ("O(n)", "O(n log n)", "O(n²)", "O(n!)"), 1,
        "A typical comparison sort is O(n log n). The following linear scan is cheaper, so the snippet is dominated by the sort."),
    Q("AO024", "Linearithmic", "intermediate", PROMPT, """
def heapish_passes(n):
    cost = 0
    width = n
    while width > 1:
        for _ in range(n):
            cost += 1
        width //= 2
    return cost
""", ("O(n)", "O(n log n)", "O(n²)", "O(log n)"), 1,
        "width halves each pass, so there are O(log n) passes. Each pass does n units of work, which is O(n log n)."),
    Q("AO025", "Linearithmic", "intermediate", PROMPT, """
def binary_search_each(a, queries):
    hits = 0
    for target in queries:
        lo, hi = 0, len(a) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if a[mid] == target:
                hits += 1
                break
            if a[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
    return hits
""", ("O(n)", "O(n log n)", "O(n²)", "O(log n)"), 1,
        "If a and queries both have length n, each of n queries binary-searches an n-element array: n · log n."),
    Q("AO026", "Quadratic", "beginner", PROMPT, """
count = 0
for i in range(n):
    for j in range(n):
        count += 1
""", ("O(n)", "O(n log n)", "O(n²)", "O(n³)"), 2,
        "The inner body runs once for every pair (i, j). There are n · n = n² pairs."),
    Q("AO027", "Quadratic", "beginner", PROMPT, """
for i in range(n):
    for j in range(i):
        print(i, j)
""", ("O(n)", "O(n log n)", "O(n²)", "O(n!)"), 2,
        "The inner loop runs 0 + 1 + … + (n − 1) = n(n − 1)/2 times. Half of n² is still O(n²)."),
    Q("AO028", "Quadratic", "beginner", PROMPT, """
def has_duplicate(a):
    n = len(a)
    for i in range(n):
        for j in range(i + 1, n):
            if a[i] == a[j]:
                return True
    return False
""", ("O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"), 2,
        "Every unordered pair is compared in the worst case. The number of pairs is n(n − 1)/2, which is O(n²)."),
    Q("AO029", "Quadratic", "beginner", PROMPT, """
def selection_sort(a):
    n = len(a)
    for i in range(n):
        best = i
        for j in range(i + 1, n):
            if a[j] < a[best]:
                best = j
        a[i], a[best] = a[best], a[i]
    return a
""", ("O(n)", "O(n log n)", "O(n²)", "O(n!)"), 2,
        "The comparison in the inner loop is the operation of interest. Selection sort always does n²/2 − n/2 comparisons: O(n²)."),
    Q("AO030", "Quadratic", "beginner", PROMPT, """
def bubble_pass(a):
    n = len(a)
    for i in range(n):
        for j in range(n - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a
""", ("O(n)", "O(n²)", "O(n log n)", "O(2ⁿ)"), 1,
        "n outer sweeps, each comparing about n adjacent pairs. That product is O(n²) even if a swap happens only sometimes."),
    Q("AO031", "Quadratic", "intermediate", PROMPT, """
total = 0
for i in range(n):
    total += i
for i in range(n):
    for j in range(n):
        total += i * j
""", ("O(n)", "O(n log n)", "O(n²)", "O(n³)"), 2,
        "The first loop is O(n). The nested loops are O(n²). The more expensive term dominates, so the snippet is O(n²)."),
    Q("AO032", "Quadratic", "intermediate", PROMPT, """
count = 0
for i in range(n):
    for j in range(n):
        for k in range(3):
            count += 1
""", ("O(n)", "O(n²)", "O(n³)", "O(3n)"), 1,
        "The innermost loop is a constant 3. The two loops that grow with n give 3n² operations: O(n²), not O(n³)."),
    Q("AO033", "Quadratic", "intermediate", PROMPT, """
def all_pair_sums(a):
    n = len(a)
    sums = []
    for i in range(n):
        for j in range(n):
            sums.append(a[i] + a[j])
    return sums
""", ("O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"), 2,
        "Every ordered pair of indices produces one sum. There are n² pairs."),
    Q("AO034", "Quadratic", "intermediate", PROMPT, """
i = 0
count = 0
while i < n:
    j = 0
    while j < n:
        count += 1
        j += 1
    i += 1
""", ("O(n)", "O(n log n)", "O(n²)", "O(log n)"), 2,
        "Both counters increase by 1, so this is the same nested n-by-n structure as two range(n) loops."),
    Q("AO035", "Quadratic", "intermediate", PROMPT, """
def matrix_add(a, b):
    n = len(a)
    c = []
    for i in range(n):
        row = []
        for j in range(n):
            row.append(a[i][j] + b[i][j])
        c.append(row)
    return c
""", ("O(n)", "O(n²)", "O(n³)", "O(n log n)"), 1,
        "An n-by-n matrix has n² entries. Adding corresponding entries visits each one once: O(n²)."),
    Q("AO036", "Quadratic", "intermediate", PROMPT, """
def insertion_sort(a):
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a
""", ("O(n)", "O(n log n)", "O(n²)", "O(n!)"), 2,
        "In the worst case the inner while-loop walks all the way back to the start on every i, which is 1 + 2 + … + (n − 1) shifts: O(n²)."),
    Q("AO037", "Quadratic", "intermediate", PROMPT, """
def count_inversions_naive(a):
    n = len(a)
    inversions = 0
    for i in range(n):
        for j in range(i + 1, n):
            if a[i] > a[j]:
                inversions += 1
    return inversions
""", ("O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"), 2,
        "Every pair of positions is compared once. Pair counting is triangular, and triangular is still O(n²)."),
    Q("AO038", "Cubic", "beginner", PROMPT, """
count = 0
for i in range(n):
    for j in range(n):
        for k in range(n):
            count += 1
""", ("O(n²)", "O(n³)", "O(n log n)", "O(2ⁿ)"), 1,
        "Three nested loops that each run n times execute the body n³ times."),
    Q("AO039", "Cubic", "beginner", PROMPT, """
def matrix_multiply(a, b):
    n = len(a)
    c = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(n):
                c[i][j] += a[i][k] * b[k][j]
    return c
""", ("O(n²)", "O(n³)", "O(n log n)", "O(n!)"), 1,
        "Each of the n² output entries is a dot product of length n, so the multiplication loop runs n³ times."),
    Q("AO040", "Cubic", "intermediate", PROMPT, """
def all_triples(a):
    n = len(a)
    triples = []
    for i in range(n):
        for j in range(n):
            for k in range(n):
                triples.append((a[i], a[j], a[k]))
    return triples
""", ("O(n)", "O(n²)", "O(n³)", "O(n!)"), 2,
        "Every ordered triple of indices is visited once. There are n³ of them."),
    Q("AO041", "Cubic", "intermediate", PROMPT, """
total = 0
for i in range(n):
    for j in range(n):
        total += i + j
for i in range(n):
    for j in range(n):
        for k in range(n):
            total += i * j * k
""", ("O(n²)", "O(n³)", "O(n² + n³)", "O(n^6)"), 1,
        "O(n²) followed by O(n³) is O(n³). Keep the dominant term; do not add the exponents."),
    Q("AO042", "Cubic", "intermediate", PROMPT, """
def floyd_like(dist):
    n = len(dist)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                through_k = dist[i][k] + dist[k][j]
                if through_k < dist[i][j]:
                    dist[i][j] = through_k
    return dist
""", ("O(n²)", "O(n³)", "O(n log n)", "O(2ⁿ)"), 1,
        "The triple loop over k, i, and j is the Floyd–Warshall pattern: Θ(n³) relaxations."),
    Q("AO043", "Exponential", "beginner", PROMPT, """
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
""", ("O(n)", "O(n²)", "O(2ⁿ)", "O(n!)"), 2,
        "Each call branches into two more calls. The recursion tree has exponential size; the tight standard class here is O(2ⁿ)."),
    Q("AO044", "Exponential", "beginner", PROMPT, """
def subsets(items):
    if not items:
        return [[]]
    head, *tail = items
    rest = subsets(tail)
    return rest + [[head] + subset for subset in rest]
""", ("O(n)", "O(n²)", "O(2ⁿ)", "O(n!)"), 2,
        "A set of n items has 2ⁿ subsets: each item is either in or out. Building the full power set is exponential in n."),
    Q("AO045", "Exponential", "intermediate", PROMPT, """
def count_subsets(n):
    if n == 0:
        return 1
    return count_subsets(n - 1) + count_subsets(n - 1)
""", ("O(n)", "O(n²)", "O(2ⁿ)", "O(n log n)"), 2,
        "Two recursive calls on n − 1 duplicate the work. The call tree has 2ⁿ leaves, one per subset."),
    Q("AO046", "Exponential", "intermediate", PROMPT, """
def towers_of_hanoi(n, src, dst, aux):
    if n == 0:
        return
    towers_of_hanoi(n - 1, src, aux, dst)
    print(src, dst)
    towers_of_hanoi(n - 1, aux, dst, src)
""", ("O(n)", "O(n²)", "O(2ⁿ)", "O(n!)"), 2,
        "Moving n disks requires two subproblems of size n − 1 plus one move. The recurrence T(n) = 2T(n − 1) + 1 is Θ(2ⁿ)."),
    Q("AO047", "Factorial", "beginner", PROMPT, """
def permutations(items):
    if len(items) <= 1:
        return [items]
    result = []
    for index, item in enumerate(items):
        rest = items[:index] + items[index + 1:]
        for tail in permutations(rest):
            result.append([item] + tail)
    return result
""", ("O(n²)", "O(2ⁿ)", "O(n!)", "O(nⁿ)"), 2,
        "There are n! orderings of n distinct items. Generating every permutation therefore costs O(n!) output work."),
    Q("AO048", "Factorial", "beginner", PROMPT, """
def brute_force_tours(cities):
    n = len(cities)
    count = 0
    def visit(remaining):
        nonlocal count
        if not remaining:
            count += 1
            return
        for index in range(len(remaining)):
            visit(remaining[:index] + remaining[index + 1:])
    visit(list(range(n)))
    return count
""", ("O(n²)", "O(2ⁿ)", "O(n!)", "O(n log n)"), 2,
        "At the first city there are n choices, then n − 1, then n − 2, …. That product is n!, the brute-force TSP pattern."),
    Q("AO049", "Factorial", "intermediate", PROMPT, """
def nested_countdown(n):
    if n <= 1:
        return 1
    total = 0
    for _ in range(n):
        total += nested_countdown(n - 1)
    return total
""", ("O(n²)", "O(2ⁿ)", "O(n!)", "O(nⁿ)"), 2,
        "A call at size n makes n calls of size n − 1. Expanding gives n · (n − 1) · … · 1 = n! recursive leaves."),
    Q("AO050", "Factorial", "intermediate", PROMPT, """
def print_orderings(prefix, remaining):
    if not remaining:
        print(prefix)
        return
    for index, item in enumerate(remaining):
        print_orderings(prefix + [item], remaining[:index] + remaining[index + 1:])
""", ("O(n log n)", "O(n²)", "O(2ⁿ)", "O(n!)"), 3,
        "Each path through the recursion consumes one unused item. The leaves are the n! permutations of remaining when prefix starts empty."),
]

QUESTION_BY_ID = {question["id"]: question for question in QUESTIONS}
