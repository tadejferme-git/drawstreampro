
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { CameraOff } from 'lucide-react';

interface CameraViewProps {
  isActive: boolean;
  deviceId?: string;
  className?: string;
}

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(({ isActive, deviceId, className = "" }, ref) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useImperativeHandle(ref, () => internalVideoRef.current!);

  useEffect(() => {
    const startCamera = async () => {
      // Clean up existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      try {
        if (isActive) {
          const constraints: MediaStreamConstraints = {
            video: deviceId ? { 
              deviceId: { exact: deviceId }, 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 },
              aspectRatio: { ideal: 1.7777777778 }
            } : { 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 },
              aspectRatio: { ideal: 1.7777777778 }
            },
            audio: false
          };
          
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          
          if (internalVideoRef.current) {
            internalVideoRef.current.srcObject = stream;
            internalVideoRef.current.play().catch(() => {});
          }
        } else {
          // If not active, ensure video src is cleared
          if (internalVideoRef.current) {
            internalVideoRef.current.srcObject = null;
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, deviceId]);

  return (
    <div className={`relative bg-slate-900 flex items-center justify-center overflow-hidden ${className}`}>
      {!isActive && <CameraOff className="text-slate-700 w-12 h-12 z-10" />}
      
      <video
        ref={internalVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!isActive ? 'hidden' : 'block'}`}
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
});

export default CameraView;
