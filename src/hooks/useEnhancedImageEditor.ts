
import { useState, useRef, useCallback } from 'react';
import { useImageEditor } from './useImageEditor';
import { useOCRDetection } from './useOCRDetection';
import { useCanvasManipulation } from './useCanvasManipulation';
import { toast } from 'sonner';

interface EditableElement {
  id: string;
  type: 'text' | 'object';
  bbox: { x: number; y: number; width: number; height: number };
  content: string;
  isEditing: boolean;
  originalContent?: string;
}

export const useEnhancedImageEditor = () => {
  const imageEditor = useImageEditor();
  const ocrDetection = useOCRDetection();
  const canvasManipulation = useCanvasManipulation();
  
  const [editableElements, setEditableElements] = useState<EditableElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);

  const runSmartDetection = useCallback(async () => {
    if (!imageEditor.imageRef.current) {
      toast.error('Please upload an image first');
      return;
    }

    try {
      // Run OCR detection
      const ocrResults = await ocrDetection.detectTextInImage(imageEditor.imageRef.current);
      
      // Convert OCR results to editable elements
      const textElements: EditableElement[] = ocrResults.map(result => ({
        id: result.id,
        type: 'text',
        bbox: result.bbox,
        content: result.text,
        isEditing: false,
        originalContent: result.text
      }));
      
      setEditableElements(textElements);
      
      // Initialize canvas for manipulation
      if (imageEditor.imageRef.current) {
        canvasManipulation.initializeCanvas(imageEditor.imageRef.current);
      }
      
      toast.success(`Detected ${textElements.length} editable text elements`);
    } catch (error) {
      console.error('Error during smart detection:', error);
      toast.error('Failed to analyze image');
    }
  }, [imageEditor.imageRef, ocrDetection, canvasManipulation]);

  const startElementEdit = useCallback((elementId: string) => {
    setEditableElements(prev => 
      prev.map(element => 
        element.id === elementId 
          ? { ...element, isEditing: true }
          : { ...element, isEditing: false }
      )
    );
    setSelectedElement(elementId);
  }, []);

  const updateElementContent = useCallback((elementId: string, newContent: string) => {
    setEditableElements(prev => 
      prev.map(element => 
        element.id === elementId 
          ? { ...element, content: newContent }
          : element
      )
    );
  }, []);

  const finishElementEdit = useCallback((elementId: string) => {
    const element = editableElements.find(el => el.id === elementId);
    if (!element || !mainCanvasRef.current) return;

    // Apply the text change to the canvas
    if (element.type === 'text') {
      canvasManipulation.replaceTextPixels(
        mainCanvasRef.current,
        element.bbox,
        element.content,
        {
          fontSize: Math.max(12, element.bbox.height * 0.8),
          fontFamily: 'Arial',
          color: '#000000',
          backgroundColor: '#ffffff'
        }
      );
    }

    setEditableElements(prev => 
      prev.map(el => 
        el.id === elementId 
          ? { ...el, isEditing: false }
          : el
      )
    );
    setSelectedElement(null);
    
    toast.success('Text updated in image');
  }, [editableElements, canvasManipulation]);

  const startElementDrag = useCallback((elementId: string, startX: number, startY: number) => {
    const element = editableElements.find(el => el.id === elementId);
    if (!element) return;

    setSelectedElement(elementId);
    setIsDragging(true);
    setDragOffset({
      x: startX - element.bbox.x,
      y: startY - element.bbox.y
    });
  }, [editableElements]);

  const dragElement = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !selectedElement) return;

    const newX = clientX - dragOffset.x;
    const newY = clientY - dragOffset.y;

    setEditableElements(prev => 
      prev.map(element => 
        element.id === selectedElement 
          ? { 
              ...element, 
              bbox: { 
                ...element.bbox, 
                x: newX, 
                y: newY 
              }
            }
          : element
      )
    );
  }, [isDragging, selectedElement, dragOffset]);

  const finishElementDrag = useCallback(() => {
    if (!isDragging || !selectedElement || !mainCanvasRef.current) return;

    const element = editableElements.find(el => el.id === selectedElement);
    if (!element) return;

    // Apply the move operation to the canvas
    if (element.originalContent && element.bbox) {
      // This would need the original position to move from
      // For now, we'll just update the position
      toast.success('Element moved');
    }

    setIsDragging(false);
    setSelectedElement(null);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, selectedElement, editableElements]);

  const exportFinalImage = useCallback((): string | null => {
    if (!mainCanvasRef.current) return null;
    return mainCanvasRef.current.toDataURL('image/png', 1.0);
  }, []);

  return {
    ...imageEditor,
    ...ocrDetection,
    editableElements,
    selectedElement,
    isDragging,
    mainCanvasRef,
    runSmartDetection,
    startElementEdit,
    updateElementContent,
    finishElementEdit,
    startElementDrag,
    dragElement,
    finishElementDrag,
    exportFinalImage
  };
};
