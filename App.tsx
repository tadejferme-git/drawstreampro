
import React, { useState, useRef, useCallback, useEffect } from 'react';
import DrawingCanvas from './components/DrawingCanvas';
import CameraOverlay from './components/CameraOverlay';
import CameraView from './components/CameraView';
import Toolbar from './components/Toolbar';
import { ToolType, VideoFormat, VideoLayout } from './types';
import { Film, Plus, Camera, Mic, Settings2, PlayCircle, Circle, X, RefreshCw, Smartphone, Headphones } from 'lucide-react';

const App: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioEnhanced, setIsAudioEnhanced] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<VideoFormat>('desktop');
  const [layout, setLayout] = useState<VideoLayout>('solo');
  const [isSwapped, setIsSwapped] = useState(false);
  const [cameraOverlayPos, setCameraOverlayPos] = useState({ x: 20, y: 20 });
  
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');

  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraOverlayVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const compositionCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const compositorRafRef = useRef<number | null>(null);
  const backwardIntervalRef = useRef<number | null>(null);

  const stateRef = useRef({
    layout: 'solo' as VideoLayout,
    format: 'desktop' as VideoFormat,
    isSwapped: false,
    isCameraOn: false,
    isRecording: false,
    isPlaying: false,
    zoomScale: 1,
    zoomOffset: { x: 0, y: 0 },
    countdown: null as number | null
  });

  useEffect(() => {
    stateRef.current = {
      layout, format, isSwapped, isCameraOn, isRecording, isPlaying, zoomScale, zoomOffset, countdown
    };
  }, [layout, format, isSwapped, isCameraOn, isRecording, isPlaying, zoomScale, zoomOffset, countdown]);

  const updateDeviceList = useCallback(async (requestPermission = false) => {
    try {
      if (requestPermission) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop()); 
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDeps = devices.filter(d => d.kind === 'videoinput');
      const aDeps = devices.filter(d => d.kind === 'audioinput');
      setVideoDevices(vDeps);
      setAudioDevices(aDeps);
      
      if (vDeps.length > 0 && !selectedVideoId) setSelectedVideoId(vDeps[0].deviceId);
      if (aDeps.length > 0 && !selectedAudioId) setSelectedAudioId(aDeps[0].deviceId);
    } catch (err) {
      console.warn("Device discovery limited:", err);
    }
  }, [selectedVideoId, selectedAudioId]);

  useEffect(() => {
    updateDeviceList();
    navigator.mediaDevices.addEventListener('devicechange', () => updateDeviceList());
  }, [updateDeviceList]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const runCompositor = useCallback(() => {
    const canvas = compositionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { 
      layout: curLayout, isSwapped: curIsSwapped, 
      isCameraOn: curIsCameraOn, isRecording: curIsRecording,
      format: curFormat, zoomScale: curZoom, zoomOffset: curOffset
    } = stateRef.current;

    const isActuallyRecording = mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, w, h);
    
    const uiArea = document.getElementById('recording-area');
    const uiRect = uiArea?.getBoundingClientRect();
    const scaleFactor = uiRect ? w / uiRect.width : 1;

    const drawVideoPart = (
      v: HTMLVideoElement | HTMLCanvasElement, drawingCanvas: HTMLCanvasElement | null,
      dx: number, dy: number, dw: number, dh: number, isCamera = false
    ) => {
      if (!v) return;
      
      const vW = (v instanceof HTMLVideoElement) ? v.videoWidth : v.width;
      const vH = (v instanceof HTMLVideoElement) ? v.videoHeight : v.height;
      if (vW === 0 || vH === 0) return;

      const videoRatio = vW / vH;
      const targetRatio = dw / dh;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, dw, dh);
      ctx.clip();
      
      if (!isCamera) {
        ctx.translate(dx + curOffset.x * scaleFactor, dy + curOffset.y * scaleFactor);
        ctx.scale(curZoom, curZoom);
        dx = 0; dy = 0;
      }

      let drawW, drawH, drawX, drawY;
      if (videoRatio > targetRatio) {
        drawW = dh * videoRatio;
        drawH = dh;
        drawX = dx + (dw - drawW) / 2;
        drawY = dy;
      } else {
        drawW = dw;
        drawH = dw / videoRatio;
        drawX = dx;
        drawY = dy + (dh - drawH) / 2;
      }

      if (isCamera) {
        ctx.save();
        ctx.translate(dx + dw, dy);
        ctx.scale(-1, 1);
        const relDrawX = (dw - drawW) / 2;
        ctx.drawImage(v, 0, 0, vW, vH, relDrawX, 0, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(v, 0, 0, vW, vH, drawX, drawY, drawW, drawH);
      }

      if (drawingCanvas) {
        ctx.drawImage(drawingCanvas, dx, dy, dw, dh);
      }
      ctx.restore();
    };

    if (curLayout === 'solo') {
      if (videoRef.current) drawVideoPart(videoRef.current, drawingCanvasRef.current, 0, 0, w, h);
    } else {
      const isDesktop = curFormat === 'desktop';
      const p1w = isDesktop ? Math.floor(w / 2) : w;
      const p1h = isDesktop ? h : Math.floor(h / 2);
      const p2x = isDesktop ? p1w : 0;
      const p2y = isDesktop ? 0 : p1h;
      const p2w = w - p2x;
      const p2h = h - p2y;
      
      if (!curIsSwapped) {
        if (videoRef.current) drawVideoPart(videoRef.current, drawingCanvasRef.current, 0, 0, p1w, p1h);
        if (curIsCameraOn && cameraVideoRef.current) drawVideoPart(cameraVideoRef.current, null, p2x, p2y, p2w, p2h, true);
      } else {
        if (curIsCameraOn && cameraVideoRef.current) drawVideoPart(cameraVideoRef.current, null, 0, 0, p1w, p1h, true);
        if (videoRef.current) drawVideoPart(videoRef.current, drawingCanvasRef.current, p2x, p2y, p2w, p2h);
      }
    }

    if (curLayout === 'solo' && curIsCameraOn && cameraOverlayVideoRef.current) {
      const overlayEl = document.getElementById('camera-overlay-container');
      const videoArea = document.getElementById('recording-area');
      if (overlayEl && videoArea) {
        const areaRect = videoArea.getBoundingClientRect();
        const overlayRect = overlayEl.getBoundingClientRect();
        const relX = (overlayRect.left - areaRect.left) * scaleFactor;
        const relY = (overlayRect.top - areaRect.top) * scaleFactor;
        const relW = overlayRect.width * scaleFactor;
        const relH = overlayRect.height * scaleFactor;
        drawVideoPart(cameraOverlayVideoRef.current, null, relX, relY, relW, relH, true);
      }
    }

    if (curIsRecording || isActuallyRecording) {
      compositorRafRef.current = requestAnimationFrame(runCompositor);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = async () => {
    try {
      const audioConstraints = selectedAudioId 
        ? { deviceId: { exact: selectedAudioId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      let streamsToCombine: MediaStreamTrack[] = [];

      const canvas = compositionCanvasRef.current;
      if (!canvas) return;
      canvas.width = (format === 'phone') ? 1080 : 1920;
      canvas.height = (format === 'phone') ? 1920 : 1080;
      
      const canvasStream = canvas.captureStream(30);
      streamsToCombine.push(...canvasStream.getVideoTracks());

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 48000,
        latencyHint: 'playback' 
      });
      audioContextRef.current = audioCtx;
      const mainDestination = audioCtx.createMediaStreamDestination();

      if (videoRef.current) {
        const videoSource = audioCtx.createMediaElementSource(videoRef.current);
        videoSource.connect(mainDestination);
        videoSource.connect(audioCtx.destination); 
      }

      const micSource = audioCtx.createMediaStreamSource(micStream);
      let finalMicNode: AudioNode = micSource;

      if (isAudioEnhanced) {
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-22, audioCtx.currentTime);
        micSource.connect(compressor);
        finalMicNode = compressor;
      }
      
      finalMicNode.connect(mainDestination);
      streamsToCombine.push(...mainDestination.stream.getAudioTracks());
      
      const combinedStream = new MediaStream(streamsToCombine);
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) mimeType = 'video/mp4;codecs=avc1';
      
      const recorder = new MediaRecorder(combinedStream, { 
        mimeType, 
        videoBitsPerSecond: 12000000,
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DrawStream-Pro-${Date.now()}.mp4`;
        a.click();
        setIsRecording(false);
        stateRef.current.isRecording = false;
        if (compositorRafRef.current) cancelAnimationFrame(compositorRafRef.current);
        combinedStream.getTracks().forEach(track => track.stop());
        micStream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
      setCountdown(3);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      setCountdown(null);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCountdown(null);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
          if (audioContextRef.current) {
            audioContextRef.current.resume().then(() => {
              mediaRecorderRef.current?.start();
              setIsRecording(true);
              stateRef.current.isRecording = true;
              runCompositor();
            });
          } else {
            mediaRecorderRef.current.start();
            setIsRecording(true);
            stateRef.current.isRecording = true;
            runCompositor();
          }
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown, runCompositor]);

  // Global Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }

      if (e.code === 'ArrowRight') {
        if (videoRef.current) {
          videoRef.current.playbackRate = 0.5;
          if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
          }
        }
      }

      if (e.code === 'ArrowLeft') {
        if (videoRef.current && !backwardIntervalRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          backwardIntervalRef.current = window.setInterval(() => {
            if (videoRef.current) videoRef.current.currentTime -= 0.05;
          }, 50);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight') {
        if (videoRef.current) videoRef.current.playbackRate = 1.0;
      }
      if (e.code === 'ArrowLeft') {
        if (backwardIntervalRef.current) {
          clearInterval(backwardIntervalRef.current);
          backwardIntervalRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePlay]);

  const handleToggleCamera = useCallback(() => {
    if (!isCameraOn && videoDevices.every(d => !d.label)) {
      updateDeviceList(true);
    }
    setIsCameraOn(prev => !prev);
  }, [isCameraOn, videoDevices, updateDeviceList]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(file));
      setIsPlaying(false);
      setView('workspace');
    }
  };

  const handleResume = () => { if (videoUrl) setView('workspace'); };

  const handleAreaDoubleClick = (e: React.MouseEvent) => {
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    if (zoomScale > 1) {
      // Return to normal dimensions
      setZoomScale(1);
      setZoomOffset({ x: 0, y: 0 });
    } else {
      // Zoom into selected portion
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const newScale = 2.5;
      // Calculate offset to keep click coordinate at the same screen position
      const newOffsetX = clickX - (clickX * newScale);
      const newOffsetY = clickY - (clickY * newScale);
      
      setZoomScale(newScale);
      setZoomOffset({ x: newOffsetX, y: newOffsetY });
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col overflow-hidden select-none font-sans">
      <canvas ref={compositionCanvasRef} className="fixed pointer-events-none opacity-0" style={{ left: '-9999px', top: '0' }} />

      <div className="relative flex-1 flex flex-col items-center justify-center bg-[#0a0f1e] overflow-hidden p-4 md:p-8">
        {countdown !== null && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div key={countdown} className="text-8xl md:text-9xl font-black text-white animate-[ping_1s_infinite] drop-shadow-[0_0_30px_rgba(79,70,229,0.5)]">
              {countdown === 0 ? 'REC' : countdown}
            </div>
          </div>
        )}

        {videoUrl && view === 'workspace' ? (
          <div className="flex flex-col items-center justify-center w-full h-full max-h-full overflow-hidden">
            <div 
              id="recording-area"
              onDoubleClick={handleAreaDoubleClick}
              className="relative bg-black shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out overflow-hidden flex items-center justify-center rounded-2xl border border-slate-800" 
              style={{
                aspectRatio: (format === 'phone') ? '9/16' : '16/9',
                width: (format === 'phone') ? 'auto' : '100%',
                height: (format === 'phone') ? '100%' : 'auto',
                maxWidth: (format === 'phone') ? '56.25vh' : '100%',
                maxHeight: (format === 'phone') ? '100%' : '56.25vw'
              }}
            >
              <div 
                className="w-full h-full relative"
                style={{
                  transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomScale})`,
                  transformOrigin: '0 0'
                }}
              >
                {layout === 'solo' ? (
                  <div className="w-full h-full relative touch-none overflow-hidden">
                    <video ref={videoRef} src={videoUrl!} className="w-full h-full object-contain pointer-events-none" loop />
                    <DrawingCanvas ref={drawingCanvasRef} color={color} lineWidth={lineWidth} tool={currentTool} zoomScale={zoomScale} zoomOffset={zoomOffset} />
                  </div>
                ) : (
                  <div className={`w-full h-full flex gap-0 ${format === 'desktop' ? 'flex-row' : 'flex-col'}`}>
                     <div className={`${format === 'desktop' ? 'w-1/2 h-full' : 'h-1/2 w-full'} relative bg-black ${!isSwapped ? '' : 'order-2'}`}>
                        <video ref={videoRef} src={videoUrl!} className="w-full h-full object-cover pointer-events-none" loop />
                        <DrawingCanvas ref={drawingCanvasRef} color={color} lineWidth={lineWidth} tool={currentTool} zoomScale={zoomScale} zoomOffset={zoomOffset} />
                     </div>
                     <div className={`${format === 'desktop' ? 'w-1/2 h-full' : 'h-1/2 w-full'} relative bg-black ${!isSwapped ? '' : 'order-1'}`}>
                        <CameraView ref={cameraVideoRef} isActive={isCameraOn} deviceId={selectedVideoId} className="w-full h-full" />
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 max-w-xl w-full">
            <div className="text-center p-12 w-full border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 backdrop-blur-xl shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="bg-slate-900 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-800 relative z-10">
                <Film className="w-12 h-12 text-indigo-500" />
                <div className="absolute -top-2 -right-2 bg-indigo-600 p-1.5 rounded-lg shadow-lg">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-black mb-2 bg-gradient-to-br from-white via-white to-slate-500 bg-clip-text text-transparent uppercase tracking-tight italic">DrawStream <span className="text-indigo-500 not-italic">Pro</span></h1>
              <p className="text-slate-400 text-sm mb-8 font-medium">Professional video tutorials & storytelling.</p>
              <div className="flex flex-col gap-3 items-center">
                {videoUrl && (
                  <button onClick={handleResume} className="w-full inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/30 mb-2">
                    <PlayCircle className="w-6 h-6" /> RESUME SESSION
                  </button>
                )}
                <label className="w-full inline-flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/30 mb-2">
                  <Plus className="w-6 h-6" /> {videoUrl ? 'REPLACE VIDEO' : 'START NEW PROJECT'}
                  <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                </label>
              </div>
            </div>

            <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-1">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Hardware Configuration</span>
                </div>
                <button 
                  onClick={() => updateDeviceList(true)}
                  className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-all active:rotate-180"
                  title="Refresh device list (iPhone/AirPods)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5"><Camera className="w-3 h-3" /> Video Input</span>
                    <span className="text-[8px] opacity-60 flex items-center gap-1"><Smartphone className="w-2.5 h-2.5" /> Incl. iPhone</span>
                  </label>
                  <select 
                    className="bg-slate-950 text-sm text-slate-200 rounded-xl px-4 py-3 outline-none border border-slate-800 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-inner"
                    value={selectedVideoId}
                    onChange={(e) => setSelectedVideoId(e.target.value)}
                  >
                    {videoDevices.length === 0 && <option value="">Searching cameras...</option>}
                    {videoDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5"><Mic className="w-3 h-3" /> Audio Input</span>
                    <span className="text-[8px] opacity-60 flex items-center gap-1"><Headphones className="w-2.5 h-2.5" /> AirPods / Headphones</span>
                  </label>
                  <select 
                    className="bg-slate-950 text-sm text-slate-200 rounded-xl px-4 py-3 outline-none border border-slate-800 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-inner"
                    value={selectedAudioId}
                    onChange={(e) => setSelectedAudioId(e.target.value)}
                  >
                    {audioDevices.length === 0 && <option value="">Searching mics...</option>}
                    {audioDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Mic ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 px-1 italic">
                Tip: Space = Play/Pause Video | Right Arrow = Slow Forward | Left Arrow = Slow Backward | Double Click = Zoom Toggle
              </p>
            </div>
          </div>
        )}
      </div>

      {layout === 'solo' && view === 'workspace' && (
        <CameraOverlay isActive={isCameraOn} deviceId={selectedVideoId} position={cameraOverlayPos} onPositionChange={setCameraOverlayPos} videoElementRef={cameraOverlayVideoRef} />
      )}
      
      {videoUrl && view === 'workspace' && (
        <Toolbar 
          currentTool={currentTool} setTool={setCurrentTool} color={color} setColor={setColor} lineWidth={lineWidth} setLineWidth={setLineWidth}
          isCameraOn={isCameraOn} setCameraOn={handleToggleCamera} isRecording={isRecording} onStartRecording={startRecording} onStopRecording={stopRecording}
          videoUrl={videoUrl} onVideoSelect={handleVideoSelect} recordedUrl={recordedUrl} isPlaying={isPlaying} onTogglePlay={togglePlay}
          format={format} setFormat={setFormat} layout={layout} setLayout={setLayout} isSwapped={isSwapped} 
          onToggleSwap={() => setIsSwapped(!isSwapped)}
          isAudioEnhanced={isAudioEnhanced} setAudioEnhanced={setIsAudioEnhanced}
          onHomeClick={() => setView('home')}
        />
      )}
    </div>
  );
};

export default App;
