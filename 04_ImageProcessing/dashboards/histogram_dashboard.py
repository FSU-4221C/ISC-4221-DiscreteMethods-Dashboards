"""
Histogram Analysis and Contrast Stretching Dashboard
Interactive tool for understanding image histograms and contrast enhancement.
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

def create_histogram_dashboard() -> html.Div:
    """Create the histogram analysis and contrast stretching dashboard."""
    
    return html.Div([
        # Title and description
        html.Div([
            html.H2("📊 Histogram Analysis & Contrast Stretching", 
                   style={'color': '#2c3e50', 'marginBottom': '10px'}),
            html.P("Upload an image and explore how pixel intensity distributions affect image appearance. "
                   "Use contrast stretching to enhance low-contrast images.",
                   style={'color': '#7f8c8d', 'fontSize': '16px'})
        ], style={'marginBottom': '30px'}),
        
        # Controls section
        html.Div([
            html.Div([
                html.Label("Upload Image:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                dcc.Upload(
                    id='histogram-upload',
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
                html.Label("Contrast Stretching Parameters:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Min Value:", style={'display': 'inline-block', 'width': '80px'}),
                    dcc.Slider(
                        id='histogram-min-slider',
                        min=0, max=255, value=0, step=1,
                        marks={i: str(i) for i in range(0, 256, 50)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Div([
                    html.Label("Max Value:", style={'display': 'inline-block', 'width': '80px'}),
                    dcc.Slider(
                        id='histogram-max-slider',
                        min=0, max=255, value=255, step=1,
                        marks={i: str(i) for i in range(0, 256, 50)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Button('Reset to Original', id='histogram-reset-btn', 
                           style={'backgroundColor': '#3498db', 'color': 'white', 'border': 'none', 
                                 'padding': '10px 20px', 'borderRadius': '5px', 'cursor': 'pointer'})
            ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Image display section
        html.Div([
            html.Div([
                html.H4("Original Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='histogram-original-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Processed Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='histogram-processed-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'marginLeft': '4%', 'textAlign': 'center'})
        ], style={'marginBottom': '30px'}),
        
        # Histogram visualization
        html.Div([
            html.Div([
                html.H4("Original Histogram", style={'textAlign': 'center', 'marginBottom': '10px'}),
                dcc.Graph(id='histogram-original-plot')
            ], style={'width': '48%', 'display': 'inline-block'}),
            
            html.Div([
                html.H4("Processed Histogram", style={'textAlign': 'center', 'marginBottom': '10px'}),
                dcc.Graph(id='histogram-processed-plot')
            ], style={'width': '48%', 'display': 'inline-block', 'marginLeft': '4%'})
        ], style={'marginBottom': '30px'}),
        
        # Statistics display
        html.Div([
            html.H4("Image Statistics", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='histogram-stats', style={'textAlign': 'center'})
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

def apply_contrast_stretching(image: np.ndarray, min_val: int, max_val: int) -> np.ndarray:
    """Apply contrast stretching to an image."""
    if image is None:
        return None
    
    # Find actual min and max in the image
    actual_min = np.min(image)
    actual_max = np.max(image)
    
    # Apply contrast stretching
    if actual_max > actual_min:
        stretched = ((image - actual_min) / (actual_max - actual_min)) * (max_val - min_val) + min_val
        stretched = np.clip(stretched, 0, 255).astype(np.uint8)
    else:
        stretched = image.copy()
    
    return stretched

def create_histogram_plot(image: np.ndarray, title: str) -> go.Figure:
    """Create a histogram plot for an image."""
    if image is None:
        return go.Figure()
    
    # Calculate histogram
    hist, bins = np.histogram(image.flatten(), bins=256, range=(0, 256))
    
    fig = go.Figure(data=[
        go.Bar(x=bins[:-1], y=hist, name='Pixel Count', marker_color='steelblue')
    ])
    
    fig.update_layout(
        title=title,
        xaxis_title='Pixel Intensity',
        yaxis_title='Count',
        height=300,
        showlegend=False
    )
    
    return fig

def calculate_image_stats(image: np.ndarray) -> Dict[str, float]:
    """Calculate basic statistics for an image."""
    if image is None:
        return {}
    
    return {
        'mean': float(np.mean(image)),
        'std': float(np.std(image)),
        'min': float(np.min(image)),
        'max': float(np.max(image)),
        'range': float(np.max(image) - np.min(image))
    }

# Callbacks for histogram dashboard
@callback(
    [Output('histogram-original-image', 'src'),
     Output('histogram-processed-image', 'src'),
     Output('histogram-original-plot', 'figure'),
     Output('histogram-processed-plot', 'figure'),
     Output('histogram-stats', 'children')],
    [Input('histogram-upload', 'contents'),
     Input('histogram-min-slider', 'value'),
     Input('histogram-max-slider', 'value'),
     Input('histogram-reset-btn', 'n_clicks')]
)
def update_histogram_display(contents, min_val, max_val, reset_clicks):
    """Update the histogram dashboard display."""
    
    if contents is None:
        # Return empty plots and no image
        empty_fig = go.Figure()
        empty_fig.update_layout(height=300, showlegend=False)
        
        return None, None, empty_fig, empty_fig, "Upload an image to see statistics"
    
    # Parse uploaded image
    original_image = parse_uploaded_image(contents)
    
    if original_image is None:
        return None, None, go.Figure(), go.Figure(), "Error processing image"
    
    # Apply contrast stretching
    processed_image = apply_contrast_stretching(original_image, min_val, max_val)
    
    # Convert images to base64 for display
    def image_to_base64(img):
        pil_img = Image.fromarray(img)
        buffer = io.BytesIO()
        pil_img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
    
    original_src = image_to_base64(original_image)
    processed_src = image_to_base64(processed_image)
    
    # Create histogram plots
    original_hist = create_histogram_plot(original_image, "Original Histogram")
    processed_hist = create_histogram_plot(processed_image, "Processed Histogram")
    
    # Calculate statistics
    original_stats = calculate_image_stats(original_image)
    processed_stats = calculate_image_stats(processed_image)
    
    # Create statistics display
    stats_html = html.Div([
        html.Div([
            html.H5("Original Image", style={'color': '#2c3e50'}),
            html.P(f"Mean: {original_stats['mean']:.2f}"),
            html.P(f"Std Dev: {original_stats['std']:.2f}"),
            html.P(f"Range: {original_stats['range']:.2f}")
        ], style={'display': 'inline-block', 'marginRight': '50px'}),
        
        html.Div([
            html.H5("Processed Image", style={'color': '#2c3e50'}),
            html.P(f"Mean: {processed_stats['mean']:.2f}"),
            html.P(f"Std Dev: {processed_stats['std']:.2f}"),
            html.P(f"Range: {processed_stats['range']:.2f}")
        ], style={'display': 'inline-block'})
    ])
    
    return original_src, processed_src, original_hist, processed_hist, stats_html
