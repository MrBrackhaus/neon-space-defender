import os
import glob
import sys
from PIL import Image
import collections

# Increase recursion depth for flood fill (though we'll use iterative)
sys.setrecursionlimit(2000000)

def process_images():
    pattern = os.path.join('public', '*.png')
    files = glob.glob(pattern)
    
    for file in files:
        if "sheet" not in file and "ship_" not in file:
            continue
            
        try:
            img = Image.open(file).convert("RGBA")
            w, h = img.size
            pixels = img.load()
            
            # Step 1: Find the background color by looking at the outer edge of the opaque area
            # We'll just look at pixels that are adjacent to a transparent pixel
            edge_colors = collections.Counter()
            for y in range(1, h-1):
                for x in range(1, w-1):
                    r, g, b, a = pixels[x, y]
                    if a > 100:
                        # check if any neighbor is transparent
                        if pixels[x-1, y][3] < 50 or pixels[x+1, y][3] < 50 or pixels[x, y-1][3] < 50 or pixels[x, y+1][3] < 50:
                            edge_colors[(r, g, b)] += 1
            
            if not edge_colors:
                continue
                
            most_common = edge_colors.most_common(1)[0]
            bg_color, count = most_common
            
            # If the most common edge color doesn't make up a significant portion, maybe it's already perfectly cut out
            if count < 200:
                print(f"Skipping {file}, no dominant bg color at edge (Count: {count})")
                continue
                
            print(f"Processing {file} with target BG color {bg_color} (Count: {count})")
            
            # Step 2: Iterative flood fill starting from all outer edges of the image
            # We treat both fully transparent AND the bg_color as "fillable"
            visited = [[False] * h for _ in range(w)]
            stack = []
            
            for x in range(w):
                stack.append((x, 0))
                stack.append((x, h-1))
            for y in range(h):
                stack.append((0, y))
                stack.append((w-1, y))
                
            threshold = 30 # tolerance for bg color
            
            pixels_removed = 0
            
            while stack:
                x, y = stack.pop()
                if visited[x][y]:
                    continue
                visited[x][y] = True
                
                r, g, b, a = pixels[x, y]
                
                is_fillable = False
                if a < 50:
                    is_fillable = True
                else:
                    dist = abs(r - bg_color[0]) + abs(g - bg_color[1]) + abs(b - bg_color[2])
                    if dist < threshold:
                        is_fillable = True
                        pixels[x, y] = (0, 0, 0, 0)
                        pixels_removed += 1
                        
                if is_fillable:
                    if x+1 < w and not visited[x+1][y]: 
                        visited[x+1][y] = True
                        stack.append((x+1, y))
                    if x-1 >= 0 and not visited[x-1][y]: 
                        visited[x-1][y] = True
                        stack.append((x-1, y))
                    if y+1 < h and not visited[x][y+1]: 
                        visited[x][y+1] = True
                        stack.append((x, y+1))
                    if y-1 >= 0 and not visited[x][y-1]: 
                        visited[x][y-1] = True
                        stack.append((x, y-1))
            
            print(f"Removed {pixels_removed} pixels from {file}")
            if pixels_removed > 100:
                img.save(file, "PNG")
                
        except Exception as e:
            print(f"Error on {file}: {e}")

if __name__ == "__main__":
    process_images()
