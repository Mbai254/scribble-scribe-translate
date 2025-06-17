
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

  const getTextColor = useCallback((
    canvas: HTMLCanvasElement,
    region: { x: number; y: number; width: number; height: number }
  ): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';

    // Sample pixels in the text region to determine the dominant text color
    const imageData = ctx.getImageData(region.x, region.y, Math.min(region.width, 20), Math.min(region.height, 20));
    const data = imageData.data;
    
    let totalR = 0, totalG = 0, totalB = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      pixelCount++;
    }
    
    if (pixelCount === 0) return '#000000';
    
    const avgR = Math.round(totalR / pixelCount);
    const avgG = Math.round(totalG / pixelCount);
    const avgB = Math.round(totalB / pixelCount);
    
    return `rgb(${avgR}, ${avgG}, ${avgB})`;
  }, []);

  const replaceTextPixels = useCallback((
    canvas: HTMLCanvasElement,
    region: { x: number; y: number; width: number; height: number },
    newText: string,
    style: { fontSize: number; fontFamily: string; color: string; backgroundColor?: string }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // First, apply content-aware fill to remove original text
    contentAwareFill(canvas, region);

    // Draw new text with proper styling
    ctx.font = `${style.fontSize}px ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Measure text to ensure it fits
    const textMetrics = ctx.measureText(newText);
    const textWidth = textMetrics.width;
    
    // If text is too wide, scale font size down
    let fontSize = style.fontSize;
    if (textWidth > region.width - 4) {
      fontSize = Math.max(8, (region.width - 4) / textWidth * style.fontSize);
      ctx.font = `${fontSize}px ${style.fontFamily}`;
    }

    // Draw the new text
    ctx.fillText(newText, region.x + 2, region.y + 2);
  }, []);

  const contentAwareFill = useCallback((
    canvas: HTMLCanvasElement,
    region: { x: number; y: number; width: number; height: number }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Sample colors from surrounding area (more sophisticated approach)
    const sampleRadius = 10;
    const samples: { r: number; g: number; b: number }[] = [];
    
    // Sample from all around the region
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const sampleX = Math.round(region.x + region.width / 2 + Math.cos(rad) * (region.width / 2 + sampleRadius));
      const sampleY = Math.round(region.y + region.height / 2 + Math.sin(rad) * (region.height / 2 + sampleRadius));
      
      if (sampleX >= 0 && sampleX < canvas.width && sampleY >= 0 && sampleY < canvas.height) {
        const index = (sampleY * canvas.width + sampleX) * 4;
        samples.push({
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        });
      }
    }
    
    // Create gradient fill based on surrounding colors
    const newImageData = ctx.getImageData(region.x, region.y, region.width, region.height);
    const newData = newImageData.data;
    
    for (let y = 0; y < region.height; y++) {
      for (let x = 0; x < region.width; x++) {
        const index = (y * region.width + x) * 4;
        
        // Use distance-weighted average of surrounding samples
        let totalWeight = 0;
        let weightedR = 0, weightedG = 0, weightedB = 0;
        
        samples.forEach(sample => {
          const weight = 1; // Could be improved with distance weighting
          totalWeight += weight;
          weightedR += sample.r * weight;
          weightedG += sample.g * weight;
          weightedB += sample.b * weight;
        });
        
        if (totalWeight > 0) {
          newData[index] = Math.round(weightedR / totalWeight);
          newData[index + 1] = Math.round(weightedG / totalWeight);
          newData[index + 2] = Math.round(weightedB / totalWeight);
          newData[index + 3] = 255; // Full opacity
        }
      }
    }
    
    ctx.putImageData(newImageData, region.x, region.y);
  }, []);

  const removeObject = useCallback((
    canvas: HTMLCanvasElement,
    region: { x: number; y: number; width: number; height: number }
  ) => {
    // Use content-aware fill to remove the object
    contentAwareFill(canvas, region);
  }, [contentAwareFill]);

  const moveObject = useCallback((
    canvas: HTMLCanvasElement,
    sourceRegion: { x: number; y: number; width: number; height: number },
    targetPosition: { x: number; y: number }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Extract the object area
    const objectData = ctx.getImageData(sourceRegion.x, sourceRegion.y, sourceRegion.width, sourceRegion.height);
    
    // Fill the original position with content-aware fill
    contentAwareFill(canvas, sourceRegion);
    
    // Place the object at the new position
    ctx.putImageData(objectData, targetPosition.x, targetPosition.y);
  }, [contentAwareFill]);

  const cloneCanvas = useCallback((sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const clonedCanvas = document.createElement('canvas');
    const clonedCtx = clonedCanvas.getContext('2d');
    
    if (!clonedCtx) throw new Error('Could not get cloned canvas context');
    
    clonedCanvas.width = sourceCanvas.width;
    clonedCanvas.height = sourceCanvas.height;
    clonedCtx.drawImage(sourceCanvas, 0, 0);
    
    return clonedCanvas;
  }, []);

  return {
    initializeCanvas,
    replaceTextPixels,
    contentAwareFill,
    removeObject,
    moveObject,
    getTextColor,
    cloneCanvas,
    workingCanvas: workingCanvasRef.current
  };
};
