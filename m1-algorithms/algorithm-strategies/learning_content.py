"""Instructional copy for the algorithm-strategies lab."""

LEARNING_OBJECTIVES = (
    "Count sequential-search probes versus binary-search midpoints on a sorted list.",
    "State the sorted-data prerequisite that makes binary search legal.",
    "Run a greedy coin changer and compare it with a fewest-coin (DP) solution.",
    "Exhibit a coin system where the greedy choice is not optimal.",
)

SECTIONS = {
    "search": {
        "title": "1 · Sequential search versus binary search",
        "objective": "Objective: watch binary search discard half the remaining keys at each midpoint.",
        "instructions": (
            "The array is the sorted keys 1…n. Choose n and a target. Sequential search walks "
            "from the left. Binary search jumps to the midpoint of the live interval. Both "
            "algorithms are correct here because the data are already sorted."
        ),
    },
    "coins": {
        "title": "2 · Greedy coin change versus fewest coins",
        "objective": "Objective: test when taking the largest feasible coin yields a minimum-size solution.",
        "instructions": (
            "US coins {25, 10, 5, 1} are a system where greedy is always optimal. The "
            "counterexample {4, 3, 1} is not: for amount 6, greedy takes 4+1+1 while two "
            "3's are better. The dashboard computes both."
        ),
    },
}

PRACTICE_INTRO = (
    "These questions freeze your Explore settings. Changing n, the target, or the coin "
    "system afterward cannot silently rescore answers unless you press Use current Explore settings."
)

SOURCES = (
    "ISC 4221C Module 1: searching, greedy methods, and counterexamples to greedy optimality.",
    "Binary search requires a sorted array. The coin changer here is a teaching model of the unbounded knapsack / change-making recurrence.",
)
