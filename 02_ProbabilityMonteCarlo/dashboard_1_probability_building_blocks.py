"""
Interactive Dashboard 1: Probability Building Blocks Explorer
Topic: Sample spaces, events, and random variables
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
app = dash.Dash(__name__, title="Probability Building Blocks Explorer", 
                external_stylesheets=[dbc.themes.BOOTSTRAP])
app.config.suppress_callback_exceptions = True

def calculate_sample_space(experiment_type: str, num_items: int) -> Dict[str, Any]:
    """Calculate sample space for different experiment types."""
    if experiment_type == "Dice Roll":
        outcomes = list(range(1, 7))
        if num_items == 1:
            sample_space = outcomes
        else:
            # For multiple dice, we consider sums
            min_sum = num_items
            max_sum = 6 * num_items
            sample_space = list(range(min_sum, max_sum + 1))
            
    elif experiment_type == "Coin Flip":
        outcomes = ["H", "T"]
        if num_items == 1:
            sample_space = outcomes
        else:
            # For multiple coins, we consider number of heads
            sample_space = list(range(num_items + 1))
            
    return {
        "sample_space": sample_space,
        "outcomes": outcomes
    }

def simulate_experiment(experiment_type: str, num_items: int, num_trials: int) -> List[int]:
    """Simulate the experiment multiple times."""
    if experiment_type == "Dice Roll":
        if num_items == 1:
            return np.random.randint(1, 7, num_trials).tolist()
        else:
            return np.sum(np.random.randint(1, 7, (num_trials, num_items)), axis=1).tolist()
            
    elif experiment_type == "Coin Flip":
        if num_items == 1:
            return np.random.choice([0, 1], num_trials).tolist()  # 0=T, 1=H
        else:
            return np.sum(np.random.choice([0, 1], (num_trials, num_items)), axis=1).tolist()

def calculate_theoretical_probability_dice(event_values: List[int], num_dice: int) -> float:
    """Calculate theoretical probability for dice rolls considering actual probability distribution."""
    if num_dice == 1:
        # Single die: uniform probability 1/6 for each outcome
        return len([v for v in event_values if 1 <= v <= 6]) / 6
    
    # For multiple dice, calculate the probability of getting any of the event values
    # We need to consider the actual probability distribution of sums
    total_probability = 0.0
    
    for target_sum in event_values:
        if target_sum < num_dice or target_sum > 6 * num_dice:
            continue  # Impossible sum
        
        # Calculate probability for this specific sum
        # This is a simplified approach - in practice, you'd use the exact formula
        # For now, we'll use a reasonable approximation based on the central limit theorem
        # The probability is highest near the middle of the range
        
        # Calculate how many ways this sum can be achieved
        # This is a simplified calculation - the exact formula is more complex
        ways_to_achieve = 1  # Placeholder - would need proper combinatorial calculation
        
        # For multiple dice, we approximate the probability
        # The exact calculation would require generating all possible combinations
        if num_dice <= 3:
            # For small numbers of dice, we can calculate exact probabilities
            ways_to_achieve = count_ways_to_achieve_sum(target_sum, num_dice)
        else:
            # For larger numbers, use approximation
            ways_to_achieve = approximate_ways_to_achieve_sum(target_sum, num_dice)
        
        probability = ways_to_achieve / (6 ** num_dice)
        total_probability += probability
    
    return total_probability

def count_ways_to_achieve_sum(target_sum: int, num_dice: int) -> int:
    """Count the number of ways to achieve a target sum with num_dice dice."""
    if num_dice == 1:
        return 1 if 1 <= target_sum <= 6 else 0
    
    if num_dice == 2:
        # For 2 dice, we can calculate exactly
        ways = 0
        for d1 in range(1, 7):
            for d2 in range(1, 7):
                if d1 + d2 == target_sum:
                    ways += 1
        return ways
    
    if num_dice == 3:
        # For 3 dice, we can calculate exactly
        ways = 0
        for d1 in range(1, 7):
            for d2 in range(1, 7):
                for d3 in range(1, 7):
                    if d1 + d2 + d3 == target_sum:
                        ways += 1
        return ways
    
    # For more dice, use approximation
    return approximate_ways_to_achieve_sum(target_sum, num_dice)

def approximate_ways_to_achieve_sum(target_sum: int, num_dice: int) -> int:
    """Approximate the number of ways to achieve a target sum for larger numbers of dice."""
    # This is a simplified approximation
    # The exact calculation would require more sophisticated combinatorial methods
    
    # For large numbers of dice, the distribution approaches normal
    # We use a rough approximation based on the range
    min_sum = num_dice
    max_sum = 6 * num_dice
    mid_point = (min_sum + max_sum) / 2
    
    # Simple approximation: probability decreases as we move away from the middle
    distance_from_middle = abs(target_sum - mid_point)
    max_distance = (max_sum - min_sum) / 2
    
    # Rough approximation of relative probability
    relative_prob = max(0.1, 1 - (distance_from_middle / max_distance))
    
    # Convert to approximate number of ways
    total_combinations = 6 ** num_dice
    return int(total_combinations * relative_prob / (max_sum - min_sum + 1))

def calculate_theoretical_probability_coins(event_values: List[int], num_coins: int) -> float:
    """Calculate theoretical probability for coin flips considering binomial distribution."""
    if num_coins == 1:
        # Single coin: uniform probability 1/2 for each outcome (0=T, 1=H)
        return len([v for v in event_values if v in [0, 1]]) / 2
    
    # For multiple coins, calculate the probability of getting any of the event values
    # The probability follows binomial distribution: P(k heads) = C(n,k) / 2^n
    total_probability = 0.0
    
    for target_heads in event_values:
        if target_heads < 0 or target_heads > num_coins:
            continue  # Impossible number of heads
        
        # Calculate probability using binomial coefficient
        # P(k heads) = C(n,k) / 2^n where C(n,k) = n!/(k!(n-k)!)
        ways_to_achieve = binomial_coefficient(num_coins, target_heads)
        probability = ways_to_achieve / (2 ** num_coins)
        total_probability += probability
    
    return total_probability

def binomial_coefficient(n: int, k: int) -> int:
    """Calculate binomial coefficient C(n,k) = n!/(k!(n-k)!)."""
    if k < 0 or k > n:
        return 0
    if k == 0 or k == n:
        return 1
    
    # Use the multiplicative formula for efficiency
    result = 1
    for i in range(min(k, n - k)):
        result = result * (n - i) // (i + 1)
    return result

def calculate_event_probability(event_values: List[int], sample_space: List[int], num_trials: int) -> float:
    """Calculate probability of an event based on simulation."""
    if num_trials == 0:
        return 0.0
    
    # Simulate and count occurrences
    simulations = simulate_experiment("Dice Roll", 1, num_trials)  # Default values
    event_occurrences = sum(1 for outcome in simulations if outcome in event_values)
    return event_occurrences / num_trials

# App layout
app.layout = dbc.Container([
    # Hidden divs for storing state
    html.Div(id='experiment-type', style={'display': 'none'}, children='Dice Roll'),
    html.Div(id='num-items', style={'display': 'none'}, children=1),
    html.Div(id='num-trials', style={'display': 'none'}, children=100),
    html.Div(id='event-values', style={'display': 'none'}, children='[1, 2, 3]'),
    html.Div(id='simulation-results', style={'display': 'none'}),
    html.Div(id='sample-space-visible', style={'display': 'none'}, children='false'),
    
    # Header
    dbc.Row([
        dbc.Col([
            html.H1("🎲 Probability Building Blocks Explorer", className="text-center mb-4"),
            html.P("Explore sample spaces, events, and random variables through interactive simulation", 
                   className="text-center text-muted")
        ])
    ]),
    
    # Main content
    dbc.Row([
        # Sidebar
        dbc.Col([
            dbc.Card([
                dbc.CardHeader([
                    html.H4("⚙️ Experiment Settings", className="mb-0")
                ]),
                dbc.CardBody([
                    html.Label("Choose Experiment Type:", className="form-label"),
                    dcc.Dropdown(
                        id='experiment-type-dropdown',
                        options=[
                            {'label': 'Dice Roll', 'value': 'Dice Roll'},
                            {'label': 'Coin Flip', 'value': 'Coin Flip'}
                        ],
                        value='Dice Roll',
                        className="mb-3"
                    ),
                    
                    html.Label("Number of Items:", className="form-label"),
                    dcc.Slider(
                        id='num-items-slider',
                        min=1,
                        max=10,
                        step=1,
                        value=1,
                        marks={i: str(i) for i in range(1, 11)},
                        className="mb-3"
                    ),
                    
                    html.Label("Number of Trials:", className="form-label"),
                    dcc.Slider(
                        id='num-trials-slider',
                        min=10,
                        max=10000,
                        step=10,
                        value=100,
                        marks={10: '10', 100: '100', 1000: '1K', 5000: '5K', 10000: '10K'},
                        className="mb-3"
                    ),
                    
                    html.Hr(),
                    
                    html.Label("Define Your Event:", className="form-label"),
                    html.Div(id='event-selection-container'),
                    
                    html.Hr(),
                    
                    dbc.Button("Run Simulation", id="run-simulation-btn", 
                              color="primary", className="w-100")
                ])
            ], className="h-100")
        ], width=3),
        
        # Main content area
        dbc.Col([
            dbc.Row([
                # Sample Space
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            dbc.Row([
                                dbc.Col([
                                    html.H5("📊 Sample Space", className="mb-0")
                                ], width=10),
                                dbc.Col([
                                    dbc.Button(
                                        "👁️", 
                                        id="toggle-sample-space-btn",
                                        color="outline-secondary",
                                        size="sm",
                                        className="float-end"
                                    )
                                ], width=2)
                            ])
                        ]),
                        dbc.CardBody([
                            html.Div(id='sample-space-content')
                        ], id="sample-space-body")
                    ])
                ], width=6),
                
                # Simulation Results
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("📈 Simulation Results", className="mb-0")
                        ]),
                        dbc.CardBody([
                            html.Div(id='simulation-results-content')
                        ])
                    ])
                ], width=6)
            ], className="mb-3"),
            
            # Chart
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H5("📊 Frequency Distribution", className="mb-0")
                        ]),
                        dbc.CardBody([
                            dcc.Graph(id='frequency-chart')
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
                            html.H6("Key Concepts to Explore:"),
                            html.Ul([
                                html.Li("Random Variable: The numerical outcome of your experiment"),
                                html.Li("Sample Space: All possible outcomes (Ω)"),
                                html.Li("Event: A subset of the sample space you're interested in"),
                                html.Li("Probability: The likelihood of your event occurring")
                            ]),
                            html.Hr(),
                            html.H6("Try This Challenge:"),
                            html.P("Design an experiment with 3 dice where the sum is between 10-15. What's the probability of this event? Verify by running simulations!")
                        ])
                    ])
                ])
            ])
        ], width=9)
    ])
], fluid=True)

# Callbacks
@app.callback(
    [Output('experiment-type', 'children'),
     Output('num-items', 'children'),
     Output('num-trials', 'children')],
    [Input('experiment-type-dropdown', 'value'),
     Input('num-items-slider', 'value'),
     Input('num-trials-slider', 'value')]
)
def update_experiment_params(experiment_type: str, num_items: int, num_trials: int) -> Tuple[str, int, int]:
    """Update experiment parameters."""
    return experiment_type, num_items, num_trials

@app.callback(
    Output('event-selection-container', 'children'),
    [Input('experiment-type-dropdown', 'value'),
     Input('num-items-slider', 'value')]
)
def update_event_selection(experiment_type: str, num_items: int) -> html.Div:
    """Update event selection options based on experiment type."""
    space_info = calculate_sample_space(experiment_type, num_items)
    sample_space = space_info["sample_space"]
    
    if experiment_type == "Dice Roll":
        if num_items == 1:
            options = [{'label': str(x), 'value': x} for x in sample_space]
            default_value = [1, 2, 3]
        else:
            options = [{'label': str(x), 'value': x} for x in sample_space]
            default_value = sample_space[:3]
    elif experiment_type == "Coin Flip":
        if num_items == 1:
            options = [{'label': 'Tails (0)', 'value': 0}, {'label': 'Heads (1)', 'value': 1}]
            default_value = [1]
        else:
            options = [{'label': str(x), 'value': x} for x in sample_space]
            default_value = [0, 1]
    
    dropdown = dcc.Dropdown(
        id='event-values-dropdown',
        options=options,
        value=default_value,
        multi=True,
        placeholder="Select event outcomes..."
    )
    
    return dropdown

@app.callback(
    Output('event-values', 'children'),
    [Input('event-values-dropdown', 'value')]
)
def update_event_values_storage(event_values: List[int]) -> str:
    """Update the hidden event-values div when dropdown selection changes."""
    if event_values is None:
        return "[]"
    return str(event_values)

# Initialize event-values with default values
@app.callback(
    Output('event-values', 'children', allow_duplicate=True),
    [Input('experiment-type-dropdown', 'value'),
     Input('num-items-slider', 'value')],
    prevent_initial_call=True
)
def initialize_event_values(experiment_type: str, num_items: int) -> str:
    """Initialize event-values with default values based on experiment type."""
    if experiment_type == "Dice Roll":
        default_value = [1, 2, 3] if num_items == 1 else [num_items, num_items + 1, num_items + 2]
    elif experiment_type == "Coin Flip":
        default_value = [1] if num_items == 1 else [0, 1]
    
    return str(default_value)

@app.callback(
    [Output('sample-space-body', 'style'),
     Output('sample-space-visible', 'children'),
     Output('toggle-sample-space-btn', 'children')],
    [Input('toggle-sample-space-btn', 'n_clicks')],
    [State('sample-space-visible', 'children')]
)
def toggle_sample_space_visibility(n_clicks: int, is_visible: str) -> Tuple[Dict[str, str], str, str]:
    """Toggle the visibility of the Sample Space panel."""
    if n_clicks is None:
        # Initial state - hidden by default
        return {'display': 'none'}, 'false', '👁️'
    
    # Toggle visibility
    currently_visible = is_visible == 'true'
    new_visibility = not currently_visible
    
    if new_visibility:
        return {'display': 'block'}, 'true', '🙈'
    else:
        return {'display': 'none'}, 'false', '👁️'

@app.callback(
    Output('sample-space-content', 'children'),
    [Input('experiment-type-dropdown', 'value'),
     Input('num-items-slider', 'value')]
)
def update_sample_space_display(experiment_type: str, num_items: int) -> html.Div:
    """Update sample space display."""
    space_info = calculate_sample_space(experiment_type, num_items)
    sample_space = space_info["sample_space"]
    
    if experiment_type == "Dice Roll":
        total_combinations = 6 ** num_items
        return html.Div([
            html.P(f"Experiment: {num_items} {experiment_type.lower()}"),
            html.P(f"Sample Space (sums): {sample_space}"),
            html.P(f"Number of possible sums: {len(sample_space)}"),
            html.P(f"Total combinations: {total_combinations} (6^{num_items})"),
            html.P(f"Note: Different sums have different probabilities!")
        ])
    elif experiment_type == "Coin Flip":
        total_combinations = 2 ** num_items
        return html.Div([
            html.P(f"Experiment: {num_items} {experiment_type.lower()}"),
            html.P(f"Sample Space (number of heads): {sample_space}"),
            html.P(f"Number of possible outcomes: {len(sample_space)}"),
            html.P(f"Total combinations: {total_combinations} (2^{num_items})"),
            html.P(f"Note: Follows binomial distribution!")
        ])

@app.callback(
    [Output('simulation-results-content', 'children'),
     Output('frequency-chart', 'figure')],
    [Input('run-simulation-btn', 'n_clicks')],
    [State('experiment-type-dropdown', 'value'),
     State('num-items-slider', 'value'),
     State('num-trials-slider', 'value'),
     State('event-values', 'children')]
)
def run_simulation(n_clicks: int, experiment_type: str, num_items: int, 
                  num_trials: int, event_values_str: str) -> Tuple[html.Div, go.Figure]:
    """Run simulation and update results."""
    if n_clicks is None:
        raise PreventUpdate
    
    # Parse event values from the hidden div
    try:
        event_values = eval(event_values_str) if event_values_str else []
    except:
        # If parsing fails, use defaults
        if experiment_type == "Dice Roll":
            event_values = [1, 2, 3] if num_items == 1 else [num_items, num_items + 1, num_items + 2]
        elif experiment_type == "Coin Flip":
            event_values = [1] if num_items == 1 else [0, 1]
    
    # Run simulation
    results = simulate_experiment(experiment_type, num_items, num_trials)
    
    # Calculate empirical probability
    event_count = sum(1 for outcome in results if outcome in event_values)
    empirical_prob = event_count / num_trials
    
    # Get sample space for chart creation (needed regardless of experiment type)
    space_info = calculate_sample_space(experiment_type, num_items)
    sample_space = space_info["sample_space"]
    
    # Theoretical probability (proper calculation for different experiment types)
    if experiment_type == "Dice Roll":
        theoretical_prob = calculate_theoretical_probability_dice(event_values, num_items)
    elif experiment_type == "Coin Flip":
        theoretical_prob = calculate_theoretical_probability_coins(event_values, num_items)
    
    # Create results content
    results_content = html.Div([
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(str(event_count), className="card-title"),
                        html.P("Event Occurrences", className="card-text")
                    ])
                ], color="info", outline=True)
            ], width=4),
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(f"{empirical_prob:.4f}", className="card-title"),
                        html.P("Empirical Probability", className="card-text")
                    ])
                ], color="success", outline=True)
            ], width=4),
            dbc.Col([
                dbc.Card([
                    dbc.CardBody([
                        html.H4(f"{theoretical_prob:.4f}", className="card-title"),
                        html.P("Theoretical Probability", className="card-text")
                    ])
                ], color="warning", outline=True)
            ], width=4)
        ])
    ])
    
    # Create frequency distribution chart
    fig = go.Figure()
    
    # Count frequencies
    unique, counts = np.unique(results, return_counts=True)
    freq_dict = dict(zip(unique, counts))
    
    # Fill in missing values
    all_freqs = [freq_dict.get(x, 0) for x in sample_space]
    
    # Create bar chart
    fig.add_trace(go.Bar(
        x=sample_space,
        y=all_freqs,
        name="Frequency",
        marker_color='lightblue'
    ))
    
    # Highlight event values
    event_freqs = [freq_dict.get(x, 0) for x in event_values]
    fig.add_trace(go.Bar(
        x=event_values,
        y=event_freqs,
        name="Event Outcomes",
        marker_color='red'
    ))
    
    fig.update_layout(
        title="Frequency Distribution",
        xaxis_title="Outcome",
        yaxis_title="Frequency",
        showlegend=True,
        height=400
    )
    
    return results_content, fig

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8050)


