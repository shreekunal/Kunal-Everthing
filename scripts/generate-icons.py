#!/usr/bin/env python3
"""
Generate Android APK and Web App Icons from BrandLogo.png
"""
import os
from PIL import Image, ImageDraw

def create_square_icon(src_img, target_size, bg_color=(0, 0, 0), padding_ratio=0.1):
    """
    Fits image centered in a square canvas with bg_color and subtle padding.
    """
    canvas = Image.new("RGBA", (target_size, target_size), (*bg_color, 255))
    
    # Calculate fit size
    max_dim = int(target_size * (1.0 - 2 * padding_ratio))
    src_w, src_h = src_img.size
    scale = min(max_dim / src_w, max_dim / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    
    resized = src_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (target_size - new_w) // 2
    pos_y = (target_size - new_h) // 2
    
    if resized.mode == 'RGBA':
        canvas.paste(resized, (pos_x, pos_y), resized)
    else:
        canvas.paste(resized, (pos_x, pos_y))
        
    return canvas

def create_round_icon(square_img):
    """
    Creates circular mask over the square icon.
    """
    size = square_img.size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    
    round_img = Image.new("RGBA", size, (0, 0, 0, 0))
    round_img.paste(square_img, (0, 0), mask=mask)
    return round_img

def create_foreground_icon(src_img, target_size):
    """
    Adaptive icon foreground: safe area is centered ~66% of target_size.
    """
    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    safe_size = int(target_size * 0.66)
    
    src_w, src_h = src_img.size
    scale = min(safe_size / src_w, safe_size / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    
    resized = src_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (target_size - new_w) // 2
    pos_y = (target_size - new_h) // 2
    
    if resized.mode == 'RGBA':
        canvas.paste(resized, (pos_x, pos_y), resized)
    else:
        canvas.paste(resized, (pos_x, pos_y))
        
    return canvas

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))

    src_path = os.path.join(project_root, "BrandLogo.png")
    if not os.path.exists(src_path):
        print(f"Error: {src_path} not found")
        return
        
    img = Image.open(src_path).convert("RGBA")
    print(f"Loaded source image: {img.size}")
    
    # 1. Android Mipmap configurations
    densities = {
        "mipmap-mdpi": {"launcher": 48, "foreground": 108},
        "mipmap-hdpi": {"launcher": 72, "foreground": 162},
        "mipmap-xhdpi": {"launcher": 96, "foreground": 216},
        "mipmap-xxhdpi": {"launcher": 144, "foreground": 324},
        "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432},
    }
    
    res_base = os.path.join(project_root, "android", "app", "src", "main", "res")
    
    for density, sizes in densities.items():
        dir_path = os.path.join(res_base, density)
        os.makedirs(dir_path, exist_ok=True)
        
        # Launcher square
        sq = create_square_icon(img, sizes["launcher"], padding_ratio=0.08)
        sq.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")
        
        # Launcher round
        rnd = create_round_icon(sq)
        rnd.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")
        
        # Foreground for adaptive icon
        fg = create_foreground_icon(img, sizes["foreground"])
        fg.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated icons for {density}")
        
    # 2. Capacitor Assets (for npx @capacitor/assets)
    assets_dir = os.path.join(project_root, "assets")
    os.makedirs(assets_dir, exist_ok=True)
    
    icon_1024 = create_square_icon(img, 1024, padding_ratio=0.1)
    icon_1024.save(os.path.join(assets_dir, "icon.png"), "PNG")
    icon_1024.save(os.path.join(assets_dir, "icon-only.png"), "PNG")
    icon_1024.save(os.path.join(assets_dir, "icon-foreground.png"), "PNG")
    
    splash_2732 = create_square_icon(img, 2732, padding_ratio=0.3)
    splash_2732.save(os.path.join(assets_dir, "splash.png"), "PNG")
    splash_2732.save(os.path.join(assets_dir, "splash-dark.png"), "PNG")
    print("Generated Capacitor asset icons in assets/")
    
    # 3. Public web directory
    public_dir = os.path.join(project_root, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    web_icon_512 = create_square_icon(img, 512, padding_ratio=0.08)
    web_icon_512.save(os.path.join(public_dir, "icon-512.png"), "PNG")
    web_icon_192 = create_square_icon(img, 192, padding_ratio=0.08)
    web_icon_192.save(os.path.join(public_dir, "icon-192.png"), "PNG")
    web_icon_64 = create_square_icon(img, 64, padding_ratio=0.05)
    web_icon_64.save(os.path.join(public_dir, "favicon.png"), "PNG")
    web_icon_64.save(os.path.join(public_dir, "favicon.ico"), "ICO")
    
    # Also save BrandLogo.png directly into public
    img.save(os.path.join(public_dir, "BrandLogo.png"), "PNG")
    print("Generated public icons in public/")

if __name__ == "__main__":
    main()
