
import React, { useCallback, useEffect } from 'react';
import { Upload, Download, Scan, Brush, Eraser, Wand2, Blur, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAdvancedImageEditor } from '@/hooks/useAdvancedImageEditor';
import { useAuth } from '@/contexts/AuthContext';

const AdvancedImageEditor = () => {
  const { user, signOut } = useAuth();
  const {
    uploadedImage,
    textRegions,
    detectedObjects,
    selectedRegion,
    editingRegion,
    selectedObject,
    currentTool,
    brushColor,
    isProcessing,
    isAnalyzing,
    isDrawing,
    canvasRef,
    imageRef,
    overlayCanvasRef,
    setSelectedRegion,
    setEditingRegion,
    setSelectedObject,
    setCurrentTool,
    setBrushColor,
    handleFileUpload,
    replaceImage,
    addTextRegion,
    updateTextRegion,
    deleteTextRegion,
    generateEditedImage,
    analyzeImage,
    clearDetections,
    startDrawing,
    draw,
    stopDrawing,
    applyFilter
  } = useAdvancedImageEditor();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (editingRegion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool.type === 'brush' || currentTool.type === 'eraser') {
      startDrawing(x, y);
    } else if (e.detail === 2) { // Double click for text
      addTextRegion(x, y);
    }
  }, [editingRegion, currentTool, startDrawing, addTextRegion]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    draw(x, y);
  }, [isDrawing, draw]);

  const handleAnalyzeImage = useCallback(async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    await analyzeImage(uploadedImage);
  }, [uploadedImage, analyzeImage]);

  const handleDownload = useCallback(async () => {
    try {
      const editedImageData = await generateEditedImage();
      if (!editedImageData) {
        toast.error('Failed to generate edited image');
        return;
      }

      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = editedImageData;
      link.click();
      
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  }, [generateEditedImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">AI Image Editor</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/80">Welcome, {user?.email}</span>
            <Button
              onClick={signOut}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Upload Zone */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Image Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isProcessing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadedImage ? 'Upload New Image' : 'Upload Image'}
                </Button>
                
                {uploadedImage && (
                  <>
                    <Button
                      onClick={() => replaceInputRef.current?.click()}
                      variant="outline"
                      className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                      disabled={isProcessing}
                    >
                      Replace Image
                    </Button>
                    
                    <Button
                      onClick={handleAnalyzeImage}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={isAnalyzing}
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
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
                
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && replaceImage(e.target.files[0])}
                />
              </CardContent>
            </Card>

            {/* Tools */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Editing Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={currentTool.type === 'brush' ? 'default' : 'outline'}
                    onClick={() => setCurrentTool({ ...currentTool, type: 'brush' })}
                    className="w-full"
                  >
                    <Brush className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={currentTool.type === 'eraser' ? 'default' : 'outline'}
                    onClick={() => setCurrentTool({ ...currentTool, type: 'eraser' })}
                    className="w-full"
                  >
                    <Eraser className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-white text-sm">Brush Size</label>
                  <Slider
                    value={[currentTool.size]}
                    onValueChange={([value]) => setCurrentTool({ ...currentTool, size: value })}
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-white text-sm">Color</label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-full h-10 rounded border-0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Detected Objects */}
            {detectedObjects.length > 0 && (
              <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Detected Objects ({detectedObjects.length})</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearDetections}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      Clear
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {detectedObjects.map((object) => (
                    <div
                      key={object.id}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedObject === object.id
                          ? 'bg-white/20 border-white/40'
                          : 'bg-white/5 border-white/20 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedObject(object.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="secondary"
                          className={`${
                            object.type === 'text' ? 'bg-blue-500/20 text-blue-200' :
                            object.type === 'person' ? 'bg-green-500/20 text-green-200' :
                            'bg-yellow-500/20 text-yellow-200'
                          }`}
                        >
                          {object.type}
                        </Badge>
                        <span className="text-white/60 text-xs">
                          {Math.round(object.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-white text-sm">
                        {object.content || object.description}
                      </p>
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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => applyFilter('blur', 0.5)}
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Blur className="w-4 h-4 mr-2" />
                      Blur
                    </Button>
                    <Button
                      onClick={() => applyFilter('brightness', 0.3)}
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Enhance
                    </Button>
                  </div>
                  <Button
                    onClick={handleDownload}
                    disabled={!uploadedImage}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Canvas Area */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
              <CardContent className="p-6 h-full">
                <div className="h-full flex items-center justify-center">
                  {uploadedImage ? (
                    <div className="relative max-w-full max-h-full">
                      <canvas ref={canvasRef} className="hidden" />
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                      
                      <div 
                        className="relative cursor-crosshair"
                        onClick={handleImageClick}
                        onMouseMove={handleMouseMove}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      >
                        <img
                          ref={imageRef}
                          src={uploadedImage}
                          alt="Uploaded content"
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                          onLoad={() => {
                            if (overlayCanvasRef.current && imageRef.current) {
                              overlayCanvasRef.current.width = imageRef.current.clientWidth;
                              overlayCanvasRef.current.height = imageRef.current.clientHeight;
                            }
                          }}
                        />
                        
                        {/* Object detection overlays */}
                        {detectedObjects.map((object) => (
                          <div
                            key={object.id}
                            className={`absolute border-2 transition-all duration-200 ${
                              selectedObject === object.id 
                                ? 'border-yellow-400 shadow-lg' 
                                : 'border-red-400/60 hover:border-red-400'
                            }`}
                            style={{
                              left: `${object.bbox.x}px`,
                              top: `${object.bbox.y}px`,
                              width: `${object.bbox.width}px`,
                              height: `${object.bbox.height}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedObject(object.id);
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded">
                              {object.type}
                            </div>
                          </div>
                        ))}
                        
                        {/* Text region overlays */}
                        {textRegions.map((region) => (
                          <div
                            key={region.id}
                            className={`absolute border-2 transition-all duration-200 ${
                              selectedRegion === region.id 
                                ? 'border-white shadow-lg' 
                                : 'border-white/60 hover:border-white'
                            }`}
                            style={{
                              left: `${region.x}px`,
                              top: `${region.y}px`,
                              width: `${region.width}px`,
                              height: `${region.height}px`,
                              backgroundColor: region.backgroundColor,
                              fontSize: `${region.fontSize}px`,
                              fontFamily: region.fontFamily,
                              color: region.color,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRegion(region.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingRegion(region.id);
                            }}
                          >
                            {editingRegion === region.id ? (
                              <textarea
                                value={region.text}
                                onChange={(e) => updateTextRegion(region.id, { text: e.target.value })}
                                onBlur={() => setEditingRegion(null)}
                                className="w-full h-full bg-transparent text-current resize-none border-none outline-none p-1"
                                autoFocus
                              />
                            ) : (
                              <div className="w-full h-full p-1 overflow-hidden">
                                <span className="block leading-tight">{region.text}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/60">
                      <Upload className="w-24 h-24 mx-auto mb-6 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">No Image Uploaded</h3>
                      <p>Upload an image to start AI-powered editing</p>
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

export default AdvancedImageEditor;
