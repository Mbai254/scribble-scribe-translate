
import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { toast } from 'sonner';

interface OCRTextRegion {
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
  fontFamily: string;
  color: string;
}

export const useOCRDetection = () => {
  const [detectedText, setDetectedText] = useState<OCRTextRegion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const detectTextInImage = useCallback(async (imageElement: HTMLImageElement): Promise<OCRTextRegion[]> => {
    setIsProcessing(true);
    
    try {
      console.log('Starting OCR text detection...');
      
      const { data } = await Tesseract.recognize(imageElement, 'eng', {
        logger: m => console.log(m)
      });

      console.log('OCR data structure:', data);

      // Access words from the data structure - try different possible paths
      let allWords: any[] = [];
      
      if (data.words && Array.isArray(data.words)) {
        allWords = data.words;
      } else if (data.paragraphs && Array.isArray(data.paragraphs)) {
        allWords = data.paragraphs.flatMap((paragraph: any) => 
          paragraph.lines?.flatMap((line: any) => line.words || []) || []
        );
      } else if (data.lines && Array.isArray(data.lines)) {
        allWords = data.lines.flatMap((line: any) => line.words || []);
      } else {
        // Fallback: try to extract from the text directly
        const text = data.text || '';
        if (text.trim()) {
          allWords = [{
            text: text,
            confidence: 80,
            bbox: { x0: 0, y0: 0, x1: 100, y1: 20 }
          }];
        }
      }

      const textRegions: OCRTextRegion[] = allWords
        .filter(word => word && word.text && word.confidence > 30)
        .map((word, index) => ({
          id: `ocr-${index}`,
          text: word.text,
          bbox: {
            x: word.bbox?.x0 || 0,
            y: word.bbox?.y0 || 0,
            width: (word.bbox?.x1 || 0) - (word.bbox?.x0 || 0),
            height: (word.bbox?.y1 || 0) - (word.bbox?.y0 || 0),
          },
          confidence: word.confidence / 100,
          fontSize: Math.max(12, (word.bbox?.y1 || 20) - (word.bbox?.y0 || 0)),
          fontFamily: 'Arial',
          color: '#000000'
        }));

      setDetectedText(textRegions);
      toast.success(`Detected ${textRegions.length} text regions`);
      return textRegions;
    } catch (error) {
      console.error('Error during OCR detection:', error);
      toast.error('Failed to detect text in image');
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearDetections = useCallback(() => {
    setDetectedText([]);
  }, []);

  return {
    detectedText,
    isProcessing,
    detectTextInImage,
    clearDetections
  };
};
