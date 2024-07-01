import cv2
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

def find_keypoints_and_matches(img1, img2):
    sift = cv2.SIFT_create()
    kp1, des1 = sift.detectAndCompute(img1, None)
    kp2, des2 = sift.detectAndCompute(img2, None)

    bf = cv2.BFMatcher()
    matches = bf.knnMatch(des1, des2, k=2)

    good = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance:
            good.append(m)

    return kp1, kp2, good

def main():
    cap = cv2.VideoCapture(0)

    ret, frame1 = cap.read()
    cv2.waitKey(2000)  # Wait for 2 seconds to change the scene
    ret, frame2 = cap.read()

    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

    kp1, kp2, matches = find_keypoints_and_matches(gray1, gray2)

    if len(matches) > 8:
        src_pts = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)

        # Fundamental matrix
        F, mask = cv2.findFundamentalMat(src_pts, dst_pts, cv2.FM_RANSAC, 3, 0.99)

        src_pts = src_pts[mask.ravel() == 1]
        dst_pts = dst_pts[mask.ravel() == 1]

        # Assuming intrinsic parameters are known, otherwise you'll have to calibrate your camera
        K = np.array([[1000, 0, 640], [0, 1000, 360], [0, 0, 1]])

        # Essential matrix
        E, _ = cv2.findEssentialMat(src_pts, dst_pts, K, method=cv2.RANSAC, prob=0.999, threshold=1.0)
        
        # Recover pose
        _, R, t, _ = cv2.recoverPose(E, src_pts, dst_pts, K)

        # Triangulation
        P1 = np.hstack((np.eye(3, 3), np.zeros((3, 1))))
        P1 = K @ P1
        P2 = np.hstack((R, t))
        P2 = K @ P2

        points_4D = cv2.triangulatePoints(P1, P2, src_pts.transpose(1,0,2), dst_pts.transpose(1,0,2))
        points_3D = points_4D / points_4D[3]
        points_3D = points_3D[:3, :].transpose()

        print("3D points are: ", points_3D)

    cap.release()
    cv2.destroyAllWindows()


def plot_3d_points(points_3D):
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    
    xs = points_3D[:, 0]
    ys = points_3D[:, 1]
    zs = points_3D[:, 2]
    
    ax.scatter(xs, ys, zs, c='b', marker='o')
    
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    
    plt.show()

if __name__ == "__main__":
    main()
    plot_3d_points(points_3D)