"""Instructional copy for the image-processing lab."""

LEARNING_OBJECTIVES = (
    "Apply a 3×3 convolution kernel and describe blur, sharpen, and Sobel X.",
    "Read a kernel as a weighted neighborhood, not as a Photoshop filter name.",
    "Label connected components on a binary image.",
    "Explain why 4-connectivity and 8-connectivity can disagree on diagonal contact.",
)

SECTIONS = {
    "convolution": {
        "title": "1 · Convolution kernels",
        "objective": "Objective: see a 3×3 kernel rewrite every pixel from its neighborhood.",
        "instructions": (
            "The source is a 32×32 teaching image: a dark left plate, a bright right plate, and two "
            "squares that touch only at a corner. Choose identity, box blur, sharpen, or Sobel X. "
            "No upload is required."
        ),
    },
    "components": {
        "title": "2 · Connected components, 4 versus 8",
        "objective": "Objective: count blobs after thresholding, then change what 'neighbor' means.",
        "instructions": (
            "Pixels at or above 200 are foreground. 4-connectivity uses up/down/left/right. "
            "8-connectivity also uses diagonals. The two squares are the counterexample."
        ),
    },
}

PRACTICE_INTRO = (
    "These questions freeze the kernel and connectivity. Changing Explore afterward cannot "
    "silently rescore answers unless you press Use current Explore settings."
)

SOURCES = (
    "ISC 4221C Module 4: image representation, filtering by convolution, and connected components.",
    "The synthetic image is a teaching fixture so 4- versus 8-connectivity is reproducible.",
)
