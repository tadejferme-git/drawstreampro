
export interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export type ToolType = 'select' | 'pen' | 'clear';

export type VideoFormat = 'phone' | 'desktop' | 'auto';

export type VideoLayout = 'solo' | 'double';

export interface AppState {
  isRecording: boolean;
  isCameraOn: boolean;
  selectedColor: string;
  lineWidth: number;
  currentTool: ToolType;
  videoUrl: string | null;
  format: VideoFormat;
  layout: VideoLayout;
  isSwapped: boolean;
  playbackSpeed: number;
  zoomScale: number;
  zoomOffset: { x: number; y: number };
}
