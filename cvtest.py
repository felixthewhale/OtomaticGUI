import cv2
import numpy as np
import time

def main():

    frame_width = 1280
    frame_height = 720
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, frame_width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, frame_height)

    sift = cv2.SIFT_create(contrastThreshold=0.1, edgeThreshold=10, sigma=1.6)

    feature_cache = {}
    memory_time = 2
    distance_threshold = 20

    while True:
        ret, frame = cap.read()
        current_time = time.time()

        if not ret:
            print("Failed to grab frame.")
            break

        frame_blur = cv2.GaussianBlur(frame, (3, 3), 0)
        gray = cv2.cvtColor(frame_blur, cv2.COLOR_BGR2GRAY)
        keypoints, _ = sift.detectAndCompute(gray, None)

        new_feature_cache = {}
        for kp in keypoints:
            x, y = map(int, kp.pt)
            closest_feature = min(feature_cache.values(), key=lambda f: np.sqrt((x - f[0])**2 + (y - f[1])**2), default=None)

            if closest_feature:
                cx, cy, initial_time, last_time = closest_feature
                distance = np.sqrt((x - cx)**2 + (y - cy)**2)

                if distance < distance_threshold:
                    velocity = distance / (current_time - last_time)
                    new_feature_cache[(x, y)] = (x, y, initial_time, current_time)
                    cv2.putText(frame, f"V: {velocity:.2f}", (x, y - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                    time_in_frame = int(current_time - initial_time)
                    cv2.putText(frame, f"T: {time_in_frame}s", (x, y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                else:
                    new_feature_cache[(x, y)] = (x, y, current_time, current_time)
            else:
                new_feature_cache[(x, y)] = (x, y, current_time, current_time)

        # Limit max up to 100 features and update feature cache
        if len(new_feature_cache) <= 100:
            feature_cache = {k: v for k, v in new_feature_cache.items() if current_time - v[3] < memory_time}

        # Visualization of SIFT patches
        collage = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
        for i, kp in enumerate(keypoints[:20]):
            x, y = map(int, kp.pt)
            size = int(kp.size)
            patch = gray[max(y - size, 0):min(y + size, gray.shape[0]), max(x - size, 0):min(x + size, gray.shape[1])]
            patch_resized = cv2.resize(patch, (100, 100))
            patch_colored = cv2.cvtColor(patch_resized, cv2.COLOR_GRAY2BGR)

            row = i // 5
            col = i % 5
            collage[row * 100:(row + 1) * 100, col * 100:(col + 1) * 100] = patch_colored

        concat_img = np.hstack((frame, collage))
        cv2.imshow("SIFT Features and Patches", concat_img)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
