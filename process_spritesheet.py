import cv2
import numpy as np
import sys
import os

def process_sheet(img_path, out_path):
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Error loading image")
        sys.exit(1)

    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    elif img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    # Brighten the image (the AI generated it a bit too dark)
    hsv = cv2.cvtColor(img[:,:,:3], cv2.COLOR_BGR2HSV)
    hsv = np.array(hsv, dtype=np.float64)
    hsv[:,:,2] = hsv[:,:,2] * 1.5 + 30 # brighten
    hsv[:,:,1] = hsv[:,:,1] * 1.3 # boost saturation
    hsv[:,:,2] = np.clip(hsv[:,:,2], 0, 255)
    hsv[:,:,1] = np.clip(hsv[:,:,1], 0, 255)
    img[:,:,:3] = cv2.cvtColor(np.array(hsv, dtype=np.uint8), cv2.COLOR_HSV2BGR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    _, thresh = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    min_x, min_y = 99999, 99999
    max_x, max_y = -1, -1
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 200:
            x, y, w, h = cv2.boundingRect(cnt)
            if x < 150: continue
            if w > h * 2.5 and y < 100: continue
                
            if x < min_x: min_x = x
            if y < min_y: min_y = y
            if x + w > max_x: max_x = x + w
            if y + h > max_y: max_y = y + h
            
    grid_w = max_x - min_x
    grid_h = max_y - min_y
    
    cols = 7
    rows = 6
    
    frame_w = grid_w // cols
    frame_h = grid_h // rows
    
    print(f"Grid BB: {min_x},{min_y} -> {max_x},{max_y}")
    print(f"Calculated Frame size: {frame_w}x{frame_h}")
    
    pad = 10
    out_frame_w = frame_w + pad*2
    out_frame_h = frame_h + pad*2
    
    out_img = np.zeros((out_frame_h * rows, out_frame_w * cols, 4), dtype=np.uint8)
    
    for r in range(rows):
        for c in range(cols):
            fx = min_x + c * frame_w
            fy = min_y + r * frame_h
            
            roi = img[fy:fy+frame_h, fx:fx+frame_w].copy()
            roi_gray = gray[fy:fy+frame_h, fx:fx+frame_w]
            
            # Create better alpha mask (use higher threshold to cut out noise)
            _, alpha = cv2.threshold(roi_gray, 40, 255, cv2.THRESH_BINARY)
            
            # Erase the edges of the frame to prevent bleeding (the "roll effect")
            margin_x = 6
            margin_y = 6
            alpha[0:margin_y, :] = 0
            alpha[-margin_y:, :] = 0
            alpha[:, 0:margin_x] = 0
            alpha[:, -margin_x:] = 0

            # Keep only connected components that have a reasonable area (removes stray pixels)
            num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(alpha, connectivity=8)
            for i in range(1, num_labels):
                if stats[i, cv2.CC_STAT_AREA] < 50:
                    alpha[labels == i] = 0

            alpha = cv2.GaussianBlur(alpha, (5, 5), 0)
            
            # feather the alpha
            alpha = np.clip((alpha.astype(np.float32) * 1.5), 0, 255).astype(np.uint8)
            
            roi[:, :, 3] = alpha
            
            out_img[r*out_frame_h+pad : r*out_frame_h+pad+frame_h, c*out_frame_w+pad : c*out_frame_w+pad+frame_w] = roi

    cv2.imwrite(out_path, out_img)
    print(f"Saved {out_path} with frames of {out_frame_w}x{out_frame_h}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_spritesheet.py <input> <output>")
        sys.exit(1)
    process_sheet(sys.argv[1], sys.argv[2])
