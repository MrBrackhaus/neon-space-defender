import glob
from PIL import Image

for file in glob.glob('public/enemy_*_sheet.png'):
    try:
        img = Image.open(file).convert('RGBA')
        w, h = img.size
        pixels = img.load()
        if w == 1024 and h == 1024:
            pixels_removed = 0
            for x in range(w):
                for y in range(h):
                    # Erase a 30-pixel wide cross in the middle (512 - 15 to 512 + 15)
                    # Also erase the outer 15 pixels of the image
                    if (497 <= x <= 527) or (497 <= y <= 527) or (x < 15) or (x > 1009) or (y < 15) or (y > 1009):
                        # only clear if not already transparent
                        if pixels[x, y][3] > 0:
                            pixels[x, y] = (0, 0, 0, 0)
                            pixels_removed += 1
            if pixels_removed > 0:
                img.save(file, 'PNG')
                print(f"Fixed grid on {file} (removed {pixels_removed} pixels)")
    except Exception as e:
        print(f"Error on {file}: {e}")
