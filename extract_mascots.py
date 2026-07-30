import cv2
import numpy as np
import sys
import os

def extract_mascots(img_path, out_dir):
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Error loading image")
        sys.exit(1)

    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    elif img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    _, thresh = cv2.threshold(gray, 20, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Sort contours by area to get the largest ones
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    # Filter out text / watermark at the top right if possible by area
    # The watermark "AI-Generated" is usually small or very long but low area compared to mascots
    mascot_contours = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 1000: # Mascots will be much larger than 1000 pixels
            x, y, w, h = cv2.boundingRect(cnt)
            # if it's the "AI-Generated" watermark, it's at the top right and wide but not very tall
            if w > h * 3 and y < 100:
                continue
            mascot_contours.append(cnt)
        if len(mascot_contours) == 5:
            break

    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

    for i, cnt in enumerate(mascot_contours):
        x, y, w, h = cv2.boundingRect(cnt)
        
        roi = img[y:y+h, x:x+w].copy()
        roi_gray = gray[y:y+h, x:x+w]
        
        _, alpha = cv2.threshold(roi_gray, 5, 255, cv2.THRESH_BINARY)
        
        # Smooth the alpha mask slightly to avoid hard jagged edges
        alpha = cv2.GaussianBlur(alpha, (5, 5), 0)
        roi[:, :, 3] = alpha
        
        out_path = os.path.join(out_dir, f"mascot_{i+1}.png")
        cv2.imwrite(out_path, roi)
        print(f"Saved {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_mascots.py <input_img> <output_dir>")
        sys.exit(1)
    extract_mascots(sys.argv[1], sys.argv[2])
