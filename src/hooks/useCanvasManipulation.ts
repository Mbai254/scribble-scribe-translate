
import { useCallback, useRef } from 'react';

interface CanvasManipulationOptions {
  sourceCanvas: HTMLCanvasElement;
  targetCanvas: HTMLCanvasElement;
}

export const useCanvasManipulation = () => {
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const initializeCanvas = useCallback((image: HTMLImageElement): HTMLCanvasElement => {
    if (!workingCanvasRef.current) {
      workingCanvasRef.current = document.createElement('canvas');
    }
    
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
    
    return canvas;
  }, []);

  const replaceTextPixels = useCallback((
    canvas: HTMLCanvasElement,
    region: { x: number; y: number; width: number; height: number },
    newText: string,
    style: { fontSize: number; fontFamily: string; color: string; backgroundColor?: string }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the original text area
    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
    } else {
      // Use intelligent background detection/reconstruction
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(region.x, region.y, region.width, region.height);

    // Draw new text
    ctx.font = `${style.fontSize}px ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Word wrap the text to fit in the region
    const words = newText.split(' ');
    let line = '';
    let y = region.y + 2;
    const lineHeight = style.fontSize * 1.2;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > region.width - 4 && n > 0) {
        ctx.fillText(line, region.x + 2, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, region.x + 2, y);
  }, []);

  const contentAwareFill = useCallback((
    canvas: HTMLCanvasElement,
    region: { x: number; y: number; width: number; height: number }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple content-aware fill using surrounding pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Sample colors from surrounding area
    const sampleColors: number[][] = [];
    const sampleSize = 5;
    
    // Sample from top and bottom borders
    for (let x = region.x; x < region.x + region.width; x += sampleSize) {
      if (x >= 0 && x < canvas.width) {
        // Top border
        if (region.y > 0) {
          const topIndex = ((region.y - 1) * canvas.width + x) * 4;
          sampleColors.push([data[topIndex], data[topIndex + 1], data[topIndex + 2]]);
        }
        // Bottom border
        if (region.y + region.height < canvas.height) {
          const bottomIndex = ((region.y + region.height) * canvas.width + x) * 4;
          sampleColors.push([data[bottomIndex], data[bottomIndex + 1], data[bottomIndex + 2]]);
        }
      }
    }
    
    // Sample from left and right borders
    for (let y = region.y; y < region.y + region.height; y += sampleSize) {
      if (y >= 0 && y < canvas.height) {
        // Left border
        if (region.x > 0) {
          const leftIndex = (y * canvas.width + (region.x - 1)) * 4;
          sampleColors.push([data[leftIndex], data[leftIndex + 1], data[leftIndex + 2]]);
        }
        // Right border
        if (region.x + region.width < canvas.width) {
          const rightIndex = (y * canvas.width + (region.x + region.width)) * 4;
          sampleColors.push([data[rightIndex], data[rightIndex + 1], data[rightIndex + 2]]);
        }
      }
    }
    
    // Calculate average color
    if (sampleColors.length > 0) {
      const avgR = Math.round(sampleColors.reduce((sum, color) => sum + color[0], 0) / sampleColors.length);
      const avgG = Math.round(sampleColors.reduce((sum, color) => sum + color[1], 0) / sampleColors.length);
      const avgB = Math.round(sampleColors.reduce((sum, color) => sum + color[2], 0) / sampleColors.length);
      
      ctx.fillStyle = `rgb(${avgR}, ${avgG}, ${avgB})`;
      ctx.fillRect(region.x, region.y, region.width, region.height);
    }
  }, []);

  const moveObject = useCallback((
    canvas: HTMLCanvasElement,
    sourceRegion: { x: number; y: number; width: number; height: number },
    targetPosition: { x: number; y: number }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Extract the object
    const objectData = ctx.getImageData(sourceRegion.x, sourceRegion.y, sourceRegion.width, sourceRegion.height);
    
    // Fill the original position with content-aware fill
    contentAwareFill(canvas, sourceRegion);
    
    // Place the object at the new position
    ctx.putImageData(objectData, targetPosition.x, targetPosition.y);
  }, [contentAwareFill]);

  return {
    initializeCanvas,
    replaceTextPixels,
    contentAwareFill,
    moveObject,
    workingCanvas: workingCanvasRef.current
  };
};
