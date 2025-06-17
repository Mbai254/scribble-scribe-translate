
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
  confidence?: number;
}

export const useEnhancedImageEditor = () => {
  const imageEditor = useImageEditor();
  const ocrDetection = useOCRDetection();
  const canvasManipulation = useCanvasManipulation();
  
  const [editableElements, setEditableElements] = useState<EditableElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);

  const runSmartDetection = useCallback(async () => {
    if (!imageEditor.imageRef.current) {
      toast.error('Please upload an image first');
      return;
    }

    try {
      console.log('Starting real OCR detection...');
      
      // Initialize canvas for manipulation
      const workingCanvas = canvasManipulation.initializeCanvas(imageEditor.imageRef.current);
      setOriginalCanvas(canvasManipulation.cloneCanvas(workingCanvas));
      
      // Copy to main canvas
      if (mainCanvasRef.current) {
        const mainCtx = mainCanvasRef.current.getContext('2d');
        if (mainCtx) {
          mainCanvasRef.current.width = workingCanvas.width;
          mainCanvasRef.current.height = workingCanvas.height;
          mainCtx.drawImage(workingCanvas, 0, 0);
        }
      }
      
      // Run real OCR detection
      const ocrResults = await ocrDetection.detectTextInImage(imageEditor.imageRef.current);
      
      // Convert OCR results to editable elements with real data
      const textElements: EditableElement[] = ocrResults.map(result => ({
        id: result.id,
        type: 'text',
        bbox: {
          x: Math.round(result.bbox.x),
          y: Math.round(result.bbox.y),
          width: Math.round(result.bbox.width),
          height: Math.round(result.bbox.height)
        },
        content: result.text,
        isEditing: false,
        originalContent: result.text,
        confidence: result.confidence
      }));
      
      setEditableElements(textElements);
      console.log('Detected elements:', textElements);
      
      if (textElements.length > 0) {
        toast.success(`Successfully detected ${textElements.length} text elements`);
      } else {
        toast.warning('No text found in the image');
      }
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

    // Apply the text change to the canvas using real pixel manipulation
    if (element.type === 'text' && element.content !== element.originalContent) {
      const originalTextColor = canvasManipulation.getTextColor(mainCanvasRef.current, element.bbox);
      
      canvasManipulation.replaceTextPixels(
        mainCanvasRef.current,
        element.bbox,
        element.content,
        {
          fontSize: Math.max(12, element.bbox.height * 0.8),
          fontFamily: 'Arial',
          color: originalTextColor
        }
      );
      
      toast.success(`Text updated: "${element.originalContent}" → "${element.content}"`);
    }

    setEditableElements(prev => 
      prev.map(el => 
        el.id === elementId 
          ? { ...el, isEditing: false, originalContent: el.content }
          : el
      )
    );
    setSelectedElement(null);
  }, [editableElements, canvasManipulation]);

  const deleteElement = useCallback((elementId: string) => {
    const element = editableElements.find(el => el.id === elementId);
    if (!element || !mainCanvasRef.current) return;

    // Remove the element using content-aware fill
    canvasManipulation.removeObject(mainCanvasRef.current, element.bbox);
    
    // Remove from elements list
    setEditableElements(prev => prev.filter(el => el.id !== elementId));
    setSelectedElement(null);
    
    toast.success('Element removed from image');
  }, [editableElements, canvasManipulation]);

  const startElementDrag = useCallback((elementId: string, startX: number, startY: number) => {
    const element = editableElements.find(el => el.id === elementId);
    if (!element || element.isEditing) return;

    setSelectedElement(elementId);
    setIsDragging(true);
    setDragOffset({
      x: startX - element.bbox.x,
      y: startY - element.bbox.y
    });
  }, [editableElements]);

  const dragElement = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !selectedElement) return;

    const newX = Math.max(0, clientX - dragOffset.x);
    const newY = Math.max(0, clientY - dragOffset.y);

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
    if (!isDragging || !selectedElement || !mainCanvasRef.current) {
      setIsDragging(false);
      return;
    }

    const element = editableElements.find(el => el.id === selectedElement);
    if (!element || !element.originalContent) {
      setIsDragging(false);
      return;
    }

    // Find the original position and move the object on the canvas
    const originalElement = editableElements.find(el => el.id === selectedElement);
    if (originalElement) {
      canvasManipulation.moveObject(
        mainCanvasRef.current,
        { x: originalElement.bbox.x, y: originalElement.bbox.y, width: originalElement.bbox.width, height: originalElement.bbox.height },
        { x: element.bbox.x, y: element.bbox.y }
      );
      
      toast.success('Element moved');
    }

    setIsDragging(false);
    setSelectedElement(null);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, selectedElement, editableElements, canvasManipulation]);

  const exportFinalImage = useCallback((): string | null => {
    if (!mainCanvasRef.current) return null;
    return mainCanvasRef.current.toDataURL('image/png', 1.0);
  }, []);

  const resetToOriginal = useCallback(() => {
    if (!originalCanvas || !mainCanvasRef.current) return;
    
    const ctx = mainCanvasRef.current.getContext('2d');
    if (ctx) {
      mainCanvasRef.current.width = originalCanvas.width;
      mainCanvasRef.current.height = originalCanvas.height;
      ctx.drawImage(originalCanvas, 0, 0);
    }
    
    // Reset all elements to original state
    setEditableElements(prev => 
      prev.map(el => ({ 
        ...el, 
        content: el.originalContent || el.content,
        isEditing: false 
      }))
    );
    
    toast.success('Image reset to original');
  }, [originalCanvas]);

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
    deleteElement,
    startElementDrag,
    dragElement,
    finishElementDrag,
    exportFinalImage,
    resetToOriginal
  };
};
