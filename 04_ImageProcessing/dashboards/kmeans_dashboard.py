"""
K-Means Color Quantization Dashboard
Interactive tool for understanding clustering algorithms and color reduction.
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
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Create a separate Dash app instance for this dashboard

def create_kmeans_dashboard() -> html.Div:
    """Create the K-means color quantization dashboard."""
    
    return html.Div([
        # Title and description
        html.Div([
            html.H2("🎨 K-Means Color Quantization", 
                   style={'color': '#2c3e50', 'marginBottom': '10px'}),
            html.P("Upload a color image and explore how K-means clustering can reduce the number of colors "
                   "while preserving visual quality. Watch the algorithm converge in 3D color space.",
                   style={'color': '#7f8c8d', 'fontSize': '16px'})
        ], style={'marginBottom': '30px'}),
        
        # Controls section
        html.Div([
            html.Div([
                html.Label("Upload Color Image:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                dcc.Upload(
                    id='kmeans-upload',
                    children=html.Div([
                        'Drag and Drop or ',
                        html.A('Select a Color Image')
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
                html.Label("K-Means Parameters:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Number of Colors (K):", style={'display': 'inline-block', 'width': '150px'}),
                    dcc.Slider(
                        id='kmeans-k-slider',
                        min=2, max=20, value=8, step=1,
                        marks={i: str(i) for i in range(2, 21, 2)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Div([
                    html.Label("Max Iterations:", style={'display': 'inline-block', 'width': '150px'}),
                    dcc.Slider(
                        id='kmeans-iterations-slider',
                        min=5, max=50, value=20, step=5,
                        marks={i: str(i) for i in range(5, 51, 10)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Button('Run K-Means', id='kmeans-run-btn', 
                           style={'backgroundColor': '#e74c3c', 'color': 'white', 'border': 'none', 
                                 'padding': '10px 20px', 'borderRadius': '5px', 'cursor': 'pointer',
                                 'marginRight': '10px'}),
                html.Button('Reset', id='kmeans-reset-btn', 
                           style={'backgroundColor': '#95a5a6', 'color': 'white', 'border': 'none', 
                                 'padding': '10px 20px', 'borderRadius': '5px', 'cursor': 'pointer'})
            ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Image display section
        html.Div([
            html.Div([
                html.H4("Original Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='kmeans-original-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Quantized Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='kmeans-quantized-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'marginLeft': '4%', 'textAlign': 'center'})
        ], style={'marginBottom': '30px'}),
        
        # 3D Color Space Visualization
        html.Div([
            html.H4("3D Color Space Visualization", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div([
                html.Div([
                    html.Label("Visualization Type:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                    dcc.RadioItems(
                        id='kmeans-viz-type',
                        options=[
                            {'label': 'Sample Points', 'value': 'sample'},
                            {'label': 'Centroids Only', 'value': 'centroids'},
                            {'label': 'Both', 'value': 'both'}
                        ],
                        value='both',
                        style={'marginBottom': '20px'}
                    )
                ], style={'width': '30%', 'display': 'inline-block', 'verticalAlign': 'top'}),
                
                html.Div([
                    html.Label("Sample Size:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                    dcc.Slider(
                        id='kmeans-sample-size',
                        min=100, max=5000, value=1000, step=100,
                        marks={i: str(i) for i in range(100, 5001, 1000)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
            ]),
            
            dcc.Graph(id='kmeans-3d-plot', style={'height': '500px'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Algorithm Progress
        html.Div([
            html.H4("Algorithm Progress", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='kmeans-progress', style={'textAlign': 'center', 'fontSize': '16px'})
        ], style={'backgroundColor': '#ecf0f1', 'padding': '20px', 'borderRadius': '10px'})
    ])

def parse_uploaded_color_image(contents: str) -> np.ndarray:
    """Parse uploaded color image from base64 string."""
    if contents is None:
        return None
    
    # Remove data URL prefix
    content_type, content_string = contents.split(',')
    
    # Decode base64
    image_data = base64.b64decode(content_string)
    
    # Convert to PIL Image
    image = Image.open(io.BytesIO(image_data))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy array
    return np.array(image)

def apply_kmeans_quantization(image: np.ndarray, k: int, max_iter: int = 20) -> Tuple[np.ndarray, np.ndarray, List]:
    """Apply K-means clustering to quantize colors."""
    if image is None:
        return None, None, []
    
    # Reshape image to 2D array of pixels
    pixels = image.reshape(-1, 3)
    
    # Apply K-means
    kmeans = KMeans(n_clusters=k, random_state=42, max_iter=max_iter, n_init=10)
    labels = kmeans.fit_predict(pixels)
    centroids = kmeans.cluster_centers_
    
    # Create quantized image
    quantized_pixels = centroids[labels]
    quantized_image = quantized_pixels.reshape(image.shape)
    
    # Track convergence
    convergence_history = []
    for i in range(max_iter):
        # This is a simplified version - in practice, you'd track the actual convergence
        convergence_history.append({
            'iteration': i + 1,
            'inertia': kmeans.inertia_ if hasattr(kmeans, 'inertia_') else 0
        })
    
    return quantized_image.astype(np.uint8), centroids, convergence_history

def create_3d_color_plot(image: np.ndarray, centroids: np.ndarray, viz_type: str, sample_size: int) -> go.Figure:
    """Create 3D scatter plot of color space."""
    if image is None:
        return go.Figure()
    
    # Sample pixels for visualization
    pixels = image.reshape(-1, 3)
    if len(pixels) > sample_size:
        indices = np.random.choice(len(pixels), sample_size, replace=False)
        sample_pixels = pixels[indices]
    else:
        sample_pixels = pixels
    
    fig = go.Figure()
    
    # Add sample points
    if viz_type in ['sample', 'both']:
        fig.add_trace(go.Scatter3d(
            x=sample_pixels[:, 0],
            y=sample_pixels[:, 1],
            z=sample_pixels[:, 2],
            mode='markers',
            marker=dict(
                size=2,
                color=['rgb({},{},{})'.format(r,g,b) for r,g,b in sample_pixels],
                opacity=0.6
            ),
            name='Sample Pixels'
        ))
    
    # Add centroids
    if centroids is not None and viz_type in ['centroids', 'both']:
        fig.add_trace(go.Scatter3d(
            x=centroids[:, 0],
            y=centroids[:, 1],
            z=centroids[:, 2],
            mode='markers',
            marker=dict(
                size=8,
                color=['rgb({},{},{})'.format(int(r),int(g),int(b)) for r,g,b in centroids],
                symbol='diamond',
                line=dict(width=2, color='black')
            ),
            name='Centroids'
        ))
    
    fig.update_layout(
        title="3D RGB Color Space",
        scene=dict(
            xaxis_title='Red',
            yaxis_title='Green',
            zaxis_title='Blue',
            bgcolor='white'
        ),
        height=500
    )
    
    return fig

def image_to_base64(img: np.ndarray) -> str:
    """Convert numpy array image to base64 string."""
    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Callbacks for K-means dashboard
@callback(
    [Output('kmeans-original-image', 'src'),
     Output('kmeans-quantized-image', 'src'),
     Output('kmeans-3d-plot', 'figure'),
     Output('kmeans-progress', 'children')],
    [Input('kmeans-upload', 'contents'),
     Input('kmeans-run-btn', 'n_clicks'),
     Input('kmeans-k-slider', 'value'),
     Input('kmeans-iterations-slider', 'value'),
     Input('kmeans-viz-type', 'value'),
     Input('kmeans-sample-size', 'value')],
    [State('kmeans-reset-btn', 'n_clicks')]
)
def update_kmeans_display(contents, run_clicks, k_value, max_iter, viz_type, sample_size, reset_clicks):
    """Update the K-means dashboard display."""
    
    if contents is None:
        empty_fig = go.Figure()
        empty_fig.update_layout(height=500, showlegend=False)
        return None, None, empty_fig, "Upload a color image to begin"
    
    # Parse uploaded image
    original_image = parse_uploaded_color_image(contents)
    
    if original_image is None:
        return None, None, go.Figure(), "Error processing image"
    
    # Convert original image to base64
    original_src = image_to_base64(original_image)
    
    # Apply K-means quantization
    quantized_image, centroids, convergence_history = apply_kmeans_quantization(
        original_image, k_value, max_iter
    )
    
    if quantized_image is not None:
        quantized_src = image_to_base64(quantized_image)
    else:
        quantized_src = None
    
    # Create 3D color space plot
    color_plot = create_3d_color_plot(original_image, centroids, viz_type, sample_size)
    
    # Create progress display
    if convergence_history:
        progress_text = f"K-means completed with {k_value} clusters. Final inertia: {convergence_history[-1]['inertia']:.2f}"
    else:
        progress_text = "Ready to run K-means clustering"
    
    return original_src, quantized_src, color_plot, progress_text
