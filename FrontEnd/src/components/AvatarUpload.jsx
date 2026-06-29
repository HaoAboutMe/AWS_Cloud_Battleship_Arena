import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImgBlob } from '../utils/cropImage';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUploadUrl } from '../services/userService';

const AvatarUpload = ({ currentAvatarUrl, onAvatarUpdate }) => {
  const { attributes, user } = useAuth();
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const email = attributes.email || user?.signInDetails?.loginId;

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const uploadAvatar = async () => {
    if (!email) return;
    try {
      setIsUploading(true);
      const croppedBlob = await getCroppedImgBlob(imageSrc, croppedAreaPixels);

      // Step 1: Get presigned URL
      const { uploadUrl, publicUrl } = await getAvatarUploadUrl(email);

      // Step 2: Upload to S3
      await axios.put(uploadUrl, croppedBlob, {
        headers: {
          'Content-Type': 'image/jpeg'
        }
      });

      // Update UI with timestamp to bust cache
      const newAvatarUrl = `${publicUrl}?t=${Date.now()}`;
      onAvatarUpdate(newAvatarUrl);
      
      // Cleanup
      setImageSrc(null);
    } catch (e) {
      console.error(e);
      alert('Upload failed');
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
        style={{ display: 'none' }}
      />
      <label htmlFor="avatar-upload" className="avatar-upload-overlay" title="Change Avatar">
        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>photo_camera</span>
      </label>

      {imageSrc && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ position: 'relative', width: '300px', height: '300px', background: '#333' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', width: '300px' }}>
            <span style={{ fontSize: '12px', color: '#ccc' }} className="material-symbols-outlined">zoom_in</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              style={{ flex: 1, cursor: 'pointer' }}
            />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => setImageSrc(null)}
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: 'white', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={uploadAvatar}
              disabled={isUploading}
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#d32f2f', color: 'white', cursor: isUploading ? 'not-allowed' : 'pointer' }}
            >
              {isUploading ? 'Uploading...' : 'Save Avatar'}
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
    reader.addEventListener('load', () => resolve(reader.result), false);
    reader.readAsDataURL(file);
  });
}

export default AvatarUpload;
