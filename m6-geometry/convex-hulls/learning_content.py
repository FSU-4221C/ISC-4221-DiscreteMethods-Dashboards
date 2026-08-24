"""Instructional copy for the convex-hull lab."""

LEARNING_OBJECTIVES = (
    "Build a point set by clicking a canvas.",
    "Read the convex hull as the unique convex polygon containing every point.",
    "Separate hull vertices from strictly interior points.",
    "Count hull vertices from the same model used by the drawing.",
)

SECTIONS = {
    "hull": {
        "title": "1 · Click to grow a point set",
        "objective": "Objective: watch interior points stay interior while the hull updates.",
        "instructions": (
            "Click empty canvas to add a point (up to 16). Gold marks strictly interior points; "
            "garnet marks hull vertices. The teal polygon is Andrew's monotone chain. "
            "Clear the canvas to start over. This is a 2D teaching model of Module 6 hulls."
        ),
    }
}

PRACTICE_INTRO = (
    "These questions freeze the point set. Adding points afterward cannot silently rescore answers "
    "unless you press Use current Explore points."
)

SOURCES = (
    "ISC 4221C Module 6: points, polygons, and convex hulls.",
    "Andrew's monotone chain builds lower and upper chains in O(n log n) after sorting by x.",
)
