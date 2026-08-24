"""Instructional copy for the algorithm-order dashboard."""

AUDIENCE = "Beginning ISC 4221C students after the Module 1 introduction to Big-O"

LEARNING_OBJECTIVES = (
    "Compare how standard complexity classes grow as the input size n increases.",
    "Explain why a log scale is needed once exponential or factorial orders appear.",
    "Classify short code snippets by the tightest standard order of their nested work.",
    "Distinguish an exact operation count from the asymptotic class it belongs to.",
)

SECTIONS = {
    "growth": {
        "title": "1 · Watch the orders grow",
        "objective": "Objective: predict which selected class pulls away as n gets large.",
        "instructions": (
            "Select the orders you want on the plot, then drag n. Add a custom expression "
            "such as n**4, sqrt(n), or 1/log(n) to test a class that is not in the preset list. "
            "log(n) means log₂(n), matching the course convention."
        ),
        "takeaway_fallback": (
            "Once n is large enough, the class farther to the right in "
            "n < n log n < n² < n³ < 2ⁿ < n! stays more expensive and does not switch back."
        ),
    },
    "snapshot": {
        "title": "2 · Cost at this n",
        "objective": "Objective: translate a growth class into an operation count and a 1 ns duration.",
        "instructions": (
            "The bars use the same selected orders and the same n as the growth plot. "
            "This is a teaching model of operation counts, not a measured runtime on a particular machine."
        ),
        "takeaway_fallback": (
            "A quadratic that is only twice as expensive as a linear scan at n = 2 becomes "
            "a thousand times more expensive at n = 1,000."
        ),
    },
}

PRACTICE_INTRO = (
    "The first three questions freeze your Explore settings so later plot changes cannot "
    "silently change those answers. The snippet session is a separate bank of 50 short programs; "
    "choose the tightest standard order for the work that grows with n."
)

SNIPPET_STRATEGY = (
    ("Count the loops", "A loop to n is linear. A loop inside a loop, both to n, is quadratic."),
    ("Constants stay constants", "range(100) or three sequential loops of length n do not change the class."),
    ("Halving is logarithmic", "i *= 2 or i //= 2 until you pass n counts doublings: O(log n)."),
    ("Exact count vs class", "n(n − 1)/2 is still O(n²). Drop lower-order terms after you have counted."),
)

SOURCES = (
    "ISC 4221C Module 1: Algorithm Design and Analysis, asymptotic ordering n < n log n < n² < n³ < 2ⁿ < n!.",
    "Course thread: Algorithm complexity comparator — one class, one algorithm, one module.",
)
