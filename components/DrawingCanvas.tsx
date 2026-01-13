
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { DrawingStroke, ToolType } from '../types';

interface DrawingCanvasProps {
  color: string;
  lineWidth: number;
  tool: ToolType;
  zoomScale: number;
  zoomOffset: { x: number; y: number };
}

const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({ color, lineWidth, tool, zoomScale, zoomOffset }, ref) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);

  useImperativeHandle(ref, () => internalCanvasRef.current!);

  const getDPR = () => window.devicePixelRatio || 1;

  const drawSmoothStroke = (ctx: CanvasRenderingContext2D, points: {x: number, y: number}[], strokeColor: string, strokeWidth: number) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * getDPR();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Move to the first point
    ctx.moveTo(points[0].x * getDPR(), points[0].y * getDPR());

    // Use quadratic curves through midpoints for smoothness
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(
        points[i].x * getDPR(), 
        points[i].y * getDPR(), 
        xc * getDPR(), 
        yc * getDPR()
      );
    }

    // Curve through the last two points
    if (points.length > 2) {
      const lastIdx = points.length - 2;
      ctx.quadraticCurveTo(
        points[lastIdx].x * getDPR(),
        points[lastIdx].y * getDPR(),
        points[lastIdx + 1].x * getDPR(),
        points[lastIdx + 1].y * getDPR()
      );
    } else {
      ctx.lineTo(points[1].x * getDPR(), points[1].y * getDPR());
    }

    ctx.stroke();
  };

  const redraw = useCallback(() => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing quality hints
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    strokes.forEach(stroke => drawSmoothStroke(ctx, stroke.points, stroke.color, stroke.width));
    if (currentStroke.length > 0) drawSmoothStroke(ctx, currentStroke, color, lineWidth);
  }, [strokes, currentStroke, color, lineWidth]);

  const handleResize = useCallback(() => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    
    // We want the internal buffer to always be the unscaled size to keep drawings stable
    // rect.width/height when parent is transformed via CSS includes scale.
    // So we divide by zoomScale to get back to unscaled coordinate space.
    const rect = parent.getBoundingClientRect();
    const dpr = getDPR();
    
    const unscaledWidth = rect.width / zoomScale;
    const unscaledHeight = rect.height / zoomScale;

    // Set display size (css pixels)
    canvas.style.width = `${unscaledWidth}px`;
    canvas.style.height = `${unscaledHeight}px`;
    
    // Set internal buffer size (scaled for DPR)
    canvas.width = unscaledWidth * dpr;
    canvas.height = unscaledHeight * dpr;
    
    redraw();
  }, [redraw, zoomScale]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => { redraw(); }, [strokes, currentStroke, redraw]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = internalCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Adjust client coordinates to the unscaled local coordinate space
    // rect.left/top includes zoomOffset and position on screen
    return {
      x: (clientX - rect.left) / zoomScale,
      y: (clientY - rect.top) / zoomScale
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool !== 'pen') return;
    setIsDrawing(true);
    setCurrentStroke([getCoordinates(e)]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    
    // Only add point if it moved significantly to keep performance high and curves clean
    setCurrentStroke(prev => {
      if (prev.length === 0) return [coords];
      const last = prev[prev.length - 1];
      const dist = Math.sqrt(Math.pow(coords.x - last.x, 2) + Math.pow(coords.y - last.y, 2));
      if (dist < 2) return prev; 
      return [...prev, coords];
    });
  };

  const stopDrawing = () => {
    if (isDrawing && currentStroke.length > 0) {
      setStrokes(prev => [...prev, { points: currentStroke, color, width: lineWidth }]);
      setCurrentStroke([]);
    }
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleGlobalClear = () => setStrokes([]);
    window.addEventListener('clear-canvas', handleGlobalClear);
    return () => window.removeEventListener('clear-canvas', handleGlobalClear);
  }, []);

  return (
    <canvas
      ref={internalCanvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      className={`absolute top-0 left-0 w-full h-full z-10 ${tool === 'pen' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
    />
  );
});

export default DrawingCanvas;
