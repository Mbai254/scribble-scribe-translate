
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GeminiResponse {
  success: boolean;
  text: string;
  fullResponse?: any;
}

export const useGeminiAI = () => {
  const [isLoading, setIsLoading] = useState(false);

  const analyzeWithGemini = async (prompt: string, imageData?: string): Promise<string | null> => {
    setIsLoading(true);
    
    try {
      console.log('Calling Gemini AI with prompt:', prompt);
      
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { 
          prompt,
          imageData 
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast.error('Failed to connect to AI service');
        return null;
      }

      if (!data.success) {
        console.error('Gemini API error:', data.error);
        toast.error(`AI Error: ${data.error}`);
        return null;
      }

      console.log('Gemini response:', data.text);
      return data.text;

    } catch (error) {
      console.error('Error calling Gemini AI:', error);
      toast.error('Failed to analyze with AI');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeImage = async (imageData: string, analysisType: string = 'general'): Promise<string | null> => {
    const prompts = {
      general: 'Describe what you see in this image in detail.',
      text: 'Extract and list all text visible in this image. Include any numbers, letters, words, or phrases you can identify.',
      objects: 'Identify and list all objects, people, and items visible in this image.',
      edit_suggestions: 'Analyze this image and suggest specific editing improvements or modifications that could be made.'
    };

    const prompt = prompts[analysisType as keyof typeof prompts] || prompts.general;
    return await analyzeWithGemini(prompt, imageData);
  };

  const generateEditInstructions = async (imageData: string, userRequest: string): Promise<string | null> => {
    const prompt = `Looking at this image, the user wants to: "${userRequest}". 
    Provide specific, step-by-step instructions for how to accomplish this edit. 
    Be detailed about techniques, tools, and approaches that would work best.`;
    
    return await analyzeWithGemini(prompt, imageData);
  };

  return {
    isLoading,
    analyzeWithGemini,
    analyzeImage,
    generateEditInstructions
  };
};
