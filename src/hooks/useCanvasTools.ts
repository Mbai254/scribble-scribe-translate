
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface ToolSettings {
  brushSize: number;
  brushColor: string;
  opacity: number;
}

export const useCanvasTools = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser' | 'blur' | 'enhance'>('brush');
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    brushSize: 20,
    brushColor: '#000000',
    opacity: 1
  });
  
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const startDrawing = useCallback((canvas: HTMLCanvasElement, x: number, y: number) => {
    setIsDrawing(true);
    lastPointRef.current = { x, y };
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.globalAlpha = toolSettings.opacity;
    ctx.lineWidth = toolSettings.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'brush') {
      ctx.strokeStyle = toolSettings.brushColor;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [currentTool, toolSettings]);

  const draw = useCallback((canvas: HTMLCanvasElement, x: number, y: number) => {
    if (!isDrawing || !lastPointRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'blur') {
      applyBlur(canvas, x, y, toolSettings.brushSize);
    } else if (currentTool === 'enhance') {
      applyEnhancement(canvas, x, y, toolSettings.brushSize);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    lastPointRef.current = { x, y };
  }, [isDrawing, currentTool, toolSettings.brushSize]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const applyBlur = useCallback((canvas: HTMLCanvasElement, x: number, y: number, radius: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(x - radius, y - radius, radius * 2, radius * 2);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Simple box blur
    const blurredData = new Uint8ClampedArray(data);
    const blurRadius = 2;
    
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        for (let di = -blurRadius; di <= blurRadius; di++) {
          for (let dj = -blurRadius; dj <= blurRadius; dj++) {
            const ni = i + di;
            const nj = j + dj;
            
            if (ni >= 0 && ni < height && nj >= 0 && nj < width) {
              const idx = (ni * width + nj) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }
          }
        }
        
        const idx = (i * width + j) * 4;
        blurredData[idx] = r / count;
        blurredData[idx + 1] = g / count;
        blurredData[idx + 2] = b / count;
        blurredData[idx + 3] = a / count;
      }
    }
    
    const blurredImageData = new ImageData(blurredData, width, height);
    ctx.putImageData(blurredImageData, x - radius, y - radius);
  }, []);

  const applyEnhancement = useCallback((canvas: HTMLCanvasElement, x: number, y: number, radius: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(x - radius, y - radius, radius * 2, radius * 2);
    const data = imageData.data;
    
    // Simple sharpening filter
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.2); // Red
      data[i + 1] = Math.min(255, data[i + 1] * 1.2); // Green
      data[i + 2] = Math.min(255, data[i + 2] * 1.2); // Blue
    }
    
    ctx.putImageData(imageData, x - radius, y - radius);
  }, []);

  const addTextBox = useCallback((canvas: HTMLCanvasElement, x: number, y: number, text: string = 'New Text') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = '24px Arial';
    ctx.fillStyle = toolSettings.brushColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Add background
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = 30;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(x - 5, y - 5, textWidth + 10, textHeight + 10);
    
    ctx.fillStyle = toolSettings.brushColor;
    ctx.fillText(text, x, y);
    
    toast.success('Text box added');
  }, [toolSettings.brushColor]);

  return {
    currentTool,
    setCurrentTool,
    toolSettings,
    setToolSettings,
    isDrawing,
    startDrawing,
    draw,
    stopDrawing,
    addTextBox
  };
};
