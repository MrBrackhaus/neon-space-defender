from PIL import Image
import sys
import glob
import os

def remove_black_bg(image_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        print(f"Failed to open {image_path}: {e}")
        return

    # Load data
    datas = img.getdata()
    new_data = []
    
    # We will do a simple flood fill from the corners, or since it's just an isolated sprite on black,
    # we can use PIL's ImageDraw floodfill, or write a quick BFS.
    
    width, height = img.size
    pixels = img.load()
    
    # BFS to find all background pixels connected to the borders
    visited = set()
    queue = []
    
    # Add borders to queue
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
        
    threshold = 25 # tolerance for "black" (0-255)
    
    while queue:
        x, y = queue.pop(0)
        if (x, y) in visited:
            continue
            
        visited.add((x, y))
        
        r, g, b, a = pixels[x, y]
        # Check if pixel is dark enough to be background
        if r < threshold and g < threshold and b < threshold:
            pixels[x, y] = (0, 0, 0, 0) # Make transparent
            
            # Add neighbors
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    queue.append((nx, ny))
                    
    # Save as PNG
    out_path = image_path.rsplit('.', 1)[0] + '.png'
    img.save(out_path, "PNG")
    print(f"Saved {out_path}")
    
    # Optional: Delete the original jpg
    if image_path.endswith('.jpg'):
        os.remove(image_path)
        print(f"Deleted {image_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pattern = sys.argv[1]
    else:
        pattern = "*.jpg"
        
    files = glob.glob(pattern)
    for f in files:
        remove_black_bg(f)
