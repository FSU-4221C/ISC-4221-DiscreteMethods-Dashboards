"""
Interactive Dashboard 3: Random Number Generator Laboratory
Topic: Random number generation and quality analysis
"""

import dash
from dash import dcc, html, Input, Output, State, callback_context
import dash_bootstrap_components as dbc
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import List, Dict, Tuple, Any
import pandas as pd
from dash.exceptions import PreventUpdate
import time
import hashlib

# Initialize the Dash app with Bootstrap
app = dash.Dash(__name__, title="Random Number Generator Laboratory", 
                external_stylesheets=[dbc.themes.BOOTSTRAP])
app.config.suppress_callback_exceptions = True

class BadPRNG:
    """A deliberately bad pseudo-random number generator for educational purposes."""
    
    def __init__(self, seed: int = 1):
        self.seed = seed
        self.current = seed
    
    def random(self) -> float:
        """Generate next 'random' number using a bad algorithm."""
        # Linear congruential generator with poor parameters
        self.current = (self.current * 7 + 3) % 1000
        return self.current / 1000.0

class BetterPRNG:
    """A better pseudo-random number generator."""
    
    def __init__(self, seed: int = 1):
        self.seed = seed
        self.current = seed
    
    def random(self) -> float:
        """Generate next random number using a better algorithm."""
        # Better linear congruential generator
        self.current = (self.current * 1664525 + 1013904223) % (2**32)
        return self.current / (2**32)

def generate_random_sequence(method: str, num_samples: int, seed: int = None) -> List[float]:
    """Generate a sequence of random numbers using specified method."""
    if seed is None:
        seed = int(time.time()) % 10000
    
    if method == "NumPy (Mersenne Twister)":
        np.random.seed(seed)
        return np.random.random(num_samples).tolist()
    elif method == "Bad PRNG":
        rng = BadPRNG(seed)
        return [rng.random() for _ in range(num_samples)]
    elif method == "Better PRNG":
        rng = BetterPRNG(seed)
        return [rng.random() for _ in range(num_samples)]
    elif method == "System Time":
        # Use system time as source of randomness
        return [(time.time() * 1000000) % 1 for _ in range(num_samples)]
    else:
        return []

def chi_square_test(data: List[float], num_bins: int = 10) -> Dict[str, float]:
    """Perform chi-square test for uniformity."""
    # Create bins
    bins = np.linspace(0, 1, num_bins + 1)
    observed, _ = np.histogram(data, bins=bins)
    expected = len(data) / num_bins
    
    # Calculate chi-square statistic
    chi_square = np.sum((observed - expected)**2 / expected)
    p_value = 1 - chi_square_cdf(chi_square, num_bins - 1)
    
    return {
        'chi_square': chi_square,
        'p_value': p_value,
        'is_uniform': p_value > 0.05
    }

def chi_square_cdf(x: float, df: int) -> float:
    """Approximate chi-square CDF using normal approximation for large df."""
    if df > 30:
        # Normal approximation
        z = (x - df) / np.sqrt(2 * df)
        return 0.5 * (1 + np.sign(z) * np.sqrt(1 - np.exp(-2 * z**2 / np.pi)))
    else:
        # Simple approximation for small df
        return min(1.0, x / (df + 2))

def runs_test(data: List[float]) -> Dict[str, float]:
    """Perform runs test for randomness."""
    # Convert to binary sequence (above/below median)
    median = np.median(data)
    binary = [1 if x > median else 0 for x in data]
    
    # Count runs
    runs = 1
    for i in range(1, len(binary)):
        if binary[i] != binary[i-1]:
            runs += 1
    
    # Expected runs and variance
    n1 = sum(binary)  # Number of 1s
    n2 = len(binary) - n1  # Number of 0s
    expected_runs = (2 * n1 * n2) / (n1 + n2) + 1
    variance = (2 * n1 * n2 * (2 * n1 * n2 - n1 - n2)) / ((n1 + n2)**2 * (n1 + n2 - 1))
    
    # Z-score
    z_score = (runs - expected_runs) / np.sqrt(variance) if variance > 0 else 0
    p_value = 2 * (1 - normal_cdf(abs(z_score)))
    
    return {
        'runs': runs,
        'expected_runs': expected_runs,
        'z_score': z_score,
        'p_value': p_value,
        'is_random': p_value > 0.05
    }

def normal_cdf(x: float) -> float:
    """Approximate normal CDF."""
    return 0.5 * (1 + np.sign(x) * np.sqrt(1 - np.exp(-2 * x**2 / np.pi)))

def autocorrelation_test(data: List[float], lag: int = 1) -> Dict[str, float]:
    """Test for autocorrelation at given lag."""
    if len(data) <= lag:
        return {'autocorr': 0, 'is_independent': True}
    
    # Calculate autocorrelation
    x = np.array(data[:-lag])
    y = np.array(data[lag:])
    
    if len(x) == 0:
        return {'autocorr': 0, 'is_independent': True}
    
    corr = np.corrcoef(x, y)[0, 1]
    if np.isnan(corr):
        corr = 0
    
    # Test significance (rough approximation)
    n = len(x)
    se = 1 / np.sqrt(n)
    z_score = corr / se
    p_value = 2 * (1 - normal_cdf(abs(z_score)))
    
    return {
        'autocorr': corr,
        'z_score': z_score,
        'p_value': p_value,
        'is_independent': p_value > 0.05
    }

def create_histogram(data: List[float], title: str) -> go.Figure:
    """Create histogram of random numbers."""
    fig = go.Figure()
    
    fig.add_trace(go.Histogram(
        x=data,
        nbinsx=20,
        name=title,
        opacity=0.7
    ))
    
    fig.update_layout(
        title=title,
        xaxis_title="Value",
        yaxis_title="Frequency",
        showlegend=False
    )
    
    return fig

def create_scatter_plot(data: List[float], title: str) -> go.Figure:
    """Create scatter plot showing consecutive pairs."""
    if len(data) < 2:
        return go.Figure()
    
    x = data[:-1]
    y = data[1:]
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=x,
        y=y,
        mode='markers',
        marker=dict(size=4, opacity=0.6),
        name=title
    ))
    
    fig.update_layout(
        title=f"{title} - Consecutive Pairs",
        xaxis_title="X[i]",
        yaxis_title="X[i+1]",
        showlegend=False
    )
    
    return fig

def create_sequence_plot(data: List[float], title: str, max_points: int = 1000) -> go.Figure:
    """Create line plot of sequence."""
    if len(data) > max_points:
        # Sample points for visualization
        indices = np.linspace(0, len(data)-1, max_points, dtype=int)
        plot_data = [data[i] for i in indices]
        plot_indices = indices
    else:
        plot_data = data
        plot_indices = list(range(len(data)))
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=plot_indices,
        y=plot_data,
        mode='lines+markers',
        marker=dict(size=3),
        line=dict(width=1),
        name=title
    ))
    
    fig.update_layout(
        title=f"{title} - Sequence",
        xaxis_title="Index",
        yaxis_title="Value",
        showlegend=False
    )
    
    return fig

# Define the layout
app.layout = dbc.Container([
    dbc.Row([
        dbc.Col([
            html.H1("Random Number Generator Laboratory", className="text-center mb-4"),
            html.P("Compare different random number generation methods and analyze their quality using statistical tests.", 
                   className="text-center text-muted mb-4")
        ])
    ]),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Generator Settings"),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            dbc.Label("Random Number Generator"),
                            dcc.Dropdown(
                                id="rng-method",
                                options=[
                                    {"label": "NumPy (Mersenne Twister)", "value": "NumPy (Mersenne Twister)"},
                                    {"label": "Bad PRNG", "value": "Bad PRNG"},
                                    {"label": "Better PRNG", "value": "Better PRNG"},
                                    {"label": "System Time", "value": "System Time"}
                                ],
                                value="NumPy (Mersenne Twister)"
                            )
                        ], width=6),
                        dbc.Col([
                            dbc.Label("Number of Samples"),
                            dbc.Input(
                                id="num-samples",
                                type="number",
                                min=100,
                                max=10000,
                                step=100,
                                value=1000
                            )
                        ], width=3),
                        dbc.Col([
                            dbc.Label("Seed (optional)"),
                            dbc.Input(
                                id="seed-input",
                                type="number",
                                value=42
                            )
                        ], width=3)
                    ], className="mb-3"),
                    
                    dbc.Row([
                        dbc.Col([
                            dbc.Button("Generate Numbers", id="generate-btn", color="primary", className="me-2"),
                            dbc.Button("Run Statistical Tests", id="test-btn", color="success")
                        ])
                    ])
                ])
            ])
        ])
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Statistical Test Results"),
                dbc.CardBody([
                    html.Div(id="test-results")
                ])
            ])
        ], width=6),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Generator Information"),
                dbc.CardBody([
                    html.Div(id="generator-info")
                ])
            ])
        ], width=6)
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Distribution Analysis"),
                dbc.CardBody([
                    dcc.Graph(id="histogram-plot")
                ])
            ])
        ], width=6),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Sequence Analysis"),
                dbc.CardBody([
                    dcc.Graph(id="sequence-plot")
                ])
            ])
        ], width=6)
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Correlation Analysis"),
                dbc.CardBody([
                    dcc.Graph(id="scatter-plot")
                ])
            ])
        ])
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Dynamic Problem"),
                dbc.CardBody([
                    html.H5("Challenge: Design a 'Bad' PRNG and Show Why It Fails"),
                    html.P("1. Select 'Bad PRNG' and generate 1000 numbers"),
                    html.P("2. Run statistical tests and observe the failures"),
                    html.P("3. Try 'Better PRNG' and compare the results"),
                    html.P("4. Explain why the bad generator fails each test"),
                    html.Div(id="challenge-status")
                ])
            ])
        ])
    ])
], fluid=True)

@app.callback(
    [Output("test-results", "children"),
     Output("generator-info", "children"),
     Output("histogram-plot", "figure"),
     Output("sequence-plot", "figure"),
     Output("scatter-plot", "figure"),
     Output("challenge-status", "children")],
    [Input("generate-btn", "n_clicks"),
     Input("test-btn", "n_clicks")],
    [State("rng-method", "value"),
     State("num-samples", "value"),
     State("seed-input", "value")]
)
def run_analysis(generate_clicks: int, test_clicks: int, method: str, num_samples: int, seed: int) -> Tuple[List, List, go.Figure, go.Figure, go.Figure, str]:
    """Run statistical analysis on generated numbers."""
    # Check if any button was clicked
    if generate_clicks is None and test_clicks is None:
        return ["Click 'Generate Numbers' to see plots or 'Run Statistical Tests' to see results"], ["Select a generator method"], go.Figure(), go.Figure(), go.Figure(), ""
    
    if method is None or num_samples is None:
        return ["Please select a method and number of samples"], [""], go.Figure(), go.Figure(), go.Figure(), ""
    
    # Generate random numbers
    data = generate_random_sequence(method, num_samples, seed)
    
    if not data:
        return ["Error generating numbers"], [""], go.Figure(), go.Figure(), go.Figure(), ""
    
    # Only run statistical tests if the test button was clicked
    if test_clicks is not None:
        # Run statistical tests
        chi_square = chi_square_test(data)
        runs = runs_test(data)
        autocorr = autocorrelation_test(data)
    else:
        # Just show basic info for generate button
        chi_square = {'chi_square': 0, 'p_value': 0, 'is_uniform': False}
        runs = {'runs': 0, 'expected_runs': 0, 'z_score': 0, 'p_value': 0, 'is_random': False}
        autocorr = {'autocorr': 0, 'z_score': 0, 'p_value': 0, 'is_independent': False}
    
    # Create test results
    if test_clicks is not None:
        test_results = [
            html.H6("Chi-Square Test (Uniformity):"),
            html.P(f"Chi-square statistic: {chi_square['chi_square']:.3f}"),
            html.P(f"P-value: {chi_square['p_value']:.3f}"),
            html.P(f"Result: {'PASS' if chi_square['is_uniform'] else 'FAIL'} - {'Uniform' if chi_square['is_uniform'] else 'Not uniform'}"),
            html.Hr(),
            html.H6("Runs Test (Randomness):"),
            html.P(f"Number of runs: {runs['runs']}"),
            html.P(f"Expected runs: {runs['expected_runs']:.1f}"),
            html.P(f"Z-score: {runs['z_score']:.3f}"),
            html.P(f"P-value: {runs['p_value']:.3f}"),
            html.P(f"Result: {'PASS' if runs['is_random'] else 'FAIL'} - {'Random' if runs['is_random'] else 'Not random'}"),
            html.Hr(),
            html.H6("Autocorrelation Test (Independence):"),
            html.P(f"Autocorrelation (lag=1): {autocorr['autocorr']:.3f}"),
            html.P(f"Z-score: {autocorr['z_score']:.3f}"),
            html.P(f"P-value: {autocorr['p_value']:.3f}"),
            html.P(f"Result: {'PASS' if autocorr['is_independent'] else 'FAIL'} - {'Independent' if autocorr['is_independent'] else 'Dependent'}")
        ]
    else:
        test_results = [
            html.H6("Statistical Tests"),
            html.P("Click 'Run Statistical Tests' to see detailed analysis"),
            html.P("The plots below show the generated random numbers")
        ]
    
    # Generator information
    generator_info = [
        html.H6(f"Generator: {method}"),
        html.P(f"Sample size: {num_samples}"),
        html.P(f"Seed: {seed}"),
        html.Hr(),
        html.H6("Basic Statistics:"),
        html.P(f"Mean: {np.mean(data):.4f}"),
        html.P(f"Std Dev: {np.std(data):.4f}"),
        html.P(f"Min: {np.min(data):.4f}"),
        html.P(f"Max: {np.max(data):.4f}")
    ]
    
    # Create plots
    hist_fig = create_histogram(data, f"{method} - Distribution")
    seq_fig = create_sequence_plot(data, f"{method} - Sequence")
    scatter_fig = create_scatter_plot(data, f"{method} - Consecutive Pairs")
    
    # Challenge status
    if test_clicks is not None:
        if method == "Bad PRNG":
            if not chi_square['is_uniform'] or not runs['is_random'] or not autocorr['is_independent']:
                challenge_status = dbc.Alert("🎯 Good! The Bad PRNG is failing tests as expected. Try the Better PRNG to see the difference!", color="info")
            else:
                challenge_status = "The Bad PRNG is surprisingly passing tests. Try with more samples or different parameters."
        elif method == "Better PRNG":
            if chi_square['is_uniform'] and runs['is_random'] and autocorr['is_independent']:
                challenge_status = dbc.Alert("✅ Excellent! The Better PRNG passes all tests. Compare with the Bad PRNG!", color="success")
            else:
                challenge_status = "The Better PRNG is having issues. This might be due to small sample size or specific parameters."
        else:
            challenge_status = "Try the Bad PRNG first to see how it fails, then compare with Better PRNG."
    else:
        challenge_status = "Numbers generated! Now click 'Run Statistical Tests' to analyze the quality of the random numbers."
    
    return test_results, generator_info, hist_fig, seq_fig, scatter_fig, challenge_status

if __name__ == "__main__":
    app.run(debug=True, port=8052)
