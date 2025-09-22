"""
Random Number Generation Comparison: randint vs rand vs randn

This script demonstrates the differences between three types of random number generators:
1. randint: Discrete uniform distribution (integers)
2. rand: Continuous uniform distribution (floats between 0 and 1)
3. randn: Normal/Gaussian distribution (mean=0, std=1)

Each generator is used to create 200 2D points and displayed as scatter plots.
"""
# %%

import numpy as np
import matplotlib.pyplot as plt
from typing import Tuple


def generate_randint_points(n_points: int = 200, x_range: Tuple[int, int] = (0, 10), 
                          y_range: Tuple[int, int] = (0, 10)) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate 2D points using numpy.random.randint (discrete uniform distribution).
    
    Args:
        n_points: Number of points to generate
        x_range: Tuple of (min, max) for x coordinates
        y_range: Tuple of (min, max) for y coordinates
    
    Returns:
        Tuple of (x_coords, y_coords) arrays
    """
    x_coords = np.random.randint(x_range[0], x_range[1] + 1, size=n_points)
    y_coords = np.random.randint(y_range[0], y_range[1] + 1, size=n_points)
    return x_coords, y_coords


def generate_rand_points(n_points: int = 200, x_range: Tuple[float, float] = (0, 10), 
                        y_range: Tuple[float, float] = (0, 10)) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate 2D points using numpy.random.rand (continuous uniform distribution).
    
    Args:
        n_points: Number of points to generate
        x_range: Tuple of (min, max) for x coordinates
        y_range: Tuple of (min, max) for y coordinates
    
    Returns:
        Tuple of (x_coords, y_coords) arrays
    """
    x_coords = np.random.rand(n_points) * (x_range[1] - x_range[0]) + x_range[0]
    y_coords = np.random.rand(n_points) * (y_range[1] - y_range[0]) + y_range[0]
    return x_coords, y_coords


def generate_randn_points(n_points: int = 200, center: Tuple[float, float] = (5, 5), 
                         scale: float = 2.0) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate 2D points using numpy.random.randn (normal/Gaussian distribution).
    
    Args:
        n_points: Number of points to generate
        center: Tuple of (x_center, y_center) for the distribution center
        scale: Standard deviation scale factor
    
    Returns:
        Tuple of (x_coords, y_coords) arrays
    """
    x_coords = np.random.randn(n_points) * scale + center[0]
    y_coords = np.random.randn(n_points) * scale + center[1]
    return x_coords, y_coords


def create_comparison_plot() -> None:
    """
    Create a figure with 3 subplots comparing randint, rand, and randn distributions.
    """
    # Set random seed for reproducibility
    np.random.seed(42)
    total_points = 500 # number of points to generate for each distribution
    
    # Generate points for each distribution
    x_randint, y_randint = generate_randint_points(total_points, (0, 10), (0, 10))
    x_rand, y_rand = generate_rand_points(total_points, (0, 10), (0, 10))
    x_randn, y_randn = generate_randn_points(total_points, (5, 5), 2.0)
    
    # Create figure with 3 subplots
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    fig.suptitle('Random Number Generator Comparison (200 points each)', fontsize=16, fontweight='bold')
    
    # Plot 1: randint (discrete uniform)
    axes[0].scatter(x_randint, y_randint, alpha=0.6, s=30, c='blue', edgecolors='black', linewidth=0.5)
    axes[0].set_title('randint: Discrete Uniform Distribution\n(Integers from 0 to 10)', fontweight='bold')
    axes[0].set_xlabel('X coordinate')
    axes[0].set_ylabel('Y coordinate')
    axes[0].grid(True, alpha=0.3)
    axes[0].set_xlim(-0.5, 10.5)
    axes[0].set_ylim(-0.5, 10.5)
    axes[0].set_aspect('equal')
    
    # Plot 2: rand (continuous uniform)
    axes[1].scatter(x_rand, y_rand, alpha=0.6, s=30, c='red', edgecolors='black', linewidth=0.5)
    axes[1].set_title('rand: Continuous Uniform Distribution\n(Floats from 0 to 10)', fontweight='bold')
    axes[1].set_xlabel('X coordinate')
    axes[1].set_ylabel('Y coordinate')
    axes[1].grid(True, alpha=0.3)
    axes[1].set_xlim(-0.5, 10.5)
    axes[1].set_ylim(-0.5, 10.5)
    axes[1].set_aspect('equal')
    
    # Plot 3: randn (normal/Gaussian)
    axes[2].scatter(x_randn, y_randn, alpha=0.6, s=30, c='green', edgecolors='black', linewidth=0.5)
    axes[2].set_title('randn: Normal/Gaussian Distribution\n(Mean=5, Std=2)', fontweight='bold')
    axes[2].set_xlabel('X coordinate')
    axes[2].set_ylabel('Y coordinate')
    axes[2].grid(True, alpha=0.3)
    axes[2].set_xlim(-0.5, 10.5)
    axes[2].set_ylim(-0.5, 10.5)
    axes[2].set_aspect('equal')
    
    # Adjust layout and save the plot
    plt.tight_layout()
    plt.savefig('random_number_comparison.png', dpi=300, bbox_inches='tight')
    print("Plot saved as 'random_number_comparison.png'")
    plt.show()
    
    # Print summary statistics
    print("Summary Statistics:")
    print("=" * 50)
    print(f"randint - X: min={x_randint.min():.1f}, max={x_randint.max():.1f}, mean={x_randint.mean():.2f}")
    print(f"randint - Y: min={y_randint.min():.1f}, max={y_randint.max():.1f}, mean={y_randint.mean():.2f}")
    print()
    print(f"rand    - X: min={x_rand.min():.2f}, max={x_rand.max():.2f}, mean={x_rand.mean():.2f}")
    print(f"rand    - Y: min={y_rand.min():.2f}, max={y_rand.max():.2f}, mean={y_rand.mean():.2f}")
    print()
    print(f"randn   - X: min={x_randn.min():.2f}, max={x_randn.max():.2f}, mean={x_randn.mean():.2f}")
    print(f"randn   - Y: min={y_randn.min():.2f}, max={y_randn.max():.2f}, mean={y_randn.mean():.2f}")


if __name__ == "__main__":
    create_comparison_plot()

# %%
