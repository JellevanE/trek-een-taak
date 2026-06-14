#!/usr/bin/env python3
"""
Analyze and extract color palette from sprite images.
This helps maintain consistent color usage across all generated sprites.
"""

from PIL import Image
import sys
from collections import Counter

def extract_palette(image_path):
    """Extract unique colors from an image."""
    img = Image.open(image_path).convert('RGBA')
    pixels = list(img.getdata())
    
    # Filter out fully transparent pixels
    colors = [p for p in pixels if p[3] > 0]
    
    # Count occurrences
    color_counts = Counter(colors)
    return color_counts.most_common()

def rgb_to_hex(r, g, b, a=255):
    """Convert RGBA to hex color code."""
    if a == 0:
        return 'transparent'
    return f'#{r:02x}{g:02x}{b:02x}'

def analyze_sprites(sprite_paths):
    """Analyze multiple sprites and extract combined palette."""
    all_colors = Counter()
    
    for path in sprite_paths:
        print(f"\nAnalyzing {path}...")
        colors = extract_palette(path)
        all_colors.update(dict(colors))
    
    # Get unique colors sorted by frequency
    unique_colors = all_colors.most_common()
    
    print(f"\n{'='*60}")
    print(f"COMBINED COLOR PALETTE ({len(unique_colors)} unique colors)")
    print(f"{'='*60}\n")
    
    for color, count in unique_colors:
        hex_color = rgb_to_hex(*color)
        rgb_str = f"({color[0]}, {color[1]}, {color[2]})"
        print(f"{hex_color:12} | RGB{rgb_str:20} | Used {count:5} times")
    
    return unique_colors

if __name__ == '__main__':
    sprite_paths = [
        '../assets/examples/knight.png',
        '../assets/examples/dragon.png',
        '../assets/examples/castle.png'
    ]
    
    analyze_sprites(sprite_paths)
