
import React from 'react';
import { 
  Pencil, Eraser, Camera, CameraOff, Circle,
  Play, Pause, Monitor, Smartphone, Square, Columns2, MousePointer2, Radio, Sparkles, Mic, MicOff, RefreshCw, X, Home
} from 'lucide-react';
import { ToolType, VideoFormat, VideoLayout } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  lineWidth: number;
  setLineWidth: (width: number) => void;
  isCameraOn: boolean;
  setCameraOn: (on: boolean) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  videoUrl: string | null;
  onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  recordedUrl: string | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  format: VideoFormat;
  setFormat: (format: VideoFormat) => void;
  layout: VideoLayout;
  setLayout: (layout: VideoLayout) => void;
  isSwapped: boolean;
  onToggleSwap: () => void;
  isAudioEnhanced: boolean;
  setAudioEnhanced: (enhanced: boolean) => void;
  onHomeClick: () => void;
}

const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff'];

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool, setTool, color, setColor, lineWidth, setLineWidth,
  isCameraOn, setCameraOn, isRecording, onStartRecording, onStopRecording,
  videoUrl, isPlaying, onTogglePlay,
  format, setFormat, layout, setLayout, isAudioEnhanced, setAudioEnhanced,
  isSwapped, onToggleSwap, onHomeClick
}) => {
  const preventFocus = (e: React.MouseEvent | React.FocusEvent) => {
    (e.target as HTMLElement).blur();
  };

  const handleClear = () => {
    window.dispatchEvent(new CustomEvent('clear-canvas'));
  };

  if (!videoUrl) return null;

  return (
    <div className="flex flex-col gap-4 items-center w-full max-w-full px-4 py-4 bg-slate-950 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50">
      {isRecording && (
        <div className="bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg flex items-center gap-2 mb-1">
          <Radio className="w-2.5 h-2.5 fill-white" /> ON AIR
        </div>
      )}

      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 flex items-center gap-4 overflow-x-auto scrollbar-hide max-w-full">
        <div className="flex items-center gap-1 border-r border-slate-700 pr-3 shrink-0">
          <button onMouseUp={preventFocus} onClick={onHomeClick} className="p-3 bg-slate-800 rounded-xl text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all shadow-lg active:scale-90" title="Project Settings & Home">
            <Home className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-r border-slate-700 pr-3 shrink-0">
          <button onMouseUp={preventFocus} onClick={onTogglePlay} className="p-3 bg-slate-800 rounded-xl text-white hover:bg-indigo-600 transition-all shadow-lg active:scale-90">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-slate-700 pr-3 shrink-0">
          <button 
            onMouseUp={preventFocus} 
            onClick={() => setCameraOn(!isCameraOn)} 
            className={`p-2.5 rounded-xl transition-all ${isCameraOn ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} 
            title="Toggle Camera Overlay"
          >
            {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </button>

          <button 
            onMouseUp={preventFocus} 
            onClick={() => setAudioEnhanced(!isAudioEnhanced)} 
            className={`p-2.5 rounded-xl transition-all relative ${isAudioEnhanced ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} 
            title="Studio Audio Enhancer"
          >
            {isAudioEnhanced ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            {isAudioEnhanced && <Sparkles className="w-2.5 h-2.5 absolute top-1.5 right-1.5 text-yellow-300 animate-pulse" />}
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-slate-700 pr-3 shrink-0">
          <button onMouseUp={preventFocus} onClick={() => setLayout('solo')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${layout === 'solo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Square className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">Solo</span>
          </button>
          <button onMouseUp={preventFocus} onClick={() => setLayout('double')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${layout === 'double' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Columns2 className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">Split</span>
          </button>
          {layout === 'double' && (
            <button onMouseUp={preventFocus} onClick={onToggleSwap} className={`p-2.5 rounded-xl transition-all ${isSwapped ? 'text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} title="Swap Views">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 border-r border-slate-700 pr-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800">
            <button onMouseUp={preventFocus} onClick={() => setTool('select')} className={`p-2 rounded-lg transition-all ${currentTool === 'select' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`} title="Select / Pan / Zoom">
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button onMouseUp={preventFocus} onClick={() => setTool('pen')} className={`p-2 rounded-lg transition-all ${currentTool === 'pen' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`} title="Pen Tool">
              <Pencil className="w-4 h-4" />
            </button>
            <button onMouseUp={preventFocus} onClick={handleClear} className="p-2 rounded-lg text-slate-500 hover:text-rose-400 transition-all hover:bg-rose-500/10" title="Clear All Drawings">
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {colors.map(c => (
              <button
                key={c}
                onMouseUp={preventFocus}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110 shadow-inner'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <input
            type="range"
            min="2"
            max="40"
            value={lineWidth}
            onFocus={preventFocus}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 border-r border-slate-700 pr-3 shrink-0">
          <button onMouseUp={preventFocus} onClick={() => setFormat('desktop')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${format === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Monitor className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">Desk</span>
          </button>
          <button onMouseUp={preventFocus} onClick={() => setFormat('phone')} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${format === 'phone' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Smartphone className="w-4 h-4" />
            <span className="text-[8px] font-black uppercase tracking-wider">Cell</span>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          {!isRecording ? (
            <button 
              onMouseUp={preventFocus}
              onClick={onStartRecording}
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-rose-900/30 group text-xs tracking-widest uppercase"
            >
              <Circle className="w-3 h-3 fill-white animate-pulse" />
              Start Recording
            </button>
          ) : (
            <button 
              onMouseUp={preventFocus}
              onClick={onStopRecording}
              className="px-6 py-3 bg-slate-800 hover:bg-rose-600 text-white rounded-2xl font-black flex items-center gap-2 transition-all border border-slate-700 text-xs tracking-widest uppercase shadow-xl"
            >
              <X className="w-3 h-3" />
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
