
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRealImageEditor } from '@/hooks/useRealImageEditor';
import { useGeminiAI } from '@/hooks/useGeminiAI';
import { DetectedElement } from '@/types/imageEditor';
import UploadZone from './image-editor/UploadZone';
import ToolsPanel from './image-editor/ToolsPanel';
import DetectedElementsList from './image-editor/DetectedElementsList';
import ImageCanvas from './image-editor/ImageCanvas';
import Toolbar from './image-editor/Toolbar';

const SmartImageEditor = () => {
  const {
    uploadedImage,
    editableElements,
    selectedElement,
    isProcessing,
    isAnalyzing,
    workingCanvasRef,
    imageRef,
    currentTool,
    setCurrentTool,
    toolSettings,
    setToolSettings,
    handleFileUpload,
    runRealAnalysis,
    startTextEdit,
    updateTextContent,
    finishTextEdit,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    addTextBox,
    exportEditedImage
  } = useRealImageEditor();

  const { isLoading: isGeminiLoading, analyzeImage, generateEditInstructions } = useGeminiAI();
  
  const [geminiDetectedElements, setGeminiDetectedElements] = useState<DetectedElement[]>([]);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Initialize working canvas when image is uploaded
  useEffect(() => {
    if (uploadedImage && imageRef.current && workingCanvasRef.current) {
      const canvas = workingCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;
      
      if (ctx) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      }
    }
  }, [uploadedImage]);

  const handleGeminiAnalysis = useCallback(async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }

    try {
      const prompt = `Analyze this image and identify all text, logos, and objects with their approximate positions. 
      For each detected item, provide:
      1. The text content (if it's text)
      2. The type (text, logo, or object)
      3. A brief description
      4. Approximate position as percentage of image (top-left corner and dimensions)
      
      Format your response as a JSON array like this:
      [
        {
          "text": "MH 5488",
          "type": "text",
          "description": "Flight number",
          "position": { "x": 20, "y": 30, "width": 15, "height": 8 }
        },
        {
          "text": "Malaysia Airlines",
          "type": "logo",
          "description": "Airline logo",
          "position": { "x": 10, "y": 10, "width": 25, "height": 12 }
        }
      ]`;

      const analysis = await analyzeImage(uploadedImage, 'general');
      if (analysis) {
        try {
          // Try to parse JSON from the analysis
          const jsonMatch = analysis.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsedElements = JSON.parse(jsonMatch[0]);
            
            // Convert to our detected elements format
            const detectedElements: DetectedElement[] = parsedElements.map((element: any, index: number) => ({
              id: `gemini-${index}`,
              text: element.text || element.description || `Item ${index + 1}`,
              type: element.type || 'object',
              bbox: {
                x: (element.position?.x || 0) * (workingCanvasRef.current?.width || 800) / 100,
                y: (element.position?.y || 0) * (workingCanvasRef.current?.height || 600) / 100,
                width: (element.position?.width || 10) * (workingCanvasRef.current?.width || 800) / 100,
                height: (element.position?.height || 5) * (workingCanvasRef.current?.height || 600) / 100
              },
              confidence: 0.9
            }));

            setGeminiDetectedElements(detectedElements);
            toast.success(`Gemini AI detected ${detectedElements.length} elements!`);
          } else {
            // Fallback: create elements based on text analysis
            const lines = analysis.split('\n').filter(line => line.trim());
            const detectedElements: DetectedElement[] = lines.slice(0, 10).map((line, index) => ({
              id: `gemini-text-${index}`,
              text: line.trim(),
              type: 'text' as const,
              bbox: {
                x: 50 + (index % 3) * 200,
                y: 100 + Math.floor(index / 3) * 80,
                width: 150,
                height: 30
              },
              confidence: 0.85
            }));

            setGeminiDetectedElements(detectedElements);
            toast.success(`Created ${detectedElements.length} text elements from analysis`);
          }
        } catch (parseError) {
          console.error('Failed to parse Gemini response:', parseError);
          toast.warning('Analysis completed, but could not parse structured data');
        }
      }
    } catch (error) {
      console.error('Error during Gemini analysis:', error);
      toast.error('Failed to analyze with Gemini AI');
    }
  }, [uploadedImage, analyzeImage, workingCanvasRef]);

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const element = geminiDetectedElements.find(el => el.id === elementId);
    if (!element) return;

    setDraggedElement(elementId);
    setDragOffset({
      x: e.clientX - element.bbox.x,
      y: e.clientY - element.bbox.y
    });

    setGeminiDetectedElements(prev => 
      prev.map(el => 
        el.id === elementId ? { ...el, isDragging: true } : el
      )
    );
  }, [geminiDetectedElements]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedElement || !workingCanvasRef.current) return;

    const rect = workingCanvasRef.current.getBoundingClientRect();
    const scaleX = workingCanvasRef.current.width / rect.width;
    const scaleY = workingCanvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left - dragOffset.x) * scaleX;
    const y = (e.clientY - rect.top - dragOffset.y) * scaleY;

    setGeminiDetectedElements(prev => 
      prev.map(el => 
        el.id === draggedElement 
          ? { ...el, bbox: { ...el.bbox, x: Math.max(0, x), y: Math.max(0, y) } }
          : el
      )
    );
  }, [draggedElement, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (draggedElement) {
      setGeminiDetectedElements(prev => 
        prev.map(el => 
          el.id === draggedElement ? { ...el, isDragging: false } : el
        )
      );
      setDraggedElement(null);
      setDragOffset({ x: 0, y: 0 });
      toast.success('Element moved!');
    }
  }, [draggedElement]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!workingCanvasRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale to actual canvas coordinates
    const scaleX = workingCanvasRef.current.width / rect.width;
    const scaleY = workingCanvasRef.current.height / rect.height;
    const actualX = x * scaleX;
    const actualY = y * scaleY;

    // Check if clicking on detected text element
    const clickedElement = editableElements.find(element => 
      actualX >= element.bbox.x && 
      actualX <= element.bbox.x + element.bbox.width &&
      actualY >= element.bbox.y && 
      actualY <= element.bbox.y + element.bbox.height
    );

    if (clickedElement && e.detail === 2) { // Double click to edit
      startTextEdit(clickedElement.id);
    } else if (!clickedElement && currentTool === 'brush') {
      // Add text box when clicking empty area with brush tool
      addTextBox(actualX, actualY);
    }
  }, [editableElements, startTextEdit, currentTool, addTextBox]);

  const handleDownload = useCallback(() => {
    const imageData = exportEditedImage();
    if (!imageData) {
      toast.error('No edited image to download');
      return;
    }

    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = imageData;
    link.click();
    
    toast.success('Edited image downloaded!');
  }, [exportEditedImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-2rem)]">
          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            <UploadZone
              uploadedImage={uploadedImage}
              isProcessing={isProcessing}
              isAnalyzing={isAnalyzing}
              isGeminiLoading={isGeminiLoading}
              onFileUpload={handleFileUpload}
              onRealAnalysis={runRealAnalysis}
              onGeminiAnalysis={handleGeminiAnalysis}
            />

            <ToolsPanel
              uploadedImage={uploadedImage}
              currentTool={currentTool}
              toolSettings={toolSettings}
              onToolChange={setCurrentTool}
              onToolSettingsChange={setToolSettings}
            />

            <DetectedElementsList
              geminiElements={geminiDetectedElements}
              realElements={editableElements}
              selectedElement={selectedElement}
              onElementMouseDown={handleElementMouseDown}
              onTextEdit={startTextEdit}
              onUpdateText={updateTextContent}
              onFinishTextEdit={finishTextEdit}
            />
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            <Toolbar uploadedImage={uploadedImage} onDownload={handleDownload} />

            <ImageCanvas
              uploadedImage={uploadedImage}
              workingCanvasRef={workingCanvasRef}
              imageRef={imageRef}
              geminiElements={geminiDetectedElements}
              onCanvasMouseDown={handleCanvasMouseDown}
              onCanvasMouseMove={handleCanvasMouseMove}
              onCanvasMouseUp={handleCanvasMouseUp}
              onCanvasClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImageEditor;
