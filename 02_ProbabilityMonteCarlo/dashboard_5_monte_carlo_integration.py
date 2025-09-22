"""
Interactive Dashboard 5: Monte Carlo Integration Explorer
Topic: Monte Carlo integration and curse of dimensionality
"""

import dash
from dash import dcc, html, Input, Output, State, callback_context
import dash_bootstrap_components as dbc
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import List, Dict, Tuple, Any, Callable
import pandas as pd
from dash.exceptions import PreventUpdate
import scipy.integrate as integrate
from scipy.stats import norm

# Initialize the Dash app with Bootstrap
app = dash.Dash(__name__, title="Monte Carlo Integration Explorer", 
                external_stylesheets=[dbc.themes.BOOTSTRAP])
app.config.suppress_callback_exceptions = True

# Define available functions
FUNCTIONS = {
    "sin(x)": {
        "func": lambda x: np.sin(x),
        "domain": (0, np.pi),
        "analytical": 2.0,
        "description": "sin(x) from 0 to π"
    },
    "x²": {
        "func": lambda x: x**2,
        "domain": (0, 2),
        "analytical": 8/3,
        "description": "x² from 0 to 2"
    },
    "exp(-x²)": {
        "func": lambda x: np.exp(-x**2),
        "domain": (0, 2),
        "analytical": 0.8820813907624215,  # Approximate
        "description": "exp(-x²) from 0 to 2"
    },
    "1/(1+x²)": {
        "func": lambda x: 1/(1+x**2),
        "domain": (0, 1),
        "analytical": np.pi/4,
        "description": "1/(1+x²) from 0 to 1"
    },
    "sqrt(1-x²)": {
        "func": lambda x: np.sqrt(1-x**2),
        "domain": (0, 1),
        "analytical": np.pi/4,
        "description": "sqrt(1-x²) from 0 to 1 (quarter circle)"
    }
}

def monte_carlo_1d(func: Callable, domain: Tuple[float, float], n_samples: int) -> Dict[str, float]:
    """Perform 1D Monte Carlo integration."""
    a, b = domain
    width = b - a
    
    # Generate random points
    x_samples = np.random.uniform(a, b, n_samples)
    y_samples = func(x_samples)
    
    # Calculate integral estimate
    integral_estimate = width * np.mean(y_samples)
    
    # Calculate error estimate
    sample_std = np.std(y_samples)
    error_estimate = width * sample_std / np.sqrt(n_samples)
    
    return {
        'integral': integral_estimate,
        'error': error_estimate,
        'samples': x_samples,
        'values': y_samples
    }

def monte_carlo_2d(func: Callable, domain: Tuple[Tuple[float, float], Tuple[float, float]], n_samples: int) -> Dict[str, float]:
    """Perform 2D Monte Carlo integration."""
    (a, b), (c, d) = domain
    area = (b - a) * (d - c)
    
    # Generate random points
    x_samples = np.random.uniform(a, b, n_samples)
    y_samples = np.random.uniform(c, d, n_samples)
    z_samples = func(x_samples, y_samples)
    
    # Calculate integral estimate
    integral_estimate = area * np.mean(z_samples)
    
    # Calculate error estimate
    sample_std = np.std(z_samples)
    error_estimate = area * sample_std / np.sqrt(n_samples)
    
    return {
        'integral': integral_estimate,
        'error': error_estimate,
        'x_samples': x_samples,
        'y_samples': y_samples,
        'z_samples': z_samples
    }

def monte_carlo_nd(func: Callable, domain: List[Tuple[float, float]], n_samples: int) -> Dict[str, float]:
    """Perform n-dimensional Monte Carlo integration."""
    # Calculate volume
    volume = 1.0
    for a, b in domain:
        volume *= (b - a)
    
    # Generate random points
    samples = []
    for a, b in domain:
        samples.append(np.random.uniform(a, b, n_samples))
    
    # Evaluate function
    values = func(*samples)
    
    # Calculate integral estimate
    integral_estimate = volume * np.mean(values)
    
    # Calculate error estimate
    sample_std = np.std(values)
    error_estimate = volume * sample_std / np.sqrt(n_samples)
    
    return {
        'integral': integral_estimate,
        'error': error_estimate,
        'volume': volume
    }

def trapezoidal_rule(func: Callable, domain: Tuple[float, float], n_points: int) -> float:
    """Calculate integral using trapezoidal rule."""
    a, b = domain
    x = np.linspace(a, b, n_points)
    y = func(x)
    
    h = (b - a) / (n_points - 1)
    integral = h * (0.5 * y[0] + np.sum(y[1:-1]) + 0.5 * y[-1])
    
    return integral

def simpson_rule(func: Callable, domain: Tuple[float, float], n_points: int) -> float:
    """Calculate integral using Simpson's rule."""
    a, b = domain
    x = np.linspace(a, b, n_points)
    y = func(x)
    
    h = (b - a) / (n_points - 1)
    integral = h/3 * (y[0] + 4*np.sum(y[1::2]) + 2*np.sum(y[2::2]) + y[-1])
    
    return integral

def create_function_plot(func_name: str, domain: Tuple[float, float], mc_result: Dict = None) -> go.Figure:
    """Create plot of function and Monte Carlo samples."""
    func_info = FUNCTIONS[func_name]
    func = func_info["func"]
    a, b = domain
    
    # Create function plot
    x_plot = np.linspace(a, b, 1000)
    y_plot = func(x_plot)
    
    fig = go.Figure()
    
    # Plot function
    fig.add_trace(go.Scatter(
        x=x_plot,
        y=y_plot,
        mode='lines',
        name='Function',
        line=dict(color='blue', width=2)
    ))
    
    # Plot Monte Carlo samples if available
    if mc_result and 'samples' in mc_result:
        fig.add_trace(go.Scatter(
            x=mc_result['samples'],
            y=mc_result['values'],
            mode='markers',
            name='MC Samples',
            marker=dict(color='red', size=3, opacity=0.6)
        ))
    
    fig.update_layout(
        title=f"Function: {func_info['description']}",
        xaxis_title="x",
        yaxis_title="f(x)",
        showlegend=True
    )
    
    return fig

def create_2d_function_plot(func_name: str, domain: Tuple[Tuple[float, float], Tuple[float, float]], mc_result: Dict = None) -> go.Figure:
    """Create 3D plot of 2D function and Monte Carlo samples."""
    if func_name == "Circle":
        func = lambda x, y: (x**2 + y**2 <= 1).astype(float)
        (a, b), (c, d) = domain
        
        # Create surface plot
        x = np.linspace(a, b, 50)
        y = np.linspace(c, d, 50)
        X, Y = np.meshgrid(x, y)
        Z = func(X, Y)
        
        fig = go.Figure()
        
        # Add surface
        fig.add_trace(go.Surface(
            x=X, y=Y, z=Z,
            colorscale='Viridis',
            opacity=0.7,
            name='Function'
        ))
        
        # Add Monte Carlo samples if available
        if mc_result and 'x_samples' in mc_result:
            fig.add_trace(go.Scatter3d(
                x=mc_result['x_samples'],
                y=mc_result['y_samples'],
                z=mc_result['z_samples'],
                mode='markers',
                marker=dict(size=2, color='red', opacity=0.6),
                name='MC Samples'
            ))
        
        fig.update_layout(
            title="2D Function: Unit Circle",
            scene=dict(
                xaxis_title="x",
                yaxis_title="y",
                zaxis_title="f(x,y)"
            )
        )
    
    return fig

def create_convergence_plot(integral_estimates: List[float], analytical_value: float, sample_sizes: List[int]) -> go.Figure:
    """Create convergence plot showing how Monte Carlo estimate approaches analytical value."""
    fig = go.Figure()
    
    # Plot Monte Carlo estimates
    fig.add_trace(go.Scatter(
        x=sample_sizes,
        y=integral_estimates,
        mode='lines+markers',
        name='Monte Carlo Estimate',
        line=dict(color='blue')
    ))
    
    # Plot analytical value
    fig.add_trace(go.Scatter(
        x=sample_sizes,
        y=[analytical_value] * len(sample_sizes),
        mode='lines',
        name='Analytical Value',
        line=dict(color='red', dash='dash')
    ))
    
    fig.update_layout(
        title="Monte Carlo Convergence",
        xaxis_title="Number of Samples",
        yaxis_title="Integral Estimate",
        xaxis_type="log",
        showlegend=True
    )
    
    return fig

def create_error_plot(errors: List[float], sample_sizes: List[int]) -> go.Figure:
    """Create error plot showing convergence rate."""
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=sample_sizes,
        y=errors,
        mode='lines+markers',
        name='Monte Carlo Error',
        line=dict(color='red')
    ))
    
    # Add theoretical 1/√n line
    theoretical_errors = [errors[0] * np.sqrt(sample_sizes[0] / n) for n in sample_sizes]
    fig.add_trace(go.Scatter(
        x=sample_sizes,
        y=theoretical_errors,
        mode='lines',
        name='Theoretical 1/√n',
        line=dict(color='green', dash='dash')
    ))
    
    fig.update_layout(
        title="Error Convergence (Log-Log Scale)",
        xaxis_title="Number of Samples",
        yaxis_title="Absolute Error",
        xaxis_type="log",
        yaxis_type="log",
        showlegend=True
    )
    
    return fig

# Define the layout
app.layout = dbc.Container([
    dbc.Row([
        dbc.Col([
            html.H1("Monte Carlo Integration Explorer", className="text-center mb-4"),
            html.P("Explore Monte Carlo integration and compare it with traditional numerical methods. Discover the curse of dimensionality!", 
                   className="text-center text-muted mb-4")
        ])
    ]),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Integration Settings"),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            dbc.Label("Function"),
                            dcc.Dropdown(
                                id="function-selector",
                                options=[{"label": k, "value": k} for k in FUNCTIONS.keys()],
                                value="sin(x)"
                            )
                        ], width=4),
                        dbc.Col([
                            dbc.Label("Number of Samples"),
                            dbc.Input(
                                id="num-samples",
                                type="number",
                                min=100,
                                max=100000,
                                step=100,
                                value=1000
                            )
                        ], width=4),
                        dbc.Col([
                            dbc.Label("Integration Method"),
                            dcc.Dropdown(
                                id="method-selector",
                                options=[
                                    {"label": "Monte Carlo", "value": "monte_carlo"},
                                    {"label": "Trapezoidal Rule", "value": "trapezoidal"},
                                    {"label": "Simpson's Rule", "value": "simpson"}
                                ],
                                value="monte_carlo"
                            )
                        ], width=4)
                    ], className="mb-3"),
                    
                    dbc.Row([
                        dbc.Col([
                            dbc.Button("Calculate Integral", id="calculate-btn", color="primary", className="me-2"),
                            dbc.Button("Convergence Analysis", id="convergence-btn", color="success")
                        ])
                    ])
                ])
            ])
        ])
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Integration Results"),
                dbc.CardBody([
                    html.Div(id="integration-results")
                ])
            ])
        ], width=6),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Method Comparison"),
                dbc.CardBody([
                    html.Div(id="method-comparison")
                ])
            ])
        ], width=6)
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Function Visualization"),
                dbc.CardBody([
                    dcc.Graph(id="function-plot")
                ])
            ])
        ])
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Convergence Analysis"),
                dbc.CardBody([
                    dcc.Graph(id="convergence-plot")
                ])
            ])
        ], width=6),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Error Analysis"),
                dbc.CardBody([
                    dcc.Graph(id="error-plot")
                ])
            ])
        ], width=6)
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Curse of Dimensionality"),
                dbc.CardBody([
                    html.H6("High-Dimensional Integration"),
                    html.P("Monte Carlo methods become more efficient than traditional methods in high dimensions."),
                    dbc.Row([
                        dbc.Col([
                            dbc.Label("Dimensions"),
                            dbc.Input(
                                id="dimensions",
                                type="number",
                                min=1,
                                max=10,
                                value=3
                            )
                        ], width=4),
                        dbc.Col([
                            dbc.Label("Samples per Dimension"),
                            dbc.Input(
                                id="samples-per-dim",
                                type="number",
                                min=10,
                                max=1000,
                                value=100
                            )
                        ], width=4),
                        dbc.Col([
                            dbc.Button("Compare Methods", id="dimensionality-btn", color="info", className="mt-4")
                        ], width=4)
                    ]),
                    html.Div(id="dimensionality-results")
                ])
            ])
        ])
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Dynamic Problem"),
                dbc.CardBody([
                    html.H5("Challenge: Find the Dimension Where Monte Carlo Becomes More Efficient"),
                    html.P("1. Start with 1D integration and compare Monte Carlo vs Trapezoidal rule"),
                    html.P("2. Increase dimensions and observe how Monte Carlo maintains efficiency"),
                    html.P("3. Find the dimension where Monte Carlo becomes faster than traditional methods"),
                    html.P("4. Explain why this happens (curse of dimensionality)"),
                    html.Div(id="challenge-status")
                ])
            ])
        ])
    ])
], fluid=True)

@app.callback(
    [Output("integration-results", "children"),
     Output("method-comparison", "children"),
     Output("function-plot", "figure")],
    [Input("calculate-btn", "n_clicks")],
    [State("function-selector", "value"),
     State("num-samples", "value"),
     State("method-selector", "value")]
)
def calculate_integral(n_clicks: int, func_name: str, num_samples: int, method: str) -> Tuple[List, List, go.Figure]:
    """Calculate integral using selected method."""
    if n_clicks is None:
        return ["Click 'Calculate Integral' to see results"], [""], go.Figure()
    
    if func_name is None or num_samples is None or method is None:
        return ["Please select all parameters"], [""], go.Figure()
    
    func_info = FUNCTIONS[func_name]
    func = func_info["func"]
    domain = func_info["domain"]
    analytical = func_info["analytical"]
    
    # Calculate integral using selected method
    if method == "monte_carlo":
        result = monte_carlo_1d(func, domain, num_samples)
        integral_estimate = result['integral']
        error_estimate = result['error']
        mc_result = result
    elif method == "trapezoidal":
        integral_estimate = trapezoidal_rule(func, domain, num_samples)
        error_estimate = abs(integral_estimate - analytical)
        mc_result = None
    elif method == "simpson":
        integral_estimate = simpson_rule(func, domain, num_samples)
        error_estimate = abs(integral_estimate - analytical)
        mc_result = None
    
    # Create results display
    results = [
        html.H6(f"Method: {method.title()}"),
        html.P(f"Integral Estimate: {integral_estimate:.6f}"),
        html.P(f"Analytical Value: {analytical:.6f}"),
        html.P(f"Absolute Error: {error_estimate:.6f}"),
        html.P(f"Relative Error: {error_estimate/analytical*100:.2f}%"),
        html.P(f"Number of Samples: {num_samples}")
    ]
    
    # Compare all methods
    mc_result_all = monte_carlo_1d(func, domain, num_samples)
    trap_result = trapezoidal_rule(func, domain, num_samples)
    simp_result = simpson_rule(func, domain, num_samples)
    
    comparison = [
        html.H6("Method Comparison:"),
        html.P(f"Monte Carlo: {mc_result_all['integral']:.6f} (error: {abs(mc_result_all['integral'] - analytical):.6f})"),
        html.P(f"Trapezoidal: {trap_result:.6f} (error: {abs(trap_result - analytical):.6f})"),
        html.P(f"Simpson's: {simp_result:.6f} (error: {abs(simp_result - analytical):.6f})"),
        html.P(f"Analytical: {analytical:.6f}")
    ]
    
    # Create function plot
    func_plot = create_function_plot(func_name, domain, mc_result)
    
    return results, comparison, func_plot

@app.callback(
    [Output("convergence-plot", "figure"),
     Output("error-plot", "figure")],
    [Input("convergence-btn", "n_clicks")],
    [State("function-selector", "value")]
)
def convergence_analysis(n_clicks: int, func_name: str) -> Tuple[go.Figure, go.Figure]:
    """Perform convergence analysis."""
    if n_clicks is None or func_name is None:
        return go.Figure(), go.Figure()
    
    func_info = FUNCTIONS[func_name]
    func = func_info["func"]
    domain = func_info["domain"]
    analytical = func_info["analytical"]
    
    # Test different sample sizes
    sample_sizes = [100, 200, 500, 1000, 2000, 5000, 10000]
    integral_estimates = []
    errors = []
    
    for n in sample_sizes:
        result = monte_carlo_1d(func, domain, n)
        integral_estimates.append(result['integral'])
        errors.append(abs(result['integral'] - analytical))
    
    # Create plots
    conv_plot = create_convergence_plot(integral_estimates, analytical, sample_sizes)
    err_plot = create_error_plot(errors, sample_sizes)
    
    return conv_plot, err_plot

@app.callback(
    Output("dimensionality-results", "children"),
    [Input("dimensionality-btn", "n_clicks")],
    [State("dimensions", "value"),
     State("samples-per-dim", "value")]
)
def dimensionality_analysis(n_clicks: int, dimensions: int, samples_per_dim: int) -> List:
    """Analyze curse of dimensionality."""
    if n_clicks is None or dimensions is None or samples_per_dim is None:
        return ["Click 'Compare Methods' to see results"]
    
    # Simple test function: product of cosines
    def test_func(*args):
        return np.prod([np.cos(x) for x in args])
    
    # Domain for each dimension
    domain = [(0, np.pi/2) for _ in range(dimensions)]
    
    # Monte Carlo integration
    mc_result = monte_carlo_nd(test_func, domain, samples_per_dim)
    
    # Traditional method would require (samples_per_dim)^dimensions points
    traditional_points = samples_per_dim ** dimensions
    
    return [
        html.H6(f"Dimensions: {dimensions}"),
        html.P(f"Monte Carlo samples: {samples_per_dim}"),
        html.P(f"Traditional method points needed: {traditional_points:,}"),
        html.P(f"Monte Carlo estimate: {mc_result['integral']:.6f}"),
        html.P(f"Error estimate: {mc_result['error']:.6f}"),
        html.Hr(),
        html.P(f"Efficiency ratio: {traditional_points / samples_per_dim:.1f}x fewer points needed!"),
        html.P("This demonstrates why Monte Carlo is preferred in high dimensions.")
    ]

@app.callback(
    Output("challenge-status", "children"),
    [Input("dimensionality-btn", "n_clicks")],
    [State("dimensions", "value")]
)
def update_challenge_status(n_clicks: int, dimensions: int) -> str:
    """Update challenge status."""
    if n_clicks is None:
        return "Start by comparing 1D methods, then increase dimensions to see the curse of dimensionality!"
    
    if dimensions >= 5:
        return dbc.Alert("🎯 Excellent! You've discovered that Monte Carlo becomes much more efficient in high dimensions due to the curse of dimensionality!", color="success")
    elif dimensions >= 3:
        return dbc.Alert("Good progress! You can see Monte Carlo is becoming more efficient. Try even higher dimensions!", color="info")
    else:
        return "Keep increasing dimensions to see when Monte Carlo becomes more efficient than traditional methods!"

if __name__ == "__main__":
    app.run(debug=True, port=8053)
