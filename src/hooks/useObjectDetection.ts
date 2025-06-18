
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useGeminiAI } from './useGeminiAI';

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
  const { analyzeImage: geminiAnalyze } = useGeminiAI();

  const analyzeImage = useCallback(async (imageUrl: string): Promise<DetectedObject[]> => {
    setIsAnalyzing(true);
    
    try {
      console.log('Starting real AI analysis with Gemini...');
      
      const prompt = `Analyze this image and identify all text, logos, objects, and people with their approximate positions. 
      For each detected item, provide:
      1. The exact text content (if it's text or logo with text)
      2. The type (text, logo, object, or person)
      3. A brief description
      4. Approximate position as percentage of image (top-left corner and dimensions)
      
      Format your response as a JSON array like this:
      [
        {
          "text": "MH 5488",
          "type": "text",
          "description": "Flight number text",
          "position": { "x": 20, "y": 30, "width": 15, "height": 8 }
        },
        {
          "text": "Malaysia Airlines",
          "type": "logo",
          "description": "Malaysia Airlines logo with text",
          "position": { "x": 10, "y": 10, "width": 25, "height": 12 }
        },
        {
          "text": "AK4581",
          "type": "text", 
          "description": "Another flight number",
          "position": { "x": 60, "y": 45, "width": 12, "height": 6 }
        }
      ]
      
      Be precise with text extraction and position estimates.`;

      const analysis = await geminiAnalyze(imageUrl, 'general');
      
      if (!analysis) {
        throw new Error('No analysis result from Gemini');
      }

      console.log('Gemini analysis result:', analysis);

      let detectedElements: DetectedObject[] = [];

      try {
        // Try to parse JSON from the analysis
        const jsonMatch = analysis.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedElements = JSON.parse(jsonMatch[0]);
          
          // Convert to our detected elements format
          detectedElements = parsedElements.map((element: any, index: number) => ({
            id: `ai-${index}`,
            type: element.type || 'text',
            confidence: 0.9,
            bbox: {
              x: (element.position?.x || Math.random() * 50) * 8, // Convert percentage to pixels (approximate)
              y: (element.position?.y || Math.random() * 50) * 6,
              width: (element.position?.width || 10) * 8,
              height: (element.position?.height || 5) * 6
            },
            content: element.text || element.description,
            description: element.description
          }));
        } else {
          // Fallback: extract text mentions from analysis
          console.log('No JSON found, extracting text from analysis...');
          const textMatches = analysis.match(/["']([A-Z0-9\s]+)["']/g) || [];
          const uniqueTexts = [...new Set(textMatches.map(match => match.replace(/["']/g, '')))];
          
          detectedElements = uniqueTexts.slice(0, 10).map((text, index) => ({
            id: `extracted-${index}`,
            type: 'text' as const,
            confidence: 0.85,
            bbox: {
              x: 50 + (index % 3) * 200,
              y: 100 + Math.floor(index / 3) * 80,
              width: Math.max(text.length * 8, 100),
              height: 30
            },
            content: text,
            description: `Extracted text: ${text}`
          }));
        }
        
        console.log('Processed detected elements:', detectedElements);
        setDetectedObjects(detectedElements);
        toast.success(`AI detected ${detectedElements.length} elements in the image!`);
        return detectedElements;

      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        
        // Create fallback elements based on analysis content
        const fallbackElements: DetectedObject[] = [{
          id: 'fallback-1',
          type: 'text',
          confidence: 0.7,
          bbox: { x: 100, y: 100, width: 200, height: 40 },
          content: 'AI Analysis Available',
          description: 'Check console for full analysis'
        }];
        
        setDetectedObjects(fallbackElements);
        toast.warning('Analysis completed, check console for details');
        return fallbackElements;
      }
      
    } catch (error) {
      console.error('Error during real AI analysis:', error);
      toast.error('Failed to analyze image with AI');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [geminiAnalyze]);

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
