import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TextRegion {
  id: string;
  text: string;
  originalText: string;
  translatedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  status: 'original' | 'translated' | 'edited';
  confidence: number;
}

export const useImageEditor = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [textRegions, setTextRegions] = useState<TextRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading to path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const saveImageToDatabase = async (originalUrl: string, filename: string, fileSize: number, mimeType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('user_images')
        .insert({
          original_url: originalUrl,
          filename,
          file_size: fileSize,
          mime_type: mimeType,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving image to database:', error);
      toast.error('Failed to save image');
      return null;
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, JPEG, GIF, WebP)');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Upload to storage
      const publicUrl = await uploadImageToStorage(file);
      if (!publicUrl) return;

      // Save to database
      const imageId = await saveImageToDatabase(publicUrl, file.name, file.size, file.type);
      if (!imageId) return;

      // Update local state
      setUploadedImage(publicUrl);
      setCurrentImageId(imageId);
      setTextRegions([]);
      setSelectedRegion(null);
      setEditingRegion(null);
      
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const replaceImage = useCallback(async (file: File) => {
    if (!currentImageId) {
      handleFileUpload(file);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Upload new image
      const publicUrl = await uploadImageToStorage(file);
      if (!publicUrl) return;

      // Update existing record
      const { error } = await supabase
        .from('user_images')
        .update({
          original_url: publicUrl,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentImageId);

      if (error) throw error;

      // Update local state
      setUploadedImage(publicUrl);
      setTextRegions([]);
      setSelectedRegion(null);
      setEditingRegion(null);
      
      toast.success('Image replaced successfully!');
    } catch (error) {
      console.error('Error replacing image:', error);
      toast.error('Failed to replace image');
    } finally {
      setIsProcessing(false);
    }
  }, [currentImageId, handleFileUpload]);

  const saveTextRegions = useCallback(async (regions: TextRegion[]) => {
    if (!currentImageId) return;

    try {
      // Delete existing regions
      await supabase
        .from('text_regions')
        .delete()
        .eq('image_id', currentImageId);

      // Insert new regions
      if (regions.length > 0) {
        const { error } = await supabase
          .from('text_regions')
          .insert(
            regions.map(region => ({
              image_id: currentImageId,
              original_text: region.originalText,
              edited_text: region.text,
              translated_text: region.translatedText,
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
              font_size: region.fontSize,
              font_family: region.fontFamily,
              color: region.color,
              background_color: region.backgroundColor,
              status: region.status,
              confidence: region.confidence
            }))
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving text regions:', error);
      toast.error('Failed to save text regions');
    }
  }, [currentImageId]);

  const addTextRegion = useCallback((x: number, y: number, text: string = 'New Text') => {
    const newRegion: TextRegion = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      originalText: text,
      translatedText: '',
      x,
      y,
      width: 120,
      height: 30,
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      status: 'edited',
      confidence: 1.0
    };

    setTextRegions(prev => {
      const updated = [...prev, newRegion];
      saveTextRegions(updated);
      return updated;
    });
    setSelectedRegion(newRegion.id);
    setEditingRegion(newRegion.id);
  }, [saveTextRegions]);

  const updateTextRegion = useCallback((id: string, updates: Partial<TextRegion>) => {
    setTextRegions(prev => {
      const updated = prev.map(region => 
        region.id === id ? { ...region, ...updates } : region
      );
      saveTextRegions(updated);
      return updated;
    });
  }, [saveTextRegions]);

  const deleteTextRegion = useCallback((id: string) => {
    setTextRegions(prev => {
      const updated = prev.filter(region => region.id !== id);
      saveTextRegions(updated);
      return updated;
    });
    setSelectedRegion(null);
    setEditingRegion(null);
  }, [saveTextRegions]);

  const generateEditedImage = useCallback(async (): Promise<string | null> => {
    if (!canvasRef.current || !imageRef.current || !uploadedImage) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to match image
    canvas.width = imageRef.current.naturalWidth;
    canvas.height = imageRef.current.naturalHeight;

    // Draw the original image
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw text regions
    textRegions.forEach(region => {
      // Calculate scale factors
      const scaleX = canvas.width / imageRef.current!.clientWidth;
      const scaleY = canvas.height / imageRef.current!.clientHeight;

      const scaledX = region.x * scaleX;
      const scaledY = region.y * scaleY;
      const scaledWidth = region.width * scaleX;
      const scaledHeight = region.height * scaleY;
      const scaledFontSize = region.fontSize * Math.min(scaleX, scaleY);

      // Draw background
      ctx.fillStyle = region.backgroundColor;
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw text
      ctx.fillStyle = region.color;
      ctx.font = `${scaledFontSize}px ${region.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Word wrap text
      const words = region.text.split(' ');
      let line = '';
      let lineY = scaledY + 5;
      const lineHeight = scaledFontSize * 1.2;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const testWidth = ctx.measureText(testLine).width;
        
        if (testWidth > scaledWidth - 10 && n > 0) {
          ctx.fillText(line, scaledX + 5, lineY);
          line = words[n] + ' ';
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, scaledX + 5, lineY);
    });

    return canvas.toDataURL('image/png');
  }, [uploadedImage, textRegions]);

  return {
    uploadedImage,
    textRegions,
    selectedRegion,
    editingRegion,
    currentImageId,
    isProcessing,
    canvasRef,
    imageRef,
    setSelectedRegion,
    setEditingRegion,
    handleFileUpload,
    replaceImage,
    addTextRegion,
    updateTextRegion,
    deleteTextRegion,
    generateEditedImage
  };
};
