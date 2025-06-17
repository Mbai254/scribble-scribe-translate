
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

      // Access words from the correct Tesseract.js structure
      let allWords: any[] = [];
      
      // Tesseract.js structure: data.blocks -> paragraphs -> lines -> words
      if (data.blocks && Array.isArray(data.blocks)) {
        allWords = data.blocks.flatMap((block: any) => 
          block.paragraphs?.flatMap((paragraph: any) => 
            paragraph.lines?.flatMap((line: any) => line.words || []) || []
          ) || []
        );
      }
      
      // Fallback: if no words found, create a single region from the full text
      if (allWords.length === 0 && data.text && data.text.trim()) {
        allWords = [{
          text: data.text.trim(),
          confidence: 80,
          bbox: { x0: 0, y0: 0, x1: 100, y1: 20 }
        }];
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
