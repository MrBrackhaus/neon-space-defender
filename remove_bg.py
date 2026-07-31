import os
import glob
from PIL import Image

def process_images():
    pattern = os.path.join('public', '*.png')
    files = glob.glob(pattern)

    for file in files:
        try:
            img = Image.open(file).convert("RGBA")
            data = img.getdata()
            
            # Use top-left pixel as the background reference
            bg_color = data[0]
            
            # If already transparent, skip
            if bg_color[3] < 10:
                print(f"Skipping {file} (already transparent)")
                continue

            bg_r, bg_g, bg_b = bg_color[0], bg_color[1], bg_color[2]
            print(f"Processing {file} with bg color ({bg_r}, {bg_g}, {bg_b})")

            new_data = []
            threshold = 30 # Euclidean distance squared threshold or manhattan?
            # Let's use manhattan distance for speed and simplicity
            threshold = 45 

            for item in data:
                r, g, b, a = item
                if a > 0:
                    dist = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
                    if dist < threshold:
                        new_data.append((r, g, b, 0)) # fully transparent
                    else:
                        new_data.append(item)
                else:
                    new_data.append(item)

            img.putdata(new_data)
            img.save(file, "PNG")
            print(f"Saved {file}")

        except Exception as e:
            print(f"Failed to process {file}: {e}")

if __name__ == "__main__":
    process_images()
