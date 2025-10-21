"""
Noise Reduction Laboratory Dashboard
Interactive tool for understanding different noise types and appropriate filtering methods.
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

def create_noise_dashboard() -> html.Div:
    """Create the noise reduction laboratory dashboard."""
    
    return html.Div([
        # Title and description
        html.Div([
            html.H2("🔇 Noise Reduction Laboratory", 
                   style={'color': '#2c3e50', 'marginBottom': '10px'}),
            html.P("Upload an image and experiment with different types of noise and filtering methods. "
                   "Learn why different noise types require different solutions.",
                   style={'color': '#7f8c8d', 'fontSize': '16px'})
        ], style={'marginBottom': '30px'}),
        
        # Controls section
        html.Div([
            html.Div([
                html.Label("Upload Image:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                dcc.Upload(
                    id='noise-upload',
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
                html.Label("Noise Controls:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Noise Type:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Dropdown(
                        id='noise-type',
                        options=[
                            {'label': 'None (Clean)', 'value': 'none'},
                            {'label': 'Salt & Pepper', 'value': 'salt_pepper'},
                            {'label': 'Gaussian', 'value': 'gaussian'},
                            {'label': 'Uniform', 'value': 'uniform'},
                            {'label': 'Poisson', 'value': 'poisson'}
                        ],
                        value='none',
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Div([
                    html.Label("Noise Intensity:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Slider(
                        id='noise-intensity',
                        min=0, max=100, value=20, step=5,
                        marks={i: str(i) for i in range(0, 101, 20)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Label("Filter Controls:", style={'fontWeight': 'bold', 'marginBottom': '10px'}),
                html.Div([
                    html.Label("Filter Type:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Dropdown(
                        id='filter-type',
                        options=[
                            {'label': 'None', 'value': 'none'},
                            {'label': 'Median Filter', 'value': 'median'},
                            {'label': 'Gaussian Filter', 'value': 'gaussian'},
                            {'label': 'Mean Filter', 'value': 'mean'},
                            {'label': 'Bilateral Filter', 'value': 'bilateral'}
                        ],
                        value='none',
                        style={'marginBottom': '15px'}
                    )
                ]),
                
                html.Div([
                    html.Label("Filter Size:", style={'display': 'inline-block', 'width': '100px'}),
                    dcc.Slider(
                        id='filter-size',
                        min=3, max=15, value=5, step=2,
                        marks={i: str(i) for i in range(3, 16, 4)},
                        tooltip={"placement": "bottom", "always_visible": True}
                    )
                ], style={'marginBottom': '15px'}),
                
                html.Button('Reset', id='noise-reset-btn', 
                           style={'backgroundColor': '#95a5a6', 'color': 'white', 'border': 'none', 
                                 'padding': '8px 16px', 'borderRadius': '5px', 'cursor': 'pointer'})
            ], style={'width': '65%', 'display': 'inline-block', 'marginLeft': '5%', 'verticalAlign': 'top'})
        ], style={'backgroundColor': '#f8f9fa', 'padding': '20px', 'borderRadius': '10px', 'marginBottom': '20px'}),
        
        # Image display section
        html.Div([
            html.Div([
                html.H4("Original Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='noise-original-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '32%', 'display': 'inline-block', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Noisy Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='noise-noisy-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '32%', 'display': 'inline-block', 'marginLeft': '2%', 'textAlign': 'center'}),
            
            html.Div([
                html.H4("Filtered Image", style={'textAlign': 'center', 'marginBottom': '10px'}),
                html.Img(id='noise-filtered-image', style={'maxWidth': '100%', 'height': 'auto'})
            ], style={'width': '32%', 'display': 'inline-block', 'marginLeft': '2%', 'textAlign': 'center'})
        ], style={'marginBottom': '30px'}),
        
        # Performance metrics
        html.Div([
            html.H4("Performance Metrics", style={'textAlign': 'center', 'marginBottom': '20px'}),
            html.Div(id='noise-metrics', style={'textAlign': 'center'})
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

def add_noise(image: np.ndarray, noise_type: str, intensity: int) -> np.ndarray:
    """Add noise to an image."""
    if image is None:
        return None
    
    noisy_image = image.copy().astype(np.float32)
    
    if noise_type == 'salt_pepper':
        # Salt and pepper noise
        noise = np.random.random(image.shape)
        noisy_image[noise < intensity/200] = 0  # Pepper
        noisy_image[noise > 1 - intensity/200] = 255  # Salt
    elif noise_type == 'gaussian':
        # Gaussian noise
        noise = np.random.normal(0, intensity, image.shape)
        noisy_image = noisy_image + noise
    elif noise_type == 'uniform':
        # Uniform noise
        noise = np.random.uniform(-intensity, intensity, image.shape)
        noisy_image = noisy_image + noise
    elif noise_type == 'poisson':
        # Poisson noise
        noisy_image = np.random.poisson(noisy_image)
    else:
        # No noise
        return image
    
    # Clip values to valid range
    noisy_image = np.clip(noisy_image, 0, 255).astype(np.uint8)
    
    return noisy_image

def apply_filter(image: np.ndarray, filter_type: str, filter_size: int) -> np.ndarray:
    """Apply a filter to an image."""
    if image is None or filter_type == 'none':
        return image
    
    if filter_type == 'median':
        return cv2.medianBlur(image, filter_size)
    elif filter_type == 'gaussian':
        sigma = filter_size / 6.0
        return cv2.GaussianBlur(image, (filter_size, filter_size), sigma)
    elif filter_type == 'mean':
        kernel = np.ones((filter_size, filter_size), np.float32) / (filter_size * filter_size)
        return cv2.filter2D(image, -1, kernel)
    elif filter_type == 'bilateral':
        return cv2.bilateralFilter(image, filter_size, 80, 80)
    else:
        return image

def calculate_metrics(original: np.ndarray, noisy: np.ndarray, filtered: np.ndarray) -> Dict[str, float]:
    """Calculate performance metrics."""
    if original is None or noisy is None or filtered is None:
        return {}
    
    # Mean Squared Error
    mse_noisy = np.mean((original.astype(np.float32) - noisy.astype(np.float32)) ** 2)
    mse_filtered = np.mean((original.astype(np.float32) - filtered.astype(np.float32)) ** 2)
    
    # Peak Signal-to-Noise Ratio
    psnr_noisy = 20 * np.log10(255.0 / np.sqrt(mse_noisy)) if mse_noisy > 0 else float('inf')
    psnr_filtered = 20 * np.log10(255.0 / np.sqrt(mse_filtered)) if mse_filtered > 0 else float('inf')
    
    # Structural Similarity Index (simplified)
    def ssim(img1, img2):
        mu1 = np.mean(img1)
        mu2 = np.mean(img2)
        sigma1 = np.var(img1)
        sigma2 = np.var(img2)
        sigma12 = np.mean((img1 - mu1) * (img2 - mu2))
        
        c1 = 0.01 ** 2
        c2 = 0.03 ** 2
        
        ssim = ((2 * mu1 * mu2 + c1) * (2 * sigma12 + c2)) / ((mu1**2 + mu2**2 + c1) * (sigma1 + sigma2 + c2))
        return ssim
    
    ssim_noisy = ssim(original, noisy)
    ssim_filtered = ssim(original, filtered)
    
    return {
        'mse_noisy': mse_noisy,
        'mse_filtered': mse_filtered,
        'psnr_noisy': psnr_noisy,
        'psnr_filtered': psnr_filtered,
        'ssim_noisy': ssim_noisy,
        'ssim_filtered': ssim_filtered
    }

def image_to_base64(img: np.ndarray) -> str:
    """Convert numpy array image to base64 string."""
    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# Callbacks for noise dashboard
@callback(
    [Output('noise-original-image', 'src'),
     Output('noise-noisy-image', 'src'),
     Output('noise-filtered-image', 'src'),
     Output('noise-metrics', 'children')],
    [Input('noise-upload', 'contents'),
     Input('noise-type', 'value'),
     Input('noise-intensity', 'value'),
     Input('filter-type', 'value'),
     Input('filter-size', 'value'),
     Input('noise-reset-btn', 'n_clicks')]
)
def update_noise_display(contents, noise_type, intensity, filter_type, filter_size, reset_clicks):
    """Update the noise dashboard display."""
    
    if contents is None:
        return None, None, None, "Upload an image to see noise reduction effects"
    
    # Parse uploaded image
    original_image = parse_uploaded_image(contents)
    
    if original_image is None:
        return None, None, None, "Error processing image"
    
    # Add noise
    noisy_image = add_noise(original_image, noise_type, intensity)
    
    # Apply filter
    filtered_image = apply_filter(noisy_image, filter_type, filter_size)
    
    # Convert images to base64
    original_src = image_to_base64(original_image)
    noisy_src = image_to_base64(noisy_image) if noisy_image is not None else None
    filtered_src = image_to_base64(filtered_image) if filtered_image is not None else None
    
    # Calculate metrics
    metrics = calculate_metrics(original_image, noisy_image, filtered_image)
    
    # Create metrics display
    if metrics:
        metrics_html = html.Div([
            html.Div([
                html.H5("Noisy Image Metrics", style={'color': '#e74c3c'}),
                html.P(f"MSE: {metrics['mse_noisy']:.2f}"),
                html.P(f"PSNR: {metrics['psnr_noisy']:.2f} dB"),
                html.P(f"SSIM: {metrics['ssim_noisy']:.3f}")
            ], style={'display': 'inline-block', 'marginRight': '50px'}),
            
            html.Div([
                html.H5("Filtered Image Metrics", style={'color': '#27ae60'}),
                html.P(f"MSE: {metrics['mse_filtered']:.2f}"),
                html.P(f"PSNR: {metrics['psnr_filtered']:.2f} dB"),
                html.P(f"SSIM: {metrics['ssim_filtered']:.3f}")
            ], style={'display': 'inline-block'})
        ])
    else:
        metrics_html = "No metrics available"
    
    return original_src, noisy_src, filtered_src, metrics_html
