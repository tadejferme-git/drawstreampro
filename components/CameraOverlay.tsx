
import React, { useEffect, useState } from 'react';
import { Move } from 'lucide-react';
import CameraView from './CameraView';

interface CameraOverlayProps {
  isActive: boolean;
  deviceId?: string;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
}

const CameraOverlay: React.FC<CameraOverlayProps> = ({ isActive, deviceId, position, onPositionChange, videoElementRef }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      onPositionChange({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!isActive) return null;

  return (
    <div
      id="camera-overlay-container"
      className="fixed z-50 rounded-2xl overflow-hidden border-4 border-indigo-500 shadow-2xl group transition-shadow hover:shadow-indigo-500/20 bg-slate-900"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        height: '180px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <CameraView ref={videoElementRef} isActive={isActive} deviceId={deviceId} className="w-full h-full" />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 rounded-full p-1 shadow-lg pointer-events-none">
        <Move className="w-4 h-4 text-white" />
      </div>
    </div>
  );
};

export default CameraOverlay;
