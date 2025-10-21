"""
Connected Components Labeling Dashboard
Interactive tool for understanding the two-pass algorithm and connected components.
"""

from dash import dcc, html, Input, Output, State, callback
import plotly.graph_objs as go
import plotly.express as px
import numpy as np
import cv2
from PIL import Image
import io
import base64
from typing import Tuple, List, Dict, Any
import dash
import matplotlib.pyplot as plt

# Create a separate Dash app instance for this dashboard

def create_components_dashboard() -> html.Div:
    """Create the connected components labeling dashboard."""
    
    return html.Div([
        # Title and description
        html.Div([
            html.H2("🏷️ Connected Components Labeling", 
                   style={'color': '#2c3e50', 'marginBottom': '10px'}),
            html.P("Create or upload a binary image and explore the two-pass connected components algorithm. "
                   "Understand how local decisions lead to global solutions.",
                   style={'color': '#7f8c8d', 'fontSize': '16px'})
        ], style={'marginBottom': '30px'}),
        
        # Controls section
        html.Div([
            html.Div([
                html.Label("Image Source:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                dcc.RadioItems(
                    id='components-image-source',
                    options=[
                        {'label': 'Upload Image', 'value': 'upload'},
                        {'label': 'Create Binary Image', 'value': 'create'}
                    ],
                    value='create',
                    style={'marginBottom': '15px'}
                ),
                
                dcc.Upload(
                    id='components-upload',
                    children=html.Div([
                        'Drag and Drop or ',
                        html.A('Select a Binary Image')
                    ]),
                    style={
                        'width': '100%',
                        'height': '60px',
                        'lineHeight': '60px',
                        'borderWidth': '1px',
                        'borderStyle': 'dashed',
                        'borderRadius': '5px',
                        'textAlign': 'center',
                        'margin': '10px'
                    },
                    multiple=False
                )
            ], style={'width': '30%', 'display': 'inline-block', 'verticalAlign': 'top'}),
            
            html.Div([
                html.Label("Algorithm Controls:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Connectivity:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.RadioItems(
                        id='components-connectivity',
                        options=[
                            {'label': '4-Connected', 'value': 4},
                            {'label': '8-Connected', 'value': 8}
                        ],
                        value=4,
                        inline=True,
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Div([
                    html.Label("Show Steps:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Checklist(
                        id='components-show-steps',
                        options=[
                            {'label': 'First Pass', 'value': 'first_pass'},
                            {'label': 'Equivalence Table', 'value': 'equivalence'},
                            {'label': 'Second Pass', 'value': 'second_pass'}
                        ],
                        value=['first_pass'],
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Button('Run Algorithm', id='components-run-btn', 
                           style={'backgroundColor': '#27ae60', 'color': 'white', 'border': 'none', 
                                 'padding': '10px 20px', 'borderRadius': '5px', 'cursor': 'pointer',
                                 'marginRight': '10px'}),
                html.Button('Reset', id='components-reset-btn', 
                           style={'backgroundColor': '#95a5a6', 'color': 'white', 'border': 'none', 
                                 'padding': '10px 20px', 'borderRadius': '5px', 'cursor': 'pointer'})
            ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Binary image editor (when creating)
        html.Div([
            html.H4("Binary Image Editor", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='components-image-editor', style={'textAlign': 'center'})
        ], style={'backgroundColor': '#ecf0f1', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Image display section
        html.Div([
            html.Div([
                html.H4("Binary Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='components-binary-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Labeled Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='components-labeled-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'marginLeft': '4%', 'textAlign': 'center'})
        ], style={'marginBottom': '30px'}),
        
        # Algorithm visualization
        html.Div([
            html.H4("Algorithm Visualization", style={'textAlign': 'center', 'marginBottom': '20px'}),
            dcc.Graph(id='components-algorithm-plot', style={'height': '400px'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Component statistics
        html.Div([
            html.H4("Component Statistics", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='components-stats', style={'textAlign': 'center'})
        ], style={'backgroundColor': '#ecf0f1', 'padding': '20px', 'borderRadius': '10px'})
    ])

def parse_uploaded_image(contents: str) -> np.ndarray:
    """Parse uploaded image from base64 string."""
    if contents is None:
        return None
    
    # Remove data URL prefix
    content_type, content_string = contents.split(',')
    
    # Decode base64
    image_data = base64.b64decode(content_string)
    
    # Convert to PIL Image
    image = Image.open(io.BytesIO(image_data))
    
    # Convert to grayscale if needed
    if image.mode != 'L':
        image = image.convert('L')
    
    # Convert to numpy array and binarize
    image_array = np.array(image)
    binary_image = (image_array > 128).astype(np.uint8) * 255
    
    return binary_image

def create_binary_image_editor(size: int = 8) -> html.Div:
    """Create an interactive binary image editor."""
    # Create a grid of checkboxes for binary image editing
    checkboxes = []
    for i in range(size):
        row_checkboxes = []
        for j in range(size):
            checkbox_id = f'pixel-{i}-{j}'
            row_checkboxes.append(
                dcc.Checklist(
                    id=checkbox_id,
                    options=[{'label': '', 'value': 'on'}],
                    value=[],
                    style={'display': 'inline-block', 'margin': '2px'}
                )
            )
        checkboxes.append(html.Div(row_checkboxes, style={'marginBottom': '5px'}))
    
    return html.Div([
        html.P("Click to toggle pixels (white = foreground, black = background):"),
        html.Div(checkboxes, style={'display': 'inline-block'}),
        html.Br(),
        html.Button('Clear All', id='components-clear-btn', 
                   style={'backgroundColor': '#e74c3c', 'color': 'white', 'border': 'none', 
                         'padding': '8px 16px', 'borderRadius': '5px', 'cursor': 'pointer',
                         'marginRight': '10px'}),
        html.Button('Fill All', id='components-fill-btn', 
                   style={'backgroundColor': '#3498db', 'color': 'white', 'border': 'none', 
                         'padding': '8px 16px', 'borderRadius': '5px', 'cursor': 'pointer'})
    ])

def connected_components_labeling(image: np.ndarray, connectivity: int = 4) -> Tuple[np.ndarray, Dict]:
    """Implement the two-pass connected components labeling algorithm."""
    if image is None:
        return None, {}
    
    # Convert to binary
    binary = (image > 0).astype(np.uint8)
    
    # Initialize label matrix
    labels = np.zeros_like(binary, dtype=np.int32)
    current_label = 0
    equivalence_table = {}
    
    # First pass: provisional labeling
    for i in range(binary.shape[0]):
        for j in range(binary.shape[1]):
            if binary[i, j] == 1:  # Foreground pixel
                # Check neighbors
                neighbors = []
                if i > 0 and binary[i-1, j] == 1:  # North
                    neighbors.append(labels[i-1, j])
                if j > 0 and binary[i, j-1] == 1:  # West
                    neighbors.append(labels[i, j-1])
                
                if not neighbors:
                    # New component
                    current_label += 1
                    labels[i, j] = current_label
                elif len(neighbors) == 1:
                    # Continue existing component
                    labels[i, j] = neighbors[0]
                else:
                    # Merge components
                    min_label = min(neighbors)
                    labels[i, j] = min_label
                    # Record equivalence
                    for neighbor in neighbors:
                        if neighbor != min_label:
                            equivalence_table[neighbor] = min_label
    
    # Resolve equivalences
    for label in equivalence_table:
        root = label
        while root in equivalence_table:
            root = equivalence_table[root]
        equivalence_table[label] = root
    
    # Second pass: final labeling
    for i in range(labels.shape[0]):
        for j in range(labels.shape[1]):
            if labels[i, j] > 0:
                labels[i, j] = equivalence_table.get(labels[i, j], labels[i, j])
    
    # Calculate statistics
    unique_labels = np.unique(labels[labels > 0])
    num_components = len(unique_labels)
    
    stats = {
        'num_components': num_components,
        'labels': unique_labels,
        'equivalence_table': equivalence_table
    }
    
    return labels, stats

def create_algorithm_visualization(labels: np.ndarray, show_steps: List[str]) -> go.Figure:
    """Create a visualization of the algorithm steps."""
    if labels is None:
        return go.Figure()
    
    fig = go.Figure()
    
    # Create a heatmap of the labeled image
    fig.add_trace(go.Heatmap(
        z=labels,
        colorscale='Viridis',
        showscale=True,
        name='Component Labels'
    ))
    
    # Add text annotations for labels
    h, w = labels.shape
    for i in range(h):
        for j in range(w):
            if labels[i, j] > 0:
                fig.add_annotation(
                    x=j, y=i,
                    text=str(labels[i, j]),
                    showarrow=False,
                    font=dict(color='white', size=12)
                )
    
    fig.update_layout(
        title="Connected Components Labeling Result",
        xaxis_title="X",
        yaxis_title="Y",
        height=400
    )
    
    return fig

def calculate_component_stats(labels: np.ndarray) -> Dict:
    """Calculate statistics for each component."""
    if labels is None:
        return {}
    
    unique_labels = np.unique(labels[labels > 0])
    stats = []
    
    for label in unique_labels:
        component_mask = (labels == label)
        area = np.sum(component_mask)
        
        # Calculate bounding box
        rows, cols = np.where(component_mask)
        if len(rows) > 0:
            bbox = {
                'min_row': np.min(rows),
                'max_row': np.max(rows),
                'min_col': np.min(cols),
                'max_col': np.max(cols)
            }
            bbox_area = (bbox['max_row'] - bbox['min_row'] + 1) * (bbox['max_col'] - bbox['min_col'] + 1)
            compactness = area / bbox_area if bbox_area > 0 else 0
        else:
            bbox = {}
            compactness = 0
        
        stats.append({
            'label': int(label),
            'area': int(area),
            'bbox': bbox,
            'compactness': compactness
        })
    
    return stats

def image_to_base64(img: np.ndarray, colormap: str = 'gray') -> str:
    """Convert numpy array image to base64 string."""
    if colormap == 'viridis':
        # Apply viridis colormap for better visualization
        img_normalized = (img - img.min()) / (img.max() - img.min() + 1e-8)
        img_colored = plt.cm.viridis(img_normalized)[:, :, :3]
        img_colored = (img_colored * 255).astype(np.uint8)
        pil_img = Image.fromarray(img_colored)
    else:
        pil_img = Image.fromarray(img)
    
    buffer = io.BytesIO()
    pil_img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Callbacks for components dashboard
@callback(
    [Output('components-image-editor', 'children'),
     Output('components-binary-image', 'src'),
     Output('components-labeled-image', 'src'),
     Output('components-algorithm-plot', 'figure'),
     Output('components-stats', 'children')],
    [Input('components-image-source', 'value'),
     Input('components-upload', 'contents'),
     Input('components-run-btn', 'n_clicks'),
     Input('components-connectivity', 'value'),
     Input('components-show-steps', 'value'),
     Input('components-clear-btn', 'n_clicks'),
     Input('components-fill-btn', 'n_clicks'),
     Input('components-reset-btn', 'n_clicks')]
)
def update_components_display(image_source, contents, run_clicks, connectivity, show_steps, 
                             clear_clicks, fill_clicks, reset_clicks):
    """Update the connected components dashboard display."""
    
    # Create image editor
    editor = create_binary_image_editor()
    
    # Get binary image
    if image_source == 'upload' and contents is not None:
        binary_image = parse_uploaded_image(contents)
    else:
        # Create a simple test image
        binary_image = np.array([
            [1, 1, 0, 0, 0],
            [0, 1, 1, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1]
        ], dtype=np.uint8) * 255
    
    if binary_image is None:
        empty_fig = go.Figure()
        empty_fig.update_layout(height=400, showlegend=False)
        return editor, None, None, empty_fig, "No image available"
    
    # Convert to binary for display
    binary_display = (binary_image > 0).astype(np.uint8) * 255
    binary_src = image_to_base64(binary_display)
    
    # Run connected components algorithm
    labels, stats = connected_components_labeling(binary_image, connectivity)
    
    if labels is not None:
        # Create labeled image for display
        labeled_display = labels.copy()
        labeled_src = image_to_base64(labeled_display, 'viridis')
        
        # Create algorithm visualization
        algorithm_plot = create_algorithm_visualization(labels, show_steps)
        
        # Calculate component statistics
        component_stats = calculate_component_stats(labels)
        
        # Create statistics display
        if component_stats:
            stats_html = html.Div([
                html.H5(f"Found {len(component_stats)} components"),
                html.Div([
                    html.Div([
                        html.P(f"Component {stat['label']}: Area = {stat['area']}, Compactness = {stat['compactness']:.3f}")
                    ]) for stat in component_stats
                ])
            ])
        else:
            stats_html = "No components found"
    else:
        labeled_src = None
        algorithm_plot = go.Figure()
        stats_html = "Algorithm not run"
    
    return editor, binary_src, labeled_src, algorithm_plot, stats_html
