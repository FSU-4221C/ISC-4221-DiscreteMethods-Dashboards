"""
Convolution Filter Playground Dashboard
Interactive tool for understanding convolutional filters and kernel operations.
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

def create_convolution_dashboard() -> html.Div:
    """Create the convolution filter playground dashboard."""
    
    return html.Div([
        # Title and description
        html.Div([
            html.H2("🔧 Convolution Filter Playground", 
                   style={'color': '#2c3e50', 'marginBottom': '10px'}),
            html.P("Upload an image and experiment with different convolution kernels. "
                   "Modify kernel values in real-time and see the effects on your image.",
                   style={'color': '#7f8c8d', 'fontSize': '16px'})
        ], style={'marginBottom': '30px'}),
        
        # Controls section
        html.Div([
            html.Div([
                html.Label("Upload Image:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                dcc.Upload(
                    id='convolution-upload',
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
                html.Label("Filter Controls:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Kernel Size:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.RadioItems(
                        id='convolution-kernel-size',
                        options=[
                            {'label': '3x3', 'value': 3},
                            {'label': '5x5', 'value': 5},
                            {'label': '7x7', 'value': 7}
                        ],
                        value=3,
                        inline=True,
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Div([
                    html.Label("Filter Presets:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Dropdown(
                        id='convolution-presets',
                        options=[
                            {'label': 'Custom', 'value': 'custom'},
                            {'label': 'Blur (Box)', 'value': 'blur'},
                            {'label': 'Gaussian Blur', 'value': 'gaussian'},
                            {'label': 'Sharpen', 'value': 'sharpen'},
                            {'label': 'Edge Detection (Sobel X)', 'value': 'sobel_x'},
                            {'label': 'Edge Detection (Sobel Y)', 'value': 'sobel_y'},
                            {'label': 'Laplacian', 'value': 'laplacian'},
                            {'label': 'Emboss', 'value': 'emboss'}
                        ],
                        value='custom',
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Button('Reset Kernel', id='convolution-reset-btn', 
                           style={'backgroundColor': '#95a5a6', 'color': 'white', 'border': 'none', 
                                 'padding': '8px 16px', 'borderRadius': '5px', 'cursor': 'pointer'})
            ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Kernel editor section
        html.Div([
            html.H4("Kernel Editor", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='convolution-kernel-editor', style={'textAlign': 'center'})
        ], style={'backgroundColor': '#ecf0f1', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Image display section
        html.Div([
            html.Div([
                html.H4("Original Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='convolution-original-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Filtered Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='convolution-filtered-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '48%', 'display': 'inline-block', 'marginLeft': '4%', 'textAlign': 'center'})
        ], style={'marginBottom': '30px'}),
        
        # Kernel visualization
        html.Div([
            html.H4("Kernel Visualization", style={'textAlign': 'center', 'marginBottom': '20px'}),
            dcc.Graph(id='convolution-kernel-heatmap', style={'height': '300px'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px'})
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

def get_preset_kernel(preset: str, size: int) -> np.ndarray:
    """Get a preset kernel based on the selected preset."""
    if preset == 'blur':
        return np.ones((size, size)) / (size * size)
    elif preset == 'gaussian':
        # Create Gaussian kernel
        kernel = np.zeros((size, size))
        center = size // 2
        sigma = size / 6.0
        for i in range(size):
            for j in range(size):
                kernel[i, j] = np.exp(-((i - center)**2 + (j - center)**2) / (2 * sigma**2))
        return kernel / np.sum(kernel)
    elif preset == 'sharpen':
        if size == 3:
            return np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        else:
            # Create larger sharpen kernel
            kernel = np.zeros((size, size))
            center = size // 2
            kernel[center, center] = size * size
            kernel -= 1
            return kernel
    elif preset == 'sobel_x':
        if size == 3:
            return np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
        else:
            return np.zeros((size, size))
    elif preset == 'sobel_y':
        if size == 3:
            return np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
        else:
            return np.zeros((size, size))
    elif preset == 'laplacian':
        if size == 3:
            return np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]])
        else:
            return np.zeros((size, size))
    elif preset == 'emboss':
        if size == 3:
            return np.array([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]])
        else:
            return np.zeros((size, size))
    else:
        # Custom - return identity-like kernel
        kernel = np.zeros((size, size))
        kernel[size//2, size//2] = 1
        return kernel

def apply_convolution(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Apply convolution to an image."""
    if image is None or kernel is None:
        return None
    
    # Apply convolution using OpenCV
    filtered = cv2.filter2D(image, -1, kernel)
    
    # Clip values to valid range
    filtered = np.clip(filtered, 0, 255).astype(np.uint8)
    
    return filtered

def create_kernel_heatmap(kernel: np.ndarray) -> go.Figure:
    """Create a heatmap visualization of the kernel."""
    if kernel is None:
        return go.Figure()
    
    fig = go.Figure(data=go.Heatmap(
        z=kernel,
        colorscale='RdBu',
        showscale=True,
        hoverongaps=False
    ))
    
    fig.update_layout(
        title="Kernel Values",
        xaxis_title="Column",
        yaxis_title="Row",
        height=300
    )
    
    return fig

def create_kernel_editor(kernel: np.ndarray) -> html.Div:
    """Create an interactive kernel editor."""
    if kernel is None:
        return html.Div("No kernel available")
    
    size = kernel.shape[0]
    
    # Create input fields for each kernel value
    inputs = []
    for i in range(size):
        row_inputs = []
        for j in range(size):
            input_id = f'kernel-{i}-{j}'
            row_inputs.append(
                dcc.Input(
                    id=input_id,
                    type='number',
                    value=kernel[i, j],
                    step=0.1,
                    style={'width': '60px', 'margin': '2px', 'textAlign': 'center'}
                )
            )
        inputs.append(html.Div(row_inputs, style={'marginBottom': '5px'}))
    
    return html.Div([
        html.Div(inputs, style={'display': 'inline-block'}),
        html.Br(),
        html.Button('Apply Kernel', id='convolution-apply-kernel', 
                   style={'backgroundColor': '#27ae60', 'color': 'white', 'border': 'none', 
                         'padding': '10px 20px', 'borderRadius': '5px', 'cursor': 'pointer'})
    ])

def image_to_base64(img: np.ndarray) -> str:
    """Convert numpy array image to base64 string."""
    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Callbacks for convolution dashboard
@callback(
    [Output('convolution-kernel-editor', 'children'),
     Output('convolution-original-image', 'src'),
     Output('convolution-filtered-image', 'src'),
     Output('convolution-kernel-heatmap', 'figure')],
    [Input('convolution-upload', 'contents'),
     Input('convolution-kernel-size', 'value'),
     Input('convolution-presets', 'value'),
     Input('convolution-reset-btn', 'n_clicks')]
)
def update_convolution_display(contents, kernel_size, preset, reset_clicks):
    """Update the convolution dashboard display."""
    
    # Get kernel based on preset
    kernel = get_preset_kernel(preset, kernel_size)
    
    # Create kernel editor
    kernel_editor = create_kernel_editor(kernel)
    
    # Parse uploaded image
    if contents is None:
        empty_fig = go.Figure()
        empty_fig.update_layout(height=300, showlegend=False)
        return kernel_editor, None, None, empty_fig
    
    original_image = parse_uploaded_image(contents)
    
    if original_image is None:
        return kernel_editor, None, None, go.Figure()
    
    # Apply convolution
    filtered_image = apply_convolution(original_image, kernel)
    
    # Convert images to base64
    original_src = image_to_base64(original_image)
    filtered_src = image_to_base64(filtered_image) if filtered_image is not None else None
    
    # Create kernel heatmap
    kernel_heatmap = create_kernel_heatmap(kernel)
    
    return kernel_editor, original_src, filtered_src, kernel_heatmap
