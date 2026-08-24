"""Synthetic-image convolution and connected-components teaching models."""

from __future__ import annotations

from typing import Any

import numpy as np

KERNELS: dict[str, dict[str, Any]] = {
    "identity": {
        "label": "Identity",
        "matrix": np.array([[0, 0, 0], [0, 1, 0], [0, 0, 0]], dtype=float),
    },
    "box": {
        "label": "Box blur",
        "matrix": np.ones((3, 3), dtype=float) / 9.0,
    },
    "sharpen": {
        "label": "Sharpen",
        "matrix": np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=float),
    },
    "sobel_x": {
        "label": "Sobel X (vertical edges)",
        "matrix": np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=float),
    },
}


def default_state() -> dict[str, Any]:
    """Start with a sharpening kernel and 4-connectivity."""

    return normalize_state({"kernel": "sharpen", "connectivity": 4})


def normalize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Validate kernel name and 4/8 connectivity."""

    raw = raw or {}
    kernel = str(raw.get("kernel", "sharpen"))
    if kernel not in KERNELS:
        kernel = "sharpen"
    connectivity = int(raw.get("connectivity", 4))
    if connectivity not in {4, 8}:
        connectivity = 4
    return {"kernel": kernel, "connectivity": connectivity}


def source_image() -> np.ndarray:
    """Return a 32×32 grayscale scene: left plate, right plate, two diagonal squares."""

    image = np.full((32, 32), 40.0)
    image[:, 16:] = 180.0
    image[4:10, 4:10] = 220.0
    image[10:16, 10:16] = 220.0
    return image


def convolve(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Valid-style 3×3 convolution padded by edge values, clipped to [0, 255]."""

    pad = np.pad(image, 1, mode="edge")
    rows, cols = image.shape
    result = np.zeros_like(image)
    ky, kx = kernel.shape
    for row in range(rows):
        for col in range(cols):
            patch = pad[row : row + ky, col : col + kx]
            result[row, col] = float(np.sum(patch * kernel))
    return np.clip(result, 0.0, 255.0)


def threshold_binary(image: np.ndarray, cutoff: float = 160.0) -> np.ndarray:
    """Return a 0/1 mask of bright pixels."""

    return (image >= cutoff).astype(int)


def connected_components(binary: np.ndarray, connectivity: int) -> tuple[np.ndarray, int]:
    """Label foreground blobs with 4- or 8-connectivity using DFS."""

    rows, cols = binary.shape
    labels = np.zeros((rows, cols), dtype=int)
    count = 0
    if connectivity == 8:
        deltas = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    else:
        deltas = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    def neighbors(row: int, col: int) -> list[tuple[int, int]]:
        found: list[tuple[int, int]] = []
        for dr, dc in deltas:
            nr, nc = row + dr, col + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                found.append((nr, nc))
        return found

    for row in range(rows):
        for col in range(cols):
            if binary[row, col] == 0 or labels[row, col] != 0:
                continue
            count += 1
            stack = [(row, col)]
            labels[row, col] = count
            while stack:
                cr, cc = stack.pop()
                for nr, nc in neighbors(cr, cc):
                    if binary[nr, nc] == 1 and labels[nr, nc] == 0:
                        labels[nr, nc] = count
                        stack.append((nr, nc))
    return labels, count


def convolution_query(state: dict[str, Any]) -> dict[str, Any]:
    """Convolve the synthetic scene with the selected kernel."""

    state = normalize_state(state)
    source = source_image()
    kernel = KERNELS[state["kernel"]]["matrix"]
    filtered = convolve(source, kernel)
    return {
        "kernel": state["kernel"],
        "label": KERNELS[state["kernel"]]["label"],
        "matrix": kernel.tolist(),
        "source": source,
        "filtered": filtered,
        "source_mean": float(source.mean()),
        "filtered_mean": float(filtered.mean()),
    }


def component_query(state: dict[str, Any]) -> dict[str, Any]:
    """Label the two diagonal squares under 4- or 8-connectivity."""

    state = normalize_state(state)
    binary = threshold_binary(source_image(), 200.0)
    labels, count = connected_components(binary, state["connectivity"])
    return {
        "connectivity": state["connectivity"],
        "binary": binary,
        "labels": labels,
        "count": count,
        "foreground": int(binary.sum()),
    }


def convolution_takeaway(state: dict[str, Any]) -> str:
    """Explain what the current kernel emphasizes."""

    query = convolution_query(state)
    if query["kernel"] == "box":
        return "A box blur replaces each pixel by the mean of its 3×3 neighborhood, so the vertical step at column 16 becomes a ramp."
    if query["kernel"] == "sharpen":
        return "Sharpening subtracts neighbors and boosts the center, so the plate edge and the square corners get darker/brighter rings."
    if query["kernel"] == "sobel_x":
        return "Sobel X is a discrete derivative in x. The vertical intensity jump lights up; horizontal boundaries stay quiet."
    return "The identity kernel copies the image. It is the baseline before you change neighborhood weights."


def component_takeaway(state: dict[str, Any]) -> str:
    """Explain why 4- versus 8-connectivity disagrees on diagonal squares."""

    query = component_query(state)
    if query["connectivity"] == 4:
        return (
            f"4-connectivity counts {query['count']} components. The two bright squares touch only at a corner, "
            "so they stay separate when diagonal steps are forbidden."
        )
    return (
        f"8-connectivity counts {query['count']} component(s). A corner-adjacent pixel is a neighbor, "
        "so the same two squares merge. Connectivity is a definition, not a property of the pixels alone."
    )
