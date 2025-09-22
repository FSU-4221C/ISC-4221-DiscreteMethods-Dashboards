"""
Interactive Dashboard 2: Event Relationships Visualizer
Topic: Event relationships and conditional probability
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

# Initialize the Dash app with Bootstrap
app = dash.Dash(__name__, title="Event Relationships Visualizer", 
                external_stylesheets=[dbc.themes.BOOTSTRAP])
app.config.suppress_callback_exceptions = True

def calculate_venn_probabilities(p_a: float, p_b: float, p_intersection: float) -> Dict[str, float]:
    """Calculate all probabilities for Venn diagram visualization."""
    p_union = p_a + p_b - p_intersection
    p_a_only = p_a - p_intersection
    p_b_only = p_b - p_intersection
    p_neither = 1 - p_union
    
    return {
        'p_a': p_a,
        'p_b': p_b,
        'p_intersection': p_intersection,
        'p_union': p_union,
        'p_a_only': p_a_only,
        'p_b_only': p_b_only,
        'p_neither': p_neither
    }

def check_independence(p_a: float, p_b: float, p_intersection: float) -> bool:
    """Check if events A and B are independent."""
    return abs(p_intersection - p_a * p_b) < 1e-6

def calculate_conditional_probabilities(p_a: float, p_b: float, p_intersection: float) -> Dict[str, float]:
    """Calculate conditional probabilities."""
    p_a_given_b = p_intersection / p_b if p_b > 0 else 0
    p_b_given_a = p_intersection / p_a if p_a > 0 else 0
    
    return {
        'p_a_given_b': p_a_given_b,
        'p_b_given_a': p_b_given_a
    }

def create_venn_diagram(p_a: float, p_b: float, p_intersection: float) -> go.Figure:
    """Create an interactive Venn diagram visualization with area-proportional circles."""
    # Calculate all probabilities
    probs = calculate_venn_probabilities(p_a, p_b, p_intersection)
    
    # Create figure
    fig = go.Figure()
    
    # Calculate circle radii based on probabilities
    # Area = π * r², so r = sqrt(Area/π)
    # Scale factor to make circles fit nicely in the plot
    scale_factor = 0.25  # Reduced to ensure circles can overlap
    radius_a = np.sqrt(p_a / np.pi) * scale_factor
    radius_b = np.sqrt(p_b / np.pi) * scale_factor
    
    # Calculate circle centers to ensure intersection
    # Distance between centers should be less than sum of radii for intersection
    min_distance = (radius_a + radius_b) * 0.8  # 80% of sum to ensure overlap
    max_distance = (radius_a + radius_b) * 1.2  # 120% of sum for reasonable spacing
    
    # Position circles with guaranteed intersection
    center_y = 0.5
    center_a_x = 0.5 - min_distance / 2
    center_b_x = 0.5 + min_distance / 2
    
    # Calculate max_radius for text positioning
    max_radius = max(radius_a, radius_b)
    
    # Add circles for events A and B with proportional areas
    # Event A circle (left)
    fig.add_shape(
        type="circle",
        xref="x", yref="y",
        x0=center_a_x - radius_a, y0=center_y - radius_a,
        x1=center_a_x + radius_a, y1=center_y + radius_a,
        line_color="blue",
        fillcolor="rgba(0, 100, 255, 0.3)"
    )
    
    # Event B circle (right)
    fig.add_shape(
        type="circle",
        xref="x", yref="y",
        x0=center_b_x - radius_b, y0=center_y - radius_b,
        x1=center_b_x + radius_b, y1=center_y + radius_b,
        line_color="red",
        fillcolor="rgba(255, 0, 0, 0.3)"
    )
    
    # Add text annotations positioned relative to circles
    fig.add_annotation(
        x=center_a_x, y=center_y,
        text=f"P(A) = {p_a:.3f}",
        showarrow=False,
        font=dict(size=14, color="blue")
    )
    
    fig.add_annotation(
        x=center_b_x, y=center_y,
        text=f"P(B) = {p_b:.3f}",
        showarrow=False,
        font=dict(size=14, color="red")
    )
    
    # Position A-only annotation to the left of circle A
    fig.add_annotation(
        x=center_a_x - radius_a - 0.1, y=center_y,
        text=f"P(A only) = {probs['p_a_only']:.3f}",
        showarrow=False,
        font=dict(size=10, color="blue")
    )
    
    # Position B-only annotation to the right of circle B
    fig.add_annotation(
        x=center_b_x + radius_b + 0.1, y=center_y,
        text=f"P(B only) = {probs['p_b_only']:.3f}",
        showarrow=False,
        font=dict(size=10, color="red")
    )
    
    # Position union annotation below the circles
    union_x = 0.5
    union_y = center_y - max_radius - 0.1
    fig.add_annotation(
        x=union_x, y=union_y,
        text=f"P(A∪B) = {probs['p_union']:.3f}",
        showarrow=False,
        font=dict(size=12, color="green")
    )
    
    # Position intersection annotation just above the union text
    fig.add_annotation(
        x=union_x, y=union_y + 0.08,
        text=f"P(A∩B) = {p_intersection:.3f}",
        showarrow=False,
        font=dict(size=12, color="purple")
    )
    
    # Position neither annotation above the circles
    fig.add_annotation(
        x=0.5, y=center_y + max_radius + 0.1,
        text=f"P(Neither) = {probs['p_neither']:.3f}",
        showarrow=False,
        font=dict(size=10, color="gray")
    )
    
    # Calculate appropriate axis range based on circle sizes and positions
    x_min = min(center_a_x - radius_a, center_b_x - radius_b) - 0.15
    x_max = max(center_a_x + radius_a, center_b_x + radius_b) + 0.15
    y_min = center_y - max_radius - 0.15
    y_max = center_y + max_radius + 0.15
    
    # Update layout
    fig.update_layout(
        title="Interactive Venn Diagram (Area ∝ Probability)",
        xaxis=dict(
            showgrid=False, 
            zeroline=False, 
            showticklabels=False,
            range=[x_min, x_max],  # Dynamic range based on circle sizes
            scaleanchor="y",  # Maintain aspect ratio
            scaleratio=1
        ),
        yaxis=dict(
            showgrid=False, 
            zeroline=False, 
            showticklabels=False,
            range=[y_min, y_max]  # Dynamic range based on circle sizes
        ),
        showlegend=False,
        width=600,
        height=500,
        margin=dict(l=20, r=20, t=60, b=20),
        # Enable interactive features
        dragmode='pan',  # Allow panning
        hovermode='closest'
    )
    
    # Add reset axes and autoscale buttons
    fig.update_layout(
        updatemenus=[
            dict(
                type="buttons",
                direction="left",
                buttons=list([
                    dict(
                        args=[{"xaxis.range": [x_min, x_max], "yaxis.range": [y_min, y_max]}],
                        label="Reset View",
                        method="relayout"
                    ),
                    dict(
                        args=["relayout", {"xaxis.autorange": True, "yaxis.autorange": True}],
                        label="Autoscale",
                        method="relayout"
                    )
                ]),
                pad={"r": 10, "t": 10},
                showactive=True,
                x=0.01,
                xanchor="left",
                y=1.02,
                yanchor="top"
            ),
        ]
    )
    
    return fig

def simulate_events(p_a: float, p_b: float, p_intersection: float, num_trials: int) -> Dict[str, int]:
    """Simulate events A and B for given number of trials."""
    # Generate random numbers
    rand_a = np.random.random(num_trials)
    rand_b = np.random.random(num_trials)
    
    # Determine outcomes
    event_a = rand_a < p_a
    event_b = rand_b < p_b
    
    # For intersection, we need to be more careful
    # If events are independent, use p_a * p_b
    # If not independent, use the given p_intersection
    if abs(p_intersection - p_a * p_b) < 1e-6:
        # Independent case
        event_intersection = (rand_a < p_a) & (rand_b < p_b)
    else:
        # Dependent case - use conditional probability
        p_b_given_a = p_intersection / p_a if p_a > 0 else 0
        event_intersection = event_a & (np.random.random(num_trials) < p_b_given_a)
    
    return {
        'event_a': np.sum(event_a),
        'event_b': np.sum(event_b),
        'event_intersection': np.sum(event_intersection),
        'event_union': np.sum(event_a | event_b),
        'total_trials': num_trials
    }

# Define the layout
app.layout = dbc.Container([
    dbc.Row([
        dbc.Col([
            html.H1("Event Relationships Visualizer", className="text-center mb-4"),
            html.P("Explore how events relate to each other through interactive Venn diagrams and conditional probability calculations.", 
                   className="text-center text-muted mb-4")
        ])
    ]),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Event Probabilities"),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            dbc.Label("P(A)"),
                            dbc.Input(
                                id="p-a-input",
                                type="number",
                                min=0,
                                max=1,
                                step=0.01,
                                value=0.4
                            )
                        ], width=4),
                        dbc.Col([
                            dbc.Label("P(B)"),
                            dbc.Input(
                                id="p-b-input",
                                type="number",
                                min=0,
                                max=1,
                                step=0.01,
                                value=0.3
                            )
                        ], width=4),
                        dbc.Col([
                            dbc.Label("P(A∩B)"),
                            dbc.Input(
                                id="p-intersection-input",
                                type="number",
                                min=0,
                                max=1,
                                step=0.01,
                                value=0.1
                            )
                        ], width=4)
                    ], className="mb-3"),
                    
                    dbc.Row([
                        dbc.Col([
                            dbc.Label("Number of Trials"),
                            dbc.Input(
                                id="num-trials-input",
                                type="number",
                                min=100,
                                max=10000,
                                step=100,
                                value=1000
                            )
                        ], width=6),
                        dbc.Col([
                            dbc.Button("Run Simulation", id="simulate-btn", color="primary", className="mt-4"),
                            html.Small("Simulates random trials to verify theoretical probabilities", className="text-muted d-block mt-1")
                        ], width=6)
                    ])
                ])
            ])
        ], width=6),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Calculated Probabilities"),
                dbc.CardBody([
                    html.Div(id="probability-results")
                ])
            ])
        ], width=6)
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Venn Diagram Visualization"),
                dbc.CardBody([
                    dcc.Graph(id="venn-diagram")
                ])
            ])
        ], width=8),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Simulation Results"),
                dbc.CardBody([
                    html.Div(id="simulation-results")
                ])
            ])
        ], width=4)
    ], className="mb-4"),
    
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("Dynamic Problem"),
                dbc.CardBody([
                    html.H5("Challenge: Create events A and B where P(A∪B) = 0.8"),
                    html.P("Adjust the probabilities above to make P(A∪B) = 0.8, then find P(A∩B)."),
                    html.P("Hint: Use the formula P(A∪B) = P(A) + P(B) - P(A∩B)"),
                    html.Div(id="challenge-status")
                ])
            ])
        ])
    ])
], fluid=True)

@app.callback(
    [Output("probability-results", "children"),
     Output("venn-diagram", "figure"),
     Output("challenge-status", "children")],
    [Input("p-a-input", "value"),
     Input("p-b-input", "value"),
     Input("p-intersection-input", "value")]
)
def update_probabilities(p_a: float, p_b: float, p_intersection: float) -> Tuple[List, go.Figure, str]:
    """Update probability calculations and Venn diagram."""
    if p_a is None or p_b is None or p_intersection is None:
        raise PreventUpdate
    
    # Validate inputs
    if p_a < 0 or p_a > 1 or p_b < 0 or p_b > 1 or p_intersection < 0 or p_intersection > 1:
        return ["Invalid probabilities"], go.Figure(), "Please enter valid probabilities (0-1)"
    
    if p_intersection > min(p_a, p_b):
        return ["P(A∩B) cannot be greater than min(P(A), P(B))"], go.Figure(), "Invalid intersection probability"
    
    # Calculate probabilities
    probs = calculate_venn_probabilities(p_a, p_b, p_intersection)
    conditional_probs = calculate_conditional_probabilities(p_a, p_b, p_intersection)
    is_independent = check_independence(p_a, p_b, p_intersection)
    
    # Create results display
    results = [
        html.H6("Basic Probabilities:"),
        html.P(f"P(A∪B) = {probs['p_union']:.3f}"),
        html.P(f"P(A only) = {probs['p_a_only']:.3f}"),
        html.P(f"P(B only) = {probs['p_b_only']:.3f}"),
        html.P(f"P(Neither) = {probs['p_neither']:.3f}"),
        html.Hr(),
        html.H6("Conditional Probabilities:"),
        html.P(f"P(A|B) = {conditional_probs['p_a_given_b']:.3f}"),
        html.P(f"P(B|A) = {conditional_probs['p_b_given_a']:.3f}"),
        html.Hr(),
        html.H6("Independence:"),
        html.P(f"Events are {'independent' if is_independent else 'dependent'}")
    ]
    
    # Create Venn diagram
    venn_fig = create_venn_diagram(p_a, p_b, p_intersection)
    
    # Check challenge status
    target_union = 0.8
    tolerance = 0.01
    if abs(probs['p_union'] - target_union) < tolerance:
        challenge_status = dbc.Alert("🎉 Success! You've achieved P(A∪B) = 0.8!", color="success")
    else:
        challenge_status = f"Current P(A∪B) = {probs['p_union']:.3f}. Target: {target_union}"
    
    return results, venn_fig, challenge_status

@app.callback(
    Output("simulation-results", "children"),
    [Input("simulate-btn", "n_clicks")],
    [State("p-a-input", "value"),
     State("p-b-input", "value"),
     State("p-intersection-input", "value"),
     State("num-trials-input", "value")]
)
def run_simulation(n_clicks: int, p_a: float, p_b: float, p_intersection: float, num_trials: int) -> List:
    """Run simulation and display results."""
    if n_clicks is None:
        return ["Click 'Run Simulation' to see results"]
    
    if p_a is None or p_b is None or p_intersection is None or num_trials is None:
        return ["Please enter all parameters"]
    
    # Validate inputs
    if p_intersection > min(p_a, p_b):
        return ["Invalid intersection probability"]
    
    # Run simulation
    results = simulate_events(p_a, p_b, p_intersection, num_trials)
    
    # Calculate empirical probabilities
    emp_p_a = results['event_a'] / results['total_trials']
    emp_p_b = results['event_b'] / results['total_trials']
    emp_p_intersection = results['event_intersection'] / results['total_trials']
    emp_p_union = results['event_union'] / results['total_trials']
    
    return [
        html.H6("Monte Carlo Simulation Results:"),
        html.Small("Random trials simulate real-world events to verify theoretical calculations", className="text-muted d-block mb-2"),
        html.H6("Empirical vs Theoretical Probabilities:"),
        html.P(f"P(A) ≈ {emp_p_a:.3f} (theoretical: {p_a:.3f})"),
        html.P(f"P(B) ≈ {emp_p_b:.3f} (theoretical: {p_b:.3f})"),
        html.P(f"P(A∩B) ≈ {emp_p_intersection:.3f} (theoretical: {p_intersection:.3f})"),
        html.P(f"P(A∪B) ≈ {emp_p_union:.3f} (theoretical: {p_a + p_b - p_intersection:.3f})"),
        html.Hr(),
        html.H6("Event Counts from Simulation:"),
        html.P(f"Event A occurred: {results['event_a']} times"),
        html.P(f"Event B occurred: {results['event_b']} times"),
        html.P(f"Both A and B occurred: {results['event_intersection']} times"),
        html.P(f"A or B occurred: {results['event_union']} times"),
        html.P(f"Total trials: {results['total_trials']}")
    ]

if __name__ == "__main__":
    app.run(debug=True, port=8051)
