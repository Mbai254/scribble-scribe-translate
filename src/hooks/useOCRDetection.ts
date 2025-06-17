
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

      // Access words through the paragraphs structure
      const allWords = data.paragraphs.flatMap(paragraph => 
        paragraph.lines.flatMap(line => line.words)
      );

      const textRegions: OCRTextRegion[] = allWords
        .filter(word => word.confidence > 30) // Filter out low confidence detections
        .map((word, index) => ({
          id: `ocr-${index}`,
          text: word.text,
          bbox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
          },
          confidence: word.confidence / 100,
          fontSize: Math.max(12, word.bbox.y1 - word.bbox.y0),
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
