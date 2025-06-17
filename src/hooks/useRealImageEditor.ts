
import { useState, useRef, useCallback } from 'react';
import { useImageEditor } from './useImageEditor';
import { useCanvasTools } from './useCanvasTools';
import { useRealOCRDetection } from './useRealOCRDetection';
import { toast } from 'sonner';

interface EditableTextElement {
  id: string;
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  isEditing: boolean;
  originalText: string;
  confidence: number;
  fontSize: number;
  color: string;
}

export const useRealImageEditor = () => {
  const imageEditor = useImageEditor();
  const canvasTools = useCanvasTools();
  const ocrDetection = useRealOCRDetection();
  
  const [editableElements, setEditableElements] = useState<EditableTextElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement>(null);

  const initializeWorkingCanvas = useCallback(() => {
    if (!imageEditor.imageRef.current || !workingCanvasRef.current) return;

    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageEditor.imageRef.current;
    
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    console.log('Working canvas initialized with real image pixels');
  }, [imageEditor.imageRef]);

  const runRealAnalysis = useCallback(async () => {
    if (!workingCanvasRef.current) {
      toast.error('Please upload an image first');
      return;
    }

    try {
      initializeWorkingCanvas();
      
      const realElements = await ocrDetection.analyzeImagePixels(workingCanvasRef.current);
      
      const editableElements: EditableTextElement[] = realElements.map(element => ({
        id: element.id,
        text: element.text,
        bbox: element.bbox,
        isEditing: false,
        originalText: element.text,
        confidence: element.confidence,
        fontSize: element.fontSize,
        color: element.color
      }));
      
      setEditableElements(editableElements);
      console.log('Real analysis complete:', editableElements);
      
    } catch (error) {
      console.error('Error during real analysis:', error);
      toast.error('Failed to analyze image pixels');
    }
  }, [ocrDetection, initializeWorkingCanvas]);

  const startTextEdit = useCallback((elementId: string) => {
    setEditableElements(prev => 
      prev.map(element => 
        element.id === elementId 
          ? { ...element, isEditing: true }
          : { ...element, isEditing: false }
      )
    );
    setSelectedElement(elementId);
  }, []);

  const updateTextContent = useCallback((elementId: string, newText: string) => {
    setEditableElements(prev => 
      prev.map(element => 
        element.id === elementId 
          ? { ...element, text: newText }
          : element
      )
    );
  }, []);

  const finishTextEdit = useCallback((elementId: string) => {
    const element = editableElements.find(el => el.id === elementId);
    if (!element || !workingCanvasRef.current) return;

    if (element.text !== element.originalText) {
      // Apply real pixel changes
      ocrDetection.replaceTextInPixels(
        workingCanvasRef.current,
        {
          id: element.id,
          text: element.originalText,
          bbox: element.bbox,
          confidence: element.confidence,
          fontSize: element.fontSize,
          color: element.color
        },
        element.text
      );
      
      toast.success(`Text changed: "${element.originalText}" → "${element.text}"`);
    }

    setEditableElements(prev => 
      prev.map(el => 
        el.id === elementId 
          ? { ...el, isEditing: false, originalText: el.text }
          : el
      )
    );
    setSelectedElement(null);
  }, [editableElements, ocrDetection]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!workingCanvasRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates to actual canvas size
    const scaleX = workingCanvasRef.current.width / rect.width;
    const scaleY = workingCanvasRef.current.height / rect.height;
    const actualX = x * scaleX;
    const actualY = y * scaleY;

    if (canvasTools.currentTool === 'brush' || canvasTools.currentTool === 'eraser' || 
        canvasTools.currentTool === 'blur' || canvasTools.currentTool === 'enhance') {
      canvasTools.startDrawing(workingCanvasRef.current, actualX, actualY);
    }
  }, [canvasTools]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!workingCanvasRef.current || !canvasTools.isDrawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = workingCanvasRef.current.width / rect.width;
    const scaleY = workingCanvasRef.current.height / rect.height;
    const actualX = x * scaleX;
    const actualY = y * scaleY;

    canvasTools.draw(workingCanvasRef.current, actualX, actualY);
  }, [canvasTools]);

  const handleCanvasMouseUp = useCallback(() => {
    canvasTools.stopDrawing();
  }, [canvasTools]);

  const addTextBox = useCallback((x: number, y: number) => {
    if (!workingCanvasRef.current) return;
    
    canvasTools.addTextBox(workingCanvasRef.current, x, y, 'New Text');
  }, [canvasTools]);

  const exportEditedImage = useCallback((): string | null => {
    if (!workingCanvasRef.current) return null;
    return workingCanvasRef.current.toDataURL('image/png', 1.0);
  }, []);

  return {
    ...imageEditor,
    ...canvasTools,
    editableElements,
    selectedElement,
    workingCanvasRef,
    runRealAnalysis,
    startTextEdit,
    updateTextContent,
    finishTextEdit,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    addTextBox,
    exportEditedImage,
    isAnalyzing: ocrDetection.isAnalyzing
  };
};
