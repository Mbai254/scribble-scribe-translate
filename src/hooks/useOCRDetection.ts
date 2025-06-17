
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

      console.log('OCR raw data:', data);

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
      
      console.log('Extracted words:', allWords);

      // Filter and process detected words with higher confidence threshold
      const textRegions: OCRTextRegion[] = allWords
        .filter(word => word && word.text && word.text.trim().length > 0 && word.confidence > 50)
        .map((word, index) => {
          const bbox = word.bbox || { x0: 0, y0: 0, x1: 100, y1: 20 };
          const width = Math.max(10, bbox.x1 - bbox.x0);
          const height = Math.max(10, bbox.y1 - bbox.y0);
          
          return {
            id: `ocr-${index}-${Date.now()}`,
            text: word.text.trim(),
            bbox: {
              x: bbox.x0,
              y: bbox.y0,
              width: width,
              height: height,
            },
            confidence: Math.round(word.confidence) / 100,
            fontSize: Math.max(12, height * 0.8),
            fontFamily: 'Arial',
            color: '#000000'
          };
        });

      console.log('Processed text regions:', textRegions);
      setDetectedText(textRegions);
      
      if (textRegions.length > 0) {
        toast.success(`Detected ${textRegions.length} text elements`);
      } else {
        toast.warning('No text detected in image');
      }
      
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
