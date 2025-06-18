
import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { toast } from 'sonner';

interface DetectedTextElement {
  id: string;
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  fontSize: number;
  color: string;
}

export const useRealOCRDetection = () => {
  const [detectedElements, setDetectedElements] = useState<DetectedTextElement[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImagePixels = useCallback(async (canvas: HTMLCanvasElement): Promise<DetectedTextElement[]> => {
    setIsAnalyzing(true);
    
    try {
      console.log('Starting real OCR analysis on canvas...');
      
      // Convert canvas to blob for Tesseract
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      if (!blob) throw new Error('Failed to convert canvas to blob');

      const { data } = await Tesseract.recognize(blob, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });

      console.log('Raw OCR data:', data);

      // Extract real text elements from actual image using correct Tesseract.js structure
      const textElements: DetectedTextElement[] = [];
      
      // Access words through the correct hierarchy: blocks -> paragraphs -> lines -> words
      if (data.blocks && Array.isArray(data.blocks)) {
        let wordIndex = 0;
        data.blocks.forEach((block) => {
          if (block.paragraphs && Array.isArray(block.paragraphs)) {
            block.paragraphs.forEach((paragraph) => {
              if (paragraph.lines && Array.isArray(paragraph.lines)) {
                paragraph.lines.forEach((line) => {
                  if (line.words && Array.isArray(line.words)) {
                    line.words.forEach((word) => {
                      if (word.text && word.text.trim().length > 0 && word.confidence > 60) {
                        const bbox = word.bbox;
                        textElements.push({
                          id: `real-text-${wordIndex}-${Date.now()}`,
                          text: word.text.trim(),
                          bbox: {
                            x: bbox.x0,
                            y: bbox.y0,
                            width: bbox.x1 - bbox.x0,
                            height: bbox.y1 - bbox.y0,
                          },
                          confidence: word.confidence / 100,
                          fontSize: Math.max(12, (bbox.y1 - bbox.y0) * 0.8),
                          color: getPixelColor(canvas, bbox.x0, bbox.y0)
                        });
                        wordIndex++;
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

      console.log('Extracted real text elements:', textElements);
      setDetectedElements(textElements);
      
      if (textElements.length > 0) {
        toast.success(`Detected ${textElements.length} real text elements from image pixels`);
      } else {
        toast.warning('No text detected in the actual image');
      }
      
      return textElements;
    } catch (error) {
      console.error('Error analyzing real image pixels:', error);
      toast.error('Failed to analyze image content');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getPixelColor = (canvas: HTMLCanvasElement, x: number, y: number): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';

    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;
    return `rgb(${r}, ${g}, ${b})`;
  };

  const replaceTextInPixels = useCallback((
    canvas: HTMLCanvasElement,
    element: DetectedTextElement,
    newText: string
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the original text area with content-aware fill
    const imageData = ctx.getImageData(
      element.bbox.x - 5,
      element.bbox.y - 5,
      element.bbox.width + 10,
      element.bbox.height + 10
    );

    // Simple background fill (sample surrounding pixels)
    const surroundingColor = getAverageColor(canvas, element.bbox);
    ctx.fillStyle = surroundingColor;
    ctx.fillRect(element.bbox.x, element.bbox.y, element.bbox.width, element.bbox.height);

    // Draw new text
    ctx.font = `${element.fontSize}px Arial`;
    ctx.fillStyle = element.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(newText, element.bbox.x, element.bbox.y);

    console.log(`Replaced "${element.text}" with "${newText}" in image pixels`);
  }, []);

  const getAverageColor = (canvas: HTMLCanvasElement, bbox: DetectedTextElement['bbox']): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#ffffff';

    // Sample pixels around the text area
    const samples = [
      { x: bbox.x - 10, y: bbox.y },
      { x: bbox.x + bbox.width + 10, y: bbox.y },
      { x: bbox.x, y: bbox.y - 10 },
      { x: bbox.x, y: bbox.y + bbox.height + 10 }
    ];

    let totalR = 0, totalG = 0, totalB = 0;
    let validSamples = 0;

    samples.forEach(sample => {
      if (sample.x >= 0 && sample.x < canvas.width && sample.y >= 0 && sample.y < canvas.height) {
        const imageData = ctx.getImageData(sample.x, sample.y, 1, 1);
        const [r, g, b] = imageData.data;
        totalR += r;
        totalG += g;
        totalB += b;
        validSamples++;
      }
    });

    if (validSamples === 0) return '#ffffff';

    const avgR = Math.round(totalR / validSamples);
    const avgG = Math.round(totalG / validSamples);
    const avgB = Math.round(totalB / validSamples);

    return `rgb(${avgR}, ${avgG}, ${avgB})`;
  };

  const clearDetections = useCallback(() => {
    setDetectedElements([]);
  }, []);

  return {
    detectedElements,
    isAnalyzing,
    analyzeImagePixels,
    replaceTextInPixels,
    clearDetections
  };
};
