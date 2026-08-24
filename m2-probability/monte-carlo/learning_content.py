"""Instructional copy for the Monte Carlo lab."""

LEARNING_OBJECTIVES = (
    "Estimate π by throwing points in a square and counting the disk hits.",
    "See that typical Monte Carlo error falls like 1/√n, not 1/n.",
    "Build a histogram of sample means and compare it with σ/√n.",
    "State that the CLT does not require the parent distribution to be Gaussian.",
)

SECTIONS = {
    "pi": {
        "title": "1 · Hit-or-miss estimate of π",
        "objective": "Objective: estimate π as four times the fraction of seeded points inside the unit disk.",
        "instructions": (
            "Points are thrown uniformly in the square [-1, 1]² with a fixed seed so Practice can "
            "score the same draw you see. The disk area is π; the square area is 4; so π̂ = 4 × (hits / n)."
        ),
    },
    "clt": {
        "title": "2 · Sample means and the central limit theorem",
        "objective": "Objective: watch the histogram of means become more Gaussian as the sample size grows.",
        "instructions": (
            "Draw many independent sample means of size n from a Uniform or Exponential parent. "
            "The CLT says those means concentrate around μ with spread σ/√n even when the parent is skewed."
        ),
    },
}

PRACTICE_INTRO = (
    "These questions freeze the seed, n, parent, and sample size. Resampling Explore afterward "
    "cannot silently rescore answers unless you press Use current Explore settings."
)

SOURCES = (
    "ISC 4221C Module 2: Monte Carlo integration and the central limit theorem.",
    "π estimate uses area ratio: disk of radius 1 inside a square of side 2. Draws are seeded for reproducibility.",
)
