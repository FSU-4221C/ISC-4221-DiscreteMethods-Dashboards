"""
Edge Detection Explorer Dashboard
Interactive tool for understanding edge detection algorithms and gradient computation.
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

# Create a separate Dash app instance for this dashboard

def create_edge_dashboard() -> html.Div:
    """Create the edge detection explorer dashboard."""
    
    return html.Div([
        # Title and description
        html.Div([
            html.H2("📐 Edge Detection Explorer", 
                   style={'color': '#2c3e50', 'marginBottom': '10px'}),
            html.P("Upload an image and explore different edge detection methods. "
                   "Understand how gradients are computed and how thresholding affects edge detection.",
                   style={'color': '#7f8c8d', 'fontSize': '16px'})
        ], style={'marginBottom': '30px'}),
        
        # Controls section
        html.Div([
            html.Div([
                html.Label("Upload Image:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                dcc.Upload(
                    id='edge-upload',
                    children=html.Div([
                        'Drag and Drop or ',
                        html.A('Select an Image')
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
                html.Label("Edge Detection Controls:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Method:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Dropdown(
                        id='edge-method',
                        options=[
                            {'label': 'Sobel X', 'value': 'sobel_x'},
                            {'label': 'Sobel Y', 'value': 'sobel_y'},
                            {'label': 'Sobel Combined', 'value': 'sobel_combined'},
                            {'label': 'Prewitt X', 'value': 'prewitt_x'},
                            {'label': 'Prewitt Y', 'value': 'prewitt_y'},
                            {'label': 'Prewitt Combined', 'value': 'prewitt_combined'},
                            {'label': 'Laplacian', 'value': 'laplacian'},
                            {'label': 'Canny', 'value': 'canny'}
                        ],
                        value='sobel_combined',
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Div([
                    html.Label("Threshold:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Slider(
                        id='edge-threshold',
                        min=0, max=255, value=50, step=5,
                        marks={i: str(i) for i in range(0, 256, 50)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Div([
                    html.Label("Show Gradient:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Checklist(
                        id='edge-show-gradient',
                        options=[
                            {'label': 'Show Gradient Magnitude', 'value': 'magnitude'},
                            {'label': 'Show Gradient Direction', 'value': 'direction'}
                        ],
                        value=[],
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Button('Reset', id='edge-reset-btn', 
                           style={'backgroundColor': '#95a5a6', 'color': 'white', 'border': 'none', 
                                 'padding': '8px 16px', 'borderRadius': '5px', 'cursor': 'pointer'})
            ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Image display section
        html.Div([
            html.Div([
                html.H4("Original Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='edge-original-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Edge Detection Result", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='edge-result-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'marginLeft': '4%', 'textAlign': 'center'})
        ], style={'marginBottom': '30px'}),
        
        # Gradient visualization
        html.Div([
            html.H4("Gradient Visualization", style={'textAlign': 'center', 'marginBottom': '20px'}),
            dcc.Graph(id='edge-gradient-plot', style={'height': '400px'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Edge statistics
        html.Div([
            html.H4("Edge Statistics", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='edge-stats', style={'textAlign': 'center'})
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
    
    # Convert to numpy array
    return np.array(image)

def detect_edges(image: np.ndarray, method: str, threshold: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Detect edges in an image using the specified method."""
    if image is None:
        return None, None, None
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(image, (3, 3), 0)
    
    if method == 'sobel_x':
        edges = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
        edges = np.abs(edges)
    elif method == 'sobel_y':
        edges = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
        edges = np.abs(edges)
    elif method == 'sobel_combined':
        grad_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
        edges = np.sqrt(grad_x**2 + grad_y**2)
    elif method == 'prewitt_x':
        kernel_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        edges = cv2.filter2D(blurred, -1, kernel_x)
        edges = np.abs(edges)
    elif method == 'prewitt_y':
        kernel_y = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        edges = cv2.filter2D(blurred, -1, kernel_y)
        edges = np.abs(edges)
    elif method == 'prewitt_combined':
        kernel_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
        kernel_y = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]])
        grad_x = cv2.filter2D(blurred, -1, kernel_x)
        grad_y = cv2.filter2D(blurred, -1, kernel_y)
        edges = np.sqrt(grad_x**2 + grad_y**2)
    elif method == 'laplacian':
        edges = cv2.Laplacian(blurred, cv2.CV_64F)
        edges = np.abs(edges)
    elif method == 'canny':
        edges = cv2.Canny(blurred, threshold, threshold*2)
        return edges, None, None
    else:
        edges = blurred.copy()
    
    # Normalize to 0-255 range
    edges = np.clip(edges, 0, 255).astype(np.uint8)
    
    # Apply threshold
    binary_edges = (edges > threshold).astype(np.uint8) * 255
    
    return binary_edges, edges, None

def calculate_gradients(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Calculate gradient magnitude and direction."""
    if image is None:
        return None, None, None
    
    # Apply Gaussian blur
    blurred = cv2.GaussianBlur(image, (3, 3), 0)
    
    # Calculate gradients
    grad_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
    
    # Calculate magnitude and direction
    magnitude = np.sqrt(grad_x**2 + grad_y**2)
    direction = np.arctan2(grad_y, grad_x)
    
    return magnitude, direction, grad_x, grad_y

def create_gradient_plot(magnitude: np.ndarray, direction: np.ndarray, show_magnitude: bool, show_direction: bool) -> go.Figure:
    """Create a plot showing gradient information."""
    if magnitude is None or direction is None:
        return go.Figure()
    
    fig = go.Figure()
    
    if show_magnitude:
        # Sample points for magnitude visualization
        h, w = magnitude.shape
        y, x = np.mgrid[0:h:10, 0:w:10]
        mag_sample = magnitude[::10, ::10]
        
        fig.add_trace(go.Heatmap(
            z=magnitude,
            colorscale='Viridis',
            name='Gradient Magnitude',
            showscale=True
        ))
    
    if show_direction:
        # Sample points for direction visualization
        h, w = direction.shape
        y, x = np.mgrid[0:h:20, 0:w:20]
        dir_sample = direction[::20, ::20]
        
        # Create quiver plot for direction
        u = np.cos(dir_sample)
        v = np.sin(dir_sample)
        
        fig.add_trace(go.Scatter(
            x=x.flatten(),
            y=y.flatten(),
            mode='markers',
            marker=dict(
                size=3,
                color=dir_sample.flatten(),
                colorscale='HSV',
                showscale=True
            ),
            name='Gradient Direction'
        ))
    
    fig.update_layout(
        title="Gradient Visualization",
        xaxis_title="X",
        yaxis_title="Y",
        height=400
    )
    
    return fig

def calculate_edge_stats(edges: np.ndarray) -> Dict[str, float]:
    """Calculate statistics for edge detection results."""
    if edges is None:
        return {}
    
    # Count edge pixels
    edge_pixels = np.sum(edges > 0)
    total_pixels = edges.size
    
    # Edge density
    edge_density = edge_pixels / total_pixels
    
    # Edge strength statistics
    edge_strength = np.mean(edges[edges > 0]) if edge_pixels > 0 else 0
    
    return {
        'edge_pixels': int(edge_pixels),
        'total_pixels': int(total_pixels),
        'edge_density': edge_density,
        'edge_strength': edge_strength
    }

def image_to_base64(img: np.ndarray) -> str:
    """Convert numpy array image to base64 string."""
    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Callbacks for edge dashboard
@callback(
    [Output('edge-original-image', 'src'),
     Output('edge-result-image', 'src'),
     Output('edge-gradient-plot', 'figure'),
     Output('edge-stats', 'children')],
    [Input('edge-upload', 'contents'),
     Input('edge-method', 'value'),
     Input('edge-threshold', 'value'),
     Input('edge-show-gradient', 'value'),
     Input('edge-reset-btn', 'n_clicks')]
)
def update_edge_display(contents, method, threshold, show_gradient, reset_clicks):
    """Update the edge detection dashboard display."""
    
    if contents is None:
        empty_fig = go.Figure()
        empty_fig.update_layout(height=400, showlegend=False)
        return None, None, empty_fig, "Upload an image to see edge detection results"
    
    # Parse uploaded image
    original_image = parse_uploaded_image(contents)
    
    if original_image is None:
        return None, None, go.Figure(), "Error processing image"
    
    # Detect edges
    binary_edges, edge_magnitude, _ = detect_edges(original_image, method, threshold)
    
    # Calculate gradients for visualization
    magnitude, direction, grad_x, grad_y = calculate_gradients(original_image)
    
    # Convert images to base64
    original_src = image_to_base64(original_image)
    result_src = image_to_base64(binary_edges) if binary_edges is not None else None
    
    # Create gradient plot
    show_magnitude = 'magnitude' in show_gradient
    show_direction = 'direction' in show_gradient
    gradient_plot = create_gradient_plot(magnitude, direction, show_magnitude, show_direction)
    
    # Calculate statistics
    stats = calculate_edge_stats(binary_edges)
    
    # Create statistics display
    if stats:
        stats_html = html.Div([
            html.P(f"Edge Pixels: {stats['edge_pixels']:,}"),
            html.P(f"Total Pixels: {stats['total_pixels']:,}"),
            html.P(f"Edge Density: {stats['edge_density']:.3f}"),
            html.P(f"Average Edge Strength: {stats['edge_strength']:.2f}")
        ])
    else:
        stats_html = "No statistics available"
    
    return original_src, result_src, gradient_plot, stats_html
