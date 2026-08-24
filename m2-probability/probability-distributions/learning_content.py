"""Instructional copy for the PDF and CDF dashboard."""

AUDIENCE = "Beginning ISC 4221C students in the Module 2 probability sequence"

LEARNING_OBJECTIVES = (
    "Read a continuous PDF as a density whose area, not height, is probability.",
    "Interpret F_X(x) as P(X ≤ x) on both continuous and discrete distributions.",
    "Move a probe through a distribution and report p_X(x) or P(X = k) together with the CDF.",
    "Compute E[X] from a discrete PDF, including one you invent and renormalize.",
)

SECTIONS = {
    "continuous": {
        "title": "1 · Continuous PDF and its CDF",
        "objective": "Objective: connect PDF height, the shaded area to the left, and F_X(x).",
        "instructions": (
            "Choose a named continuous family and drag the probe x, or click the PDF. "
            "The left panel is p_X(x). The shaded region is P(X ≤ x), which is exactly "
            "the CDF height on the right. For a continuous random variable P(X = x) = 0."
        ),
    },
    "discrete": {
        "title": "2 · Discrete PDF, invented masses, and expectation",
        "objective": "Objective: read P(X = k), the running sum F_X(k), and E[X] on a discrete PDF.",
        "instructions": (
            "Start from a fair die, two-dice sum, or Poisson, or invent masses on faces 1–6. "
            "The weights are renormalized so they form a PDF. Move k (or click a bar) to see "
            "the point probability and the cumulative probability up to that face."
        ),
    },
}

PRACTICE_INTRO = (
    "These questions freeze your Explore settings. Changing the plots afterward cannot "
    "silently change the scored answers unless you press Use current Explore settings."
)

SOURCES = (
    "ISC 4221C Module 2: Probability distributions, expectation, and the CDF "
    "(fair die, continuous PDF as area, F_X(x) = P(X ≤ x)).",
    "Course language uses PDF for both the discrete mass function and the continuous density.",
)
