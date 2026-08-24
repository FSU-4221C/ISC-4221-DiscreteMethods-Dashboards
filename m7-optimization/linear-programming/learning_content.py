"""Instructional copy for the linear-programming lab."""

LEARNING_OBJECTIVES = (
    "Read a two-variable LP as an objective plus linear inequalities.",
    "See the feasible region as the intersection of half-planes.",
    "Evaluate the objective at every feasible vertex.",
    "State that a bounded 2D LP attains its optimum at a vertex.",
)

SECTIONS = {
    "region": {
        "title": "1 · Feasible region and vertices",
        "objective": "Objective: find the optimum by evaluating z at every feasible vertex.",
        "instructions": (
            "Choose a word problem. Each inequality is a half-plane; their intersection is teal. "
            "Red markers are feasible vertices. The gold star is the optimum among those vertices. "
            "This is the 2D vertex principle behind the simplex method."
        ),
    }
}

PRACTICE_INTRO = (
    "These questions freeze the selected linear program. Switching problems afterward cannot "
    "silently rescore answers unless you press Use current Explore problem."
)

SOURCES = (
    "ISC 4221C Module 7: optimization modeling and basic feasible solutions.",
    "A bounded two-variable linear program attains its maximum or minimum at a vertex of the feasible region.",
)
