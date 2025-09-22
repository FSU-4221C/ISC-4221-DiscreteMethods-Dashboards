"""
Interactive Dashboard 4: Monte Carlo π Estimator
Topic: Monte Carlo method fundamentals
"""

import dash
from dash import dcc, html, Input, Output, State, callback_context
import dash_bootstrap_components as dbc
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import List, Tuple
import math
from dash.exceptions import PreventUpdate

# Initialize the Dash app with Bootstrap
app = dash.Dash(__name__, title="Monte Carlo π Estimator", 
                external_stylesheets=[dbc.themes.BOOTSTRAP])
app.config.suppress_callback_exceptions = True

def generate_random_points(n: int) -> Tuple[List[float], List[float]]:
    """Generate n random points in the square [-1, 1] x [-1, 1]."""
    x = np.random.uniform(-1, 1, n)
    y = np.random.uniform(-1, 1, n)
    return x.tolist(), y.tolist()

def check_inside_circle(x: float, y: float) -> bool:
    """Check if point (x,y) is inside the unit circle."""
    return x**2 + y**2 <= 1

def estimate_pi(x_coords: List[float], y_coords: List[float]) -> Tuple[float, int, int]:
    """Estimate π using Monte Carlo method."""
    n_total = len(x_coords)
    n_inside = sum(1 for x, y in zip(x_coords, y_coords) if check_inside_circle(x, y))
    pi_estimate = 4 * n_inside / n_total
    return pi_estimate, n_inside, n_total

def calculate_confidence_interval(pi_estimate: float, n_total: int, confidence: float = 0.95) -> Tuple[float, float]:
    """Calculate confidence interval for π estimate."""
    # Standard error of the proportion
    p_hat = pi_estimate / 4  # proportion inside circle
    se = math.sqrt(p_hat * (1 - p_hat) / n_total)
    
    # Z-score for confidence level
    z_score = 1.96 if confidence == 0.95 else 1.645 if confidence == 0.90 else 2.576
    
    # Confidence interval for proportion
    margin = z_score * se
    ci_lower = 4 * (p_hat - margin)
    ci_upper = 4 * (p_hat + margin)
    
    return ci_lower, ci_upper

def is_pi_in_confidence_interval(ci_lower: float, ci_upper: float) -> bool:
    """Check if the true π value falls within the confidence interval."""
    return ci_lower <= math.pi <= ci_upper

def get_confidence_interval_color(ci_lower: float, ci_upper: float) -> str:
    """Get the color for the confidence interval card based on whether π is inside."""
    if is_pi_in_confidence_interval(ci_lower, ci_upper):
        return "success"  # Green - π is inside the interval
    else:
        return "danger"   # Red - π is outside the interval

def create_scatter_plot(x_coords: List[float], y_coords: List[float], n_inside: int) -> go.Figure:
    """Create scatter plot showing points inside/outside circle."""
    fig = go.Figure()
    
    # Separate points inside and outside circle
    inside_x, inside_y = [], []
    outside_x, outside_y = [], []
    
    for x, y in zip(x_coords, y_coords):
        if check_inside_circle(x, y):
            inside_x.append(x)
            inside_y.append(y)
        else:
            outside_x.append(x)
            outside_y.append(y)
    
    # Add points inside circle
    if inside_x:
        fig.add_trace(go.Scatter(
            x=inside_x, y=inside_y,
            mode='markers',
            name='Inside Circle',
            marker=dict(color='red', size=4),
            hovertemplate='(%{x:.3f}, %{y:.3f})<br>Inside<extra></extra>'
        ))
    
    # Add points outside circle
    if outside_x:
        fig.add_trace(go.Scatter(
            x=outside_x, y=outside_y,
            mode='markers',
            name='Outside Circle',
            marker=dict(color='blue', size=4),
            hovertemplate='(%{x:.3f}, %{y:.3f})<br>Outside<extra></extra>'
        ))
    
    # Add circle boundary
    theta = np.linspace(0, 2*np.pi, 100)
    circle_x = np.cos(theta)
    circle_y = np.sin(theta)
    
    fig.add_trace(go.Scatter(
        x=circle_x, y=circle_y,
        mode='lines',
        name='Circle Boundary',
        line=dict(color='black', width=2),
        showlegend=False
    ))
    
    # Add square boundary
    square_x = [-1, 1, 1, -1, -1]
    square_y = [-1, -1, 1, 1, -1]
    
    fig.add_trace(go.Scatter(
        x=square_x, y=square_y,
        mode='lines',
        name='Square Boundary',
        line=dict(color='black', width=2, dash='dash'),
        showlegend=False
    ))
    
    fig.update_layout(
        title=f"Monte Carlo π Estimation (n={len(x_coords)})",
        xaxis_title="X",
        yaxis_title="Y",
        xaxis=dict(range=[-1.1, 1.1]),
        yaxis=dict(range=[-1.1, 1.1]),
        showlegend=True,
        height=500
    )
    
    return fig

def create_convergence_plot(pi_estimates: List[float], n_points: List[int]) -> go.Figure:
    """Create convergence plot showing π estimates vs number of points."""
    fig = go.Figure()
    
    # Add π estimates
    fig.add_trace(go.Scatter(
        x=n_points,
        y=pi_estimates,
        mode='lines+markers',
        name='π Estimate',
        line=dict(color='blue', width=2),
        marker=dict(size=6)
    ))
    
    # Add true π value
    fig.add_hline(y=math.pi, line_dash="dash", line_color="red", 
                  annotation_text="True π", annotation_position="top right")
    
    fig.update_layout(
        title="Convergence of π Estimate",
        xaxis_title="Number of Points",
        yaxis_title="π Estimate",
        xaxis_type="log",
        showlegend=True,
        height=400
    )
    
    return fig

# App layout
app.layout = dbc.Container([
    # Hidden divs for storing state
    html.Div(id='x-coords', style={'display': 'none'}),
    html.Div(id='y-coords', style={'display': 'none'}),
    html.Div(id='pi-estimates', style={'display': 'none'}),
    html.Div(id='n-points-history', style={'display': 'none'}),
    
    # Header
    dbc.Row([
        dbc.Col([
            html.H1("🎯 Monte Carlo π Estimator", className="text-center mb-4"),
            html.P("Estimate π using the Monte Carlo method with random points", 
                   className="text-center text-muted")
        ])
    ]),
    
    # Main content
    dbc.Row([
        # Sidebar
        dbc.Col([
            dbc.Card([
                dbc.CardHeader([
                    html.H4("⚙️ Simulation Settings", className="mb-0")
                ]),
                dbc.CardBody([
                    html.Label("Number of Points:", className="form-label"),
                    dcc.Slider(
                        id='n-points-slider',
                        min=100,
                        max=10000,
                        step=100,
                        value=1000,
                        marks={100: '100', 1000: '1K', 5000: '5K', 10000: '10K'},
                        className="mb-3"
                    ),
                    
                    html.Label("Confidence Level:", className="form-label"),
                    dcc.Dropdown(
                        id='confidence-dropdown',
                        options=[
                            {'label': '90%', 'value': 0.90},
                            {'label': '95%', 'value': 0.95},
                            {'label': '99%', 'value': 0.99}
                        ],
                        value=0.95,
                        className="mb-3"
                    ),
                    
                    html.Hr(),
                    
                    dbc.Button("Generate New Points", id="generate-points-btn", 
                              color="primary", className="w-100 mb-2"),
                    
                    dbc.Button("Add More Points", id="add-points-btn", 
                              color="success", className="w-100"),
                    
                    html.Hr(className="my-3"),
                    
                    # Explanation text
                    html.Div([
                        html.H6("📚 How it works:", className="mb-2"),
                        html.P([
                            html.Strong("Monte Carlo Method:"), " We generate random points in a square and count how many fall inside the unit circle. The ratio of points inside to total points approximates π/4, so π ≈ 4 × (points inside) / (total points)."
                        ], className="small mb-2"),
                        html.P([
                            html.Strong("Confidence Interval:"), " We calculate the standard error of our proportion estimate and use the normal approximation to create a confidence interval around our π estimate. The interval shows the range where the true π value is likely to fall."
                        ], className="small")
                    ], className="bg-light p-2 rounded")
                ])
            ], className="h-100")
        ], width=3),
        
        # Main content area
        dbc.Col([
            dbc.Row([
                # Results
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("📊 Estimation Results", className="mb-0")
                        ]),
                        dbc.CardBody([
                            html.Div(id='estimation-results')
                        ])
                    ])
                ], width=6),
                
                # Statistics
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("📈 Statistics", className="mb-0")
                        ]),
                        dbc.CardBody([
                            html.Div(id='statistics-content')
                        ])
                    ])
                ], width=6)
            ], className="mb-3"),
            
            # Scatter plot
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("🎯 Point Distribution", className="mb-0")
                        ]),
                        dbc.CardBody([
                            dcc.Graph(id='scatter-plot')
                        ])
                    ])
                ])
            ], className="mb-3"),
            
            # Convergence plot
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("📈 Convergence Analysis", className="mb-0")
                        ]),
                        dbc.CardBody([
                            dcc.Graph(id='convergence-plot')
                        ])
                    ])
                ])
            ], className="mb-3"),
            
            # Learning objectives
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("🎓 Learning Objectives", className="mb-0")
                        ]),
                        dbc.CardBody([
                            html.H6("Key Concepts:"),
                            html.Ul([
                                html.Li("Monte Carlo Method: Using random sampling to estimate mathematical quantities"),
                                html.Li("Area Ratio: π = 4 × (points inside circle) / (total points)"),
                                html.Li("Convergence: Estimate improves with more points"),
                                html.Li("Confidence Intervals: Uncertainty in our estimate")
                            ]),
                            html.Hr(),
                            html.H6("Mathematical Foundation:"),
                            html.P("Area of circle = πr², Area of square = 4r². For r=1, π = 4 × (circle area / square area)")
                        ])
                    ])
                ])
            ])
        ], width=9)
    ])
], fluid=True)

# Callbacks
@app.callback(
    [Output('x-coords', 'children'),
     Output('y-coords', 'children'),
     Output('pi-estimates', 'children'),
     Output('n-points-history', 'children')],
    [Input('generate-points-btn', 'n_clicks'),
     Input('add-points-btn', 'n_clicks')],
    [State('n-points-slider', 'value'),
     State('x-coords', 'children'),
     State('y-coords', 'children'),
     State('pi-estimates', 'children'),
     State('n-points-history', 'children')]
)
def update_points(generate_clicks: int, add_clicks: int, n_points: int,
                 x_coords: str, y_coords: str, pi_estimates: str, n_points_history: str) -> Tuple[str, str, str, str]:
    """Update point coordinates and history."""
    ctx = callback_context
    if not ctx.triggered:
        # Initial state
        x, y = generate_random_points(n_points)
        pi_est, _, _ = estimate_pi(x, y)
        return str(x), str(y), str([pi_est]), str([n_points])
    
    button_id = ctx.triggered[0]['prop_id'].split('.')[0]
    
    if button_id == 'generate-points-btn':
        # Generate new points
        x, y = generate_random_points(n_points)
        pi_est, _, _ = estimate_pi(x, y)
        return str(x), str(y), str([pi_est]), str([n_points])
    
    elif button_id == 'add-points-btn':
        # Add more points to existing ones
        if x_coords and y_coords:
            existing_x = eval(x_coords) if isinstance(x_coords, str) else x_coords
            existing_y = eval(y_coords) if isinstance(y_coords, str) else y_coords
            
            new_x, new_y = generate_random_points(n_points)
            combined_x = existing_x + new_x
            combined_y = existing_y + new_y
            
            pi_est, _, _ = estimate_pi(combined_x, combined_y)
            
            # Update history
            history = eval(n_points_history) if isinstance(n_points_history, str) else n_points_history
            history.append(len(combined_x))
            
            estimates = eval(pi_estimates) if isinstance(pi_estimates, str) else pi_estimates
            estimates.append(pi_est)
            
            return str(combined_x), str(combined_y), str(estimates), str(history)
    
    raise PreventUpdate

@app.callback(
    Output('estimation-results', 'children'),
    [Input('x-coords', 'children'),
     Input('y-coords', 'children'),
     Input('confidence-dropdown', 'value')]
)
def update_estimation_results(x_coords: str, y_coords: str, confidence: float) -> html.Div:
    """Update estimation results display."""
    if not x_coords or not y_coords:
        raise PreventUpdate
    
    x = eval(x_coords) if isinstance(x_coords, str) else x_coords
    y = eval(y_coords) if isinstance(y_coords, str) else y_coords
    
    pi_estimate, n_inside, n_total = estimate_pi(x, y)
    ci_lower, ci_upper = calculate_confidence_interval(pi_estimate, n_total, confidence)
    error = abs(pi_estimate - math.pi)
    
    return html.Div([
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(f"{pi_estimate:.6f}", className="card-title"),
                        html.P("π Estimate", className="card-text")
                    ])
                ], color="primary", outline=True)
            ], width=3),
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(f"{error:.6f}", className="card-title"),
                        html.P("Absolute Error", className="card-text")
                    ])
                ], color="warning", outline=True)
            ], width=3),
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(f"{n_inside}/{n_total}", className="card-title"),
                        html.P("Points Inside/Total", className="card-text")
                    ])
                ], color="info", outline=True)
            ], width=3),
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(f"{ci_lower:.3f} - {ci_upper:.3f}", className="card-title"),
                        html.P(f"{int(confidence*100)}% Confidence Interval", className="card-text"),
                        html.P(
                            "✅ π Inside" if is_pi_in_confidence_interval(ci_lower, ci_upper) else "❌ π Outside",
                            className="card-text",
                            style={"fontSize": "0.9em", "fontWeight": "bold"}
                        ),
                        html.P(
                            f"True π: {math.pi:.6f}",
                            className="card-text",
                            style={"fontSize": "0.8em", "color": "gray"}
                        )
                    ])
                ], color=get_confidence_interval_color(ci_lower, ci_upper), outline=True)
            ], width=3)
        ])
    ])

@app.callback(
    Output('statistics-content', 'children'),
    [Input('x-coords', 'children'),
     Input('y-coords', 'children')]
)
def update_statistics(x_coords: str, y_coords: str) -> html.Div:
    """Update statistics display."""
    if not x_coords or not y_coords:
        raise PreventUpdate
    
    x = eval(x_coords) if isinstance(x_coords, str) else x_coords
    y = eval(y_coords) if isinstance(y_coords, str) else y_coords
    
    n_total = len(x)
    n_inside = sum(1 for xi, yi in zip(x, y) if check_inside_circle(xi, yi))
    ratio = n_inside / n_total
    
    return html.Div([
        html.P(f"Total Points: {n_total:,}"),
        html.P(f"Points Inside Circle: {n_inside:,}"),
        html.P(f"Points Outside Circle: {n_total - n_inside:,}"),
        html.P(f"Ratio (Inside/Total): {ratio:.4f}"),
        html.P(f"Expected Ratio: {math.pi/4:.4f}"),
        html.Hr(),
        html.P(f"True π: {math.pi:.6f}"),
        html.P(f"Estimate: {4*ratio:.6f}"),
        html.P(f"Relative Error: {abs(4*ratio - math.pi)/math.pi*100:.2f}%")
    ])

@app.callback(
    Output('scatter-plot', 'figure'),
    [Input('x-coords', 'children'),
     Input('y-coords', 'children')]
)
def update_scatter_plot(x_coords: str, y_coords: str) -> go.Figure:
    """Update scatter plot."""
    if not x_coords or not y_coords:
        raise PreventUpdate
    
    x = eval(x_coords) if isinstance(x_coords, str) else x_coords
    y = eval(y_coords) if isinstance(y_coords, str) else y_coords
    
    n_inside = sum(1 for xi, yi in zip(x, y) if check_inside_circle(xi, yi))
    return create_scatter_plot(x, y, n_inside)

@app.callback(
    Output('convergence-plot', 'figure'),
    [Input('pi-estimates', 'children'),
     Input('n-points-history', 'children')]
)
def update_convergence_plot(pi_estimates: str, n_points_history: str) -> go.Figure:
    """Update convergence plot."""
    if not pi_estimates or not n_points_history:
        raise PreventUpdate
    
    estimates = eval(pi_estimates) if isinstance(pi_estimates, str) else pi_estimates
    n_points = eval(n_points_history) if isinstance(n_points_history, str) else n_points_history
    
    return create_convergence_plot(estimates, n_points)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8051)


