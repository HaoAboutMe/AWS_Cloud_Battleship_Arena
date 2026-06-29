import { useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { getAvatarUploadUrl } from "../services/userService";

const AvatarUpload = ({ currentAvatarUrl, onAvatarUpdate, showToast }) => {
  const { attributes, user } = useAuth();
  const [imageSrc, setImageSrc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [boxSize, setBoxSize] = useState(150);
  const [imgLayout, setImgLayout] = useState({
    wDisplayed: 0,
    hDisplayed: 0,
    xOffset: 0,
    yOffset: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });

  const imgRef = useRef(null);
  const email = attributes.email || user?.signInDetails?.loginId;

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const containerWidth = 300;
    const containerHeight = 300;

    const rImg = naturalWidth / naturalHeight;
    const rContainer = containerWidth / containerHeight;

    let wDisplayed = 0;
    let hDisplayed = 0;
    let xOffset = 0;
    let yOffset = 0;

    if (rImg > rContainer) {
      wDisplayed = containerWidth;
      hDisplayed = containerWidth / rImg;
      yOffset = (containerHeight - hDisplayed) / 2;
    } else {
      hDisplayed = containerHeight;
      wDisplayed = containerHeight * rImg;
      xOffset = (containerWidth - wDisplayed) / 2;
    }

    setImgLayout({
      wDisplayed,
      hDisplayed,
      xOffset,
      yOffset,
      naturalWidth,
      naturalHeight,
    });

    // Set initial crop box size to be 70% of the smaller dimension, centered
    const initialBoxSize = Math.min(wDisplayed, hDisplayed) * 0.7;
    setBoxSize(initialBoxSize);
    setCropPos({
      x: xOffset + (wDisplayed - initialBoxSize) / 2,
      y: yOffset + (hDisplayed - initialBoxSize) / 2,
    });
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    const isTouch = e.type === "touchstart";
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    const startX = cropPos.x;
    const startY = cropPos.y;

    const handleDragMove = (moveEvent) => {
      const currentTouch = moveEvent.type === "touchmove";
      const currentX = currentTouch
        ? moveEvent.touches[0].clientX
        : moveEvent.clientX;
      const currentY = currentTouch
        ? moveEvent.touches[0].clientY
        : moveEvent.clientY;

      const deltaX = currentX - clientX;
      const deltaY = currentY - clientY;

      let newX = startX + deltaX;
      let newY = startY + deltaY;

      // Constrain inside the actual displayed image boundaries
      const minX = imgLayout.xOffset;
      const maxX = imgLayout.xOffset + imgLayout.wDisplayed - boxSize;
      const minY = imgLayout.yOffset;
      const maxY = imgLayout.yOffset + imgLayout.hDisplayed - boxSize;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setCropPos({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchmove", handleDragMove);
      document.removeEventListener("touchend", handleDragEnd);
    };

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDragMove, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleResizeStart = (e, corner) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent moving the crop box

    const isTouch = e.type === "touchstart";
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    const startX = cropPos.x;
    const startY = cropPos.y;
    const startSize = boxSize;

    // Anchor points that do not move during resize
    const anchorX = corner.includes("l") ? startX + startSize : startX;
    const anchorY = corner.includes("t") ? startY + startSize : startY;

    const handleResizeMove = (moveEvent) => {
      const currentTouch = moveEvent.type === "touchmove";
      const currentX = currentTouch
        ? moveEvent.touches[0].clientX
        : moveEvent.clientX;
      const currentY = currentTouch
        ? moveEvent.touches[0].clientY
        : moveEvent.clientY;

      const deltaX = currentX - clientX;
      const deltaY = currentY - clientY;

      let newSize = startSize;

      if (corner === "br") {
        const delta = (deltaX + deltaY) / 2;
        newSize = startSize + delta;
      } else if (corner === "tl") {
        const delta = (-deltaX - deltaY) / 2;
        newSize = startSize + delta;
      } else if (corner === "tr") {
        const delta = (deltaX - deltaY) / 2;
        newSize = startSize + delta;
      } else if (corner === "bl") {
        const delta = (-deltaX + deltaY) / 2;
        newSize = startSize + delta;
      }

      const minSize = 50;
      let maxSize = Math.min(imgLayout.wDisplayed, imgLayout.hDisplayed);

      if (corner === "br") {
        const spaceX = imgLayout.xOffset + imgLayout.wDisplayed - anchorX;
        const spaceY = imgLayout.yOffset + imgLayout.hDisplayed - anchorY;
        maxSize = Math.min(spaceX, spaceY);
      } else if (corner === "tl") {
        const spaceX = anchorX - imgLayout.xOffset;
        const spaceY = anchorY - imgLayout.yOffset;
        maxSize = Math.min(spaceX, spaceY);
      } else if (corner === "tr") {
        const spaceX = imgLayout.xOffset + imgLayout.wDisplayed - anchorX;
        const spaceY = anchorY - imgLayout.yOffset;
        maxSize = Math.min(spaceX, spaceY);
      } else if (corner === "bl") {
        const spaceX = anchorX - imgLayout.xOffset;
        const spaceY = anchorY - imgLayout.yOffset + imgLayout.hDisplayed; // anchorY is top, so height is correct space from bottom
        const maxSpaceY = imgLayout.yOffset + imgLayout.hDisplayed - anchorY;
        maxSize = Math.min(spaceX, maxSpaceY);
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize));

      let newX = startX;
      let newY = startY;

      if (corner.includes("l")) {
        newX = anchorX - newSize;
      } else {
        newX = anchorX;
      }

      if (corner.includes("t")) {
        newY = anchorY - newSize;
      } else {
        newY = anchorY;
      }

      setBoxSize(newSize);
      setCropPos({ x: newX, y: newY });
    };

    const handleResizeEnd = () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.removeEventListener("touchmove", handleResizeMove);
      document.removeEventListener("touchend", handleResizeEnd);
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    document.addEventListener("touchmove", handleResizeMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleResizeEnd);
  };

  const getCroppedImgBlob = () => {
    return new Promise((resolve, reject) => {
      const img = imgRef.current;
      if (!img || imgLayout.naturalWidth === 0) {
        reject(new Error("Image not loaded"));
        return;
      }

      const scale = imgLayout.naturalWidth / imgLayout.wDisplayed;
      const srcX = (cropPos.x - imgLayout.xOffset) * scale;
      const srcY = (cropPos.y - imgLayout.yOffset) * scale;
      const srcSize = boxSize * scale;

      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 400, 400);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas export failed"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.9,
      );
    });
  };

  const uploadAvatar = async () => {
    if (!email) return;
    try {
      setIsUploading(true);
      const croppedBlob = await getCroppedImgBlob();

      // Step 1: Get presigned URL
      const { uploadUrl, publicUrl } = await getAvatarUploadUrl(email);

      // Step 2: Upload to S3
      await axios.put(uploadUrl, croppedBlob, {
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      // Update UI with timestamp to bust cache
      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      onAvatarUpdate(newAvatarUrl);

      // Cleanup
      setImageSrc(null);

      if (showToast) {
        showToast(
          "Cập nhật thành công!",
          "Ảnh đại diện mới đã được áp dụng.",
          "success",
        );
      }
    } catch (e) {
      console.error("Upload error:", e);
      if (showToast) {
        showToast(
          "Cập nhật thất bại!",
          "Đã có lỗi xảy ra trong quá trình tải ảnh lên.",
          "error",
        );
      } else {
        alert("Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        id="avatar-upload"
        onChange={onFileChange}
        style={{ display: "none" }}
      />
      <label
        htmlFor="avatar-upload"
        className="avatar-upload-overlay"
        title="Change Avatar"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "28px" }}
        >
          photo_camera
        </span>
      </label>

      {imageSrc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
          }}
        >
          <h2
            style={{
              color: "#bceeff",
              marginBottom: "16px",
              textTransform: "uppercase",
              fontSize: "16px",
              letterSpacing: "1px",
              fontWeight: "800",
            }}
          >
            Điều chỉnh khung cắt Avatar
          </h2>
          <div
            style={{
              position: "relative",
              width: "300px",
              height: "300px",
              background: "#041421",
              border: "1px solid rgba(117, 223, 255, 0.2)",
              borderRadius: "4px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src={imageSrc}
              ref={imgRef}
              onLoad={handleImageLoad}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                userSelect: "none",
              }}
              alt="Avatar preview source"
            />
            {imgLayout.naturalWidth > 0 && (
              <div
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                  position: "absolute",
                  left: `${cropPos.x}px`,
                  top: `${cropPos.y}px`,
                  width: `${boxSize}px`,
                  height: `${boxSize}px`,
                  border: "2px dashed #00e5ff",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
                  cursor: "move",
                  boxSizing: "border-box",
                  touchAction: "none",
                }}
              >
                {/* Grid lines inside */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "33.33%",
                      left: 0,
                      right: 0,
                      height: "1px",
                      background: "rgba(0, 229, 255, 0.3)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "66.66%",
                      left: 0,
                      right: 0,
                      height: "1px",
                      background: "rgba(0, 229, 255, 0.3)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "33.33%",
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      background: "rgba(0, 229, 255, 0.3)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "66.66%",
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      background: "rgba(0, 229, 255, 0.3)",
                    }}
                  />
                </div>

                {/* 4 Corner handles for resizing */}
                {["tl", "tr", "bl", "br"].map((corner) => {
                  const isTop = corner.startsWith("t");
                  const isLeft = corner.endsWith("l");
                  return (
                    <div
                      key={corner}
                      onMouseDown={(e) => handleResizeStart(e, corner)}
                      onTouchStart={(e) => handleResizeStart(e, corner)}
                      style={{
                        position: "absolute",
                        top: isTop ? "-6px" : "auto",
                        bottom: !isTop ? "-6px" : "auto",
                        left: isLeft ? "-6px" : "auto",
                        right: !isLeft ? "-6px" : "auto",
                        width: "12px",
                        height: "12px",
                        background: "#00e5ff",
                        border: "2px solid #041421",
                        borderRadius: "2px",
                        cursor:
                          corner === "tl" || corner === "br"
                            ? "nwse-resize"
                            : "nesw-resize",
                        zIndex: 10,
                        boxSizing: "border-box",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              width: "300px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#8cdaef",
                textTransform: "uppercase",
                fontWeight: "800",
              }}
            >
              Kích thước khung:
            </span>
            <span
              style={{ fontSize: "11px", color: "#00e5ff", fontWeight: "bold" }}
            >
              {Math.round(boxSize)} x {Math.round(boxSize)} px
            </span>
          </div>
          <div style={{ marginTop: "24px", display: "flex", gap: "16px" }}>
            <button
              onClick={() => setImageSrc(null)}
              style={{
                padding: "10px 20px",
                borderRadius: "4px",
                border: "1px solid rgba(117, 223, 255, 0.24)",
                background: "transparent",
                color: "#a5e7ff",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "900",
                textTransform: "uppercase",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(117, 223, 255, 0.08)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Hủy
            </button>
            <button
              onClick={uploadAvatar}
              disabled={isUploading}
              style={{
                padding: "10px 20px",
                borderRadius: "4px",
                border: "none",
                background: "#a5e7ff",
                color: "#002431",
                cursor: isUploading ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: "900",
                textTransform: "uppercase",
                transition: "all 0.2s ease",
                boxShadow: "0 0 12px rgba(165, 231, 255, 0.3)",
              }}
              onMouseOver={(e) => {
                if (!isUploading)
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(165, 231, 255, 0.6)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(165, 231, 255, 0.3)";
              }}
            >
              {isUploading ? "Đang tải lên..." : "Lưu Avatar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

function readFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), false);
    reader.readAsDataURL(file);
  });
}

export default AvatarUpload;
