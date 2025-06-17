
import React, { useCallback, useEffect } from 'react';
import { Upload, Download, Scan, Wand2, Move, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEnhancedImageEditor } from '@/hooks/useEnhancedImageEditor';

const SmartImageEditor = () => {
  const {
    uploadedImage,
    editableElements,
    selectedElement,
    isDragging,
    isProcessing,
    mainCanvasRef,
    imageRef,
    handleFileUpload,
    runSmartDetection,
    startElementEdit,
    updateElementContent,
    finishElementEdit,
    startElementDrag,
    dragElement,
    finishElementDrag,
    exportFinalImage
  } = useEnhancedImageEditor();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync canvas with image
  useEffect(() => {
    if (uploadedImage && imageRef.current && mainCanvasRef.current) {
      const canvas = mainCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;
      
      if (ctx) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      }
    }
  }, [uploadedImage]);

  const handleImageAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on an editable element
    const clickedElement = editableElements.find(element => 
      x >= element.bbox.x && 
      x <= element.bbox.x + element.bbox.width &&
      y >= element.bbox.y && 
      y <= element.bbox.y + element.bbox.height
    );

    if (clickedElement) {
      if (e.detail === 2) { // Double click to edit
        startElementEdit(clickedElement.id);
      } else { // Single click to select
        startElementDrag(clickedElement.id, x, y);
      }
    }
  }, [editableElements, isDragging, startElementEdit, startElementDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      dragElement(x, y);
    }
  }, [isDragging, dragElement]);

  const handleDownload = useCallback(async () => {
    try {
      const finalImageData = exportFinalImage();
      if (!finalImageData) {
        toast.error('No image to download');
        return;
      }

      const link = document.createElement('a');
      link.download = 'smart-edited-image.png';
      link.href = finalImageData;
      link.click();
      
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  }, [exportFinalImage]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    } else {
      toast.error('Please drop an image file');
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

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
                  Smart Image Editor
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
                  <Button
                    onClick={runSmartDetection}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={isProcessing}
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    {isProcessing ? 'Analyzing...' : 'Detect Text & Objects'}
                  </Button>
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

            {/* Instructions */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-sm">How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Drag & drop or upload an image</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4" />
                  <span>Click "Detect" to find text & objects</span>
                </div>
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <span>Double-click text to edit in-place</span>
                </div>
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  <span>Drag elements to move them</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Download your edited image</span>
                </div>
              </CardContent>
            </Card>

            {/* Detected Elements */}
            {editableElements.length > 0 && (
              <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
                <CardHeader>
                  <CardTitle className="text-white">
                    Detected Elements ({editableElements.length})
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
                      onClick={() => startElementEdit(element.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant="secondary"
                          className="bg-blue-500/20 text-blue-200"
                        >
                          {element.type}
                        </Badge>
                        {element.isEditing && (
                          <Badge className="bg-green-500/20 text-green-200">
                            editing
                          </Badge>
                        )}
                      </div>
                      <p className="text-white text-sm truncate">
                        {element.content}
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
                  <h1 className="text-2xl font-bold text-white">Smart Editor</h1>
                  <Button
                    onClick={handleDownload}
                    disabled={!uploadedImage}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Edited Image
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
                      className="relative max-w-full max-h-full cursor-crosshair"
                      onClick={handleImageAreaClick}
                      onMouseMove={handleMouseMove}
                      onMouseUp={finishElementDrag}
                      onMouseLeave={finishElementDrag}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      {/* Hidden canvas for manipulation */}
                      <canvas
                        ref={mainCanvasRef}
                        className="hidden"
                      />
                      
                      {/* Display image */}
                      <img
                        ref={imageRef}
                        src={uploadedImage}
                        alt="Smart editable content"
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      />
                      
                      {/* Interactive overlays for detected elements */}
                      {editableElements.map((element) => (
                        <div
                          key={element.id}
                          className={`absolute border-2 transition-all duration-200 ${
                            selectedElement === element.id 
                              ? 'border-yellow-400 shadow-lg' 
                              : element.isEditing
                              ? 'border-green-400'
                              : 'border-blue-400/60 hover:border-blue-400'
                          }`}
                          style={{
                            left: `${element.bbox.x}px`,
                            top: `${element.bbox.y}px`,
                            width: `${element.bbox.width}px`,
                            height: `${element.bbox.height}px`,
                            cursor: element.isEditing ? 'text' : isDragging ? 'grabbing' : 'grab'
                          }}
                        >
                          {element.isEditing && element.type === 'text' ? (
                            <textarea
                              value={element.content}
                              onChange={(e) => updateElementContent(element.id, e.target.value)}
                              onBlur={() => finishElementEdit(element.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  finishElementEdit(element.id);
                                }
                                if (e.key === 'Escape') {
                                  finishElementEdit(element.id);
                                }
                              }}
                              className="w-full h-full bg-white/90 text-black resize-none border-none outline-none p-1 text-sm"
                              autoFocus
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-500/10">
                              <span className="text-xs text-white/80 px-1">
                                {element.type === 'text' ? 'Text' : 'Object'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      className="text-center text-white/60 border-2 border-dashed border-white/30 rounded-lg p-12 w-full max-w-2xl"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <Upload className="w-24 h-24 mx-auto mb-6 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Drop Image Here</h3>
                      <p className="mb-4">Or click upload to select an image</p>
                      <p className="text-sm">Supports JPG, PNG, GIF, WebP</p>
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
