from PIL import Image

def make_transparent_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # item is (R, G, B, A)
        r, g, b = item[:3]
        brightness = (r + g + b) / 3.0
        
        if r > 245 and g > 245 and b > 245:
            # Pure white becomes transparent
            new_data.append((r, g, b, 0))
        elif brightness > 220:
            # Fade out bright pixels (anti-aliasing)
            alpha = int(255 - ((brightness - 220.0) / (255.0 - 220.0) * 255.0))
            # clamp just in case
            alpha = max(0, min(255, alpha))
            new_data.append((r, g, b, alpha))
        else:
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    img.save(output_path)
    print(f"Saved {output_path}")

make_transparent_logo("assets/images/logo.jpeg", "assets/images/logo.png")
try:
    make_transparent_logo("assets/images/logo-white.jpeg", "assets/images/logo-white.png")
except Exception as e:
    print(e)
