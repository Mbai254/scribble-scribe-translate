
import React, { useCallback, useEffect, useState } from 'react';
import { Upload, Download, Scan, Type, Trash2, RotateCcw, Brush, Eraser, Sparkles, Brain, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useRealImageEditor } from '@/hooks/useRealImageEditor';
import { useGeminiAI } from '@/hooks/useGeminiAI';

interface DetectedElement {
  id: string;
  text: string;
  type: 'text' | 'logo' | 'object';
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  isDragging?: boolean;
}

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
    isDrawing,
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
            {/* Upload Zone */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  AI Image Editor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                
                {uploadedImage && (
                  <>
                    <Button
                      onClick={runRealAnalysis}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={isAnalyzing}
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {isAnalyzing ? 'Analyzing Real Pixels...' : 'Analyze Real Image'}
                    </Button>
                    
                    <Button
                      onClick={handleGeminiAnalysis}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isGeminiLoading}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {isGeminiLoading ? 'AI Analyzing...' : 'AI Analyze'}
                    </Button>
                  </>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </CardContent>
            </Card>

            {/* Tools */}
            {uploadedImage && (
              <Card className="backdrop-blur-lg bg-white/10 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Drawing Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setCurrentTool('brush')}
                      variant={currentTool === 'brush' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      <Brush className="w-4 h-4 mr-2" />
                      Brush
                    </Button>
                    <Button
                      onClick={() => setCurrentTool('eraser')}
                      variant={currentTool === 'eraser' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      <Eraser className="w-4 h-4 mr-2" />
                      Eraser
                    </Button>
                    <Button
                      onClick={() => setCurrentTool('blur')}
                      variant={currentTool === 'blur' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      Blur
                    </Button>
                    <Button
                      onClick={() => setCurrentTool('enhance')}
                      variant={currentTool === 'enhance' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enhance
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-white text-sm">Brush Size: {toolSettings.brushSize}</label>
                    <Slider
                      value={[toolSettings.brushSize]}
                      onValueChange={([value]) => setToolSettings(prev => ({ ...prev, brushSize: value }))}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-white text-sm">Color</label>
                    <input
                      type="color"
                      value={toolSettings.brushColor}
                      onChange={(e) => setToolSettings(prev => ({ ...prev, brushColor: e.target.value }))}
                      className="w-full h-8 rounded"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gemini Detected Elements */}
            {geminiDetectedElements.length > 0 && (
              <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
                <CardHeader>
                  <CardTitle className="text-white">
                    Gemini AI Detected ({geminiDetectedElements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {geminiDetectedElements.map((element) => (
                    <div
                      key={element.id}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-move ${
                        element.isDragging
                          ? 'bg-white/30 border-white/50'
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                      onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500/20 text-blue-200">
                            Gemini {element.type}
                          </Badge>
                          <Badge className="bg-green-500/20 text-green-200">
                            {Math.round(element.confidence * 100)}%
                          </Badge>
                        </div>
                        <Move className="w-4 h-4 text-white/60" />
                      </div>
                      <p className="text-white text-sm font-mono bg-black/20 p-2 rounded">
                        "{element.text}"
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Real OCR Detected Elements */}
            {editableElements.length > 0 && (
              <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
                <CardHeader>
                  <CardTitle className="text-white">
                    Real OCR Detected ({editableElements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {editableElements.map((element) => (
                    <div
                      key={element.id}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedElement === element.id
                          ? 'bg-white/20 border-white/40'
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500/20 text-purple-200">
                            OCR Text
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-200">
                            {Math.round(element.confidence * 100)}%
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startTextEdit(element.id)}
                          className="text-white/60 hover:text-white hover:bg-white/10 h-6 w-6 p-0"
                        >
                          <Type className="w-3 h-3" />
                        </Button>
                      </div>
                      {element.isEditing ? (
                        <input
                          value={element.text}
                          onChange={(e) => updateTextContent(element.id, e.target.value)}
                          onBlur={() => finishTextEdit(element.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finishTextEdit(element.id);
                          }}
                          className="w-full bg-white/90 text-black px-2 py-1 rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <p className="text-white text-sm font-mono bg-black/20 p-2 rounded">
                          "{element.text}"
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 mb-4">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">AI-Powered Image Editor</h1>
                  <Button
                    onClick={handleDownload}
                    disabled={!uploadedImage}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Real Edit
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Canvas Area */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
              <CardContent className="p-6 h-full">
                <div className="h-full flex items-center justify-center">
                  {uploadedImage ? (
                    <div 
                      className="relative max-w-full max-h-full"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {/* Working canvas for real editing */}
                      <canvas
                        ref={workingCanvasRef}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg cursor-crosshair"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onClick={handleCanvasClick}
                      />
                      
                      {/* Overlay detected elements */}
                      {geminiDetectedElements.map((element) => (
                        <div
                          key={element.id}
                          className={`absolute border-2 border-blue-400 bg-blue-400/20 pointer-events-none ${
                            element.isDragging ? 'border-yellow-400 bg-yellow-400/30' : ''
                          }`}
                          style={{
                            left: `${element.bbox.x / (workingCanvasRef.current?.width || 1) * 100}%`,
                            top: `${element.bbox.y / (workingCanvasRef.current?.height || 1) * 100}%`,
                            width: `${element.bbox.width / (workingCanvasRef.current?.width || 1) * 100}%`,
                            height: `${element.bbox.height / (workingCanvasRef.current?.height || 1) * 100}%`
                          }}
                        >
                          <div className="text-xs text-white bg-blue-600 px-1 rounded -mt-5">
                            {element.text}
                          </div>
                        </div>
                      ))}
                      
                      {/* Hidden reference image */}
                      <img
                        ref={imageRef}
                        src={uploadedImage}
                        alt="Reference"
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-white/60 border-2 border-dashed border-white/30 rounded-lg p-12 w-full max-w-2xl">
                      <Upload className="w-24 h-24 mx-auto mb-6 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Upload Image for AI-Powered Editing</h3>
                      <p className="mb-4">Upload an image to start real pixel-level editing with AI assistance</p>
                      <p className="text-sm">Real OCR analysis • Gemini AI insights • Actual pixel manipulation • True image editing</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartImageEditor;
