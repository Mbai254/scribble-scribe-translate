
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface DetectedObject {
  id: string;
  type: 'text' | 'person' | 'object' | 'face';
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string; // For text objects
  description?: string; // For other objects
}

export const useObjectDetection = () => {
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImage = useCallback(async (imageUrl: string): Promise<DetectedObject[]> => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI object detection (you can replace this with actual AI services)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock detected objects for demonstration
      const mockObjects: DetectedObject[] = [
        {
          id: '1',
          type: 'text',
          confidence: 0.95,
          bbox: { x: 50, y: 100, width: 200, height: 40 },
          content: 'Sample Text'
        },
        {
          id: '2',
          type: 'person',
          confidence: 0.87,
          bbox: { x: 300, y: 150, width: 150, height: 300 },
          description: 'Person in the image'
        },
        {
          id: '3',
          type: 'object',
          confidence: 0.82,
          bbox: { x: 100, y: 300, width: 100, height: 80 },
          description: 'Object detected'
        }
      ];
      
      setDetectedObjects(mockObjects);
      toast.success(`Detected ${mockObjects.length} objects in the image`);
      return mockObjects;
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error('Failed to analyze image');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearDetections = useCallback(() => {
    setDetectedObjects([]);
  }, []);

  return {
    detectedObjects,
    isAnalyzing,
    analyzeImage,
    clearDetections
  };
};
