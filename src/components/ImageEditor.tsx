
import React, { useCallback, useEffect } from 'react';
import { Upload, Download, Plus, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useImageEditor } from '@/hooks/useImageEditor';

const ImageEditor = () => {
  const {
    uploadedImage,
    textRegions,
    selectedRegion,
    editingRegion,
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
  } = useImageEditor();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (editingRegion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.detail === 2) { // Double click
      addTextRegion(x, y);
    }
  }, [editingRegion, addTextRegion]);

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

  const clearAllRegions = useCallback(() => {
    textRegions.forEach(region => deleteTextRegion(region.id));
    toast.success('All text regions cleared');
  }, [textRegions, deleteTextRegion]);

  useEffect(() => {
    if (uploadedImage && imageRef.current) {
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
      };
      img.src = uploadedImage;
    }
  }, [uploadedImage]);

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
                  <Button
                    onClick={() => replaceInputRef.current?.click()}
                    variant="outline"
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                    disabled={isProcessing}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Replace Current Image
                  </Button>
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

            {/* Text Regions */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Text Regions ({textRegions.length})</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAllRegions}
                      disabled={textRegions.length === 0}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {textRegions.map((region) => (
                  <div
                    key={region.id}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      selectedRegion === region.id
                        ? 'bg-white/20 border-white/40'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedRegion(region.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        region.status === 'original' ? 'bg-yellow-500/20 text-yellow-200' :
                        region.status === 'translated' ? 'bg-green-500/20 text-green-200' :
                        'bg-blue-500/20 text-blue-200'
                      }`}>
                        {region.status}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTextRegion(region.id);
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-white text-sm font-medium truncate">
                      {region.text}
                    </p>
                  </div>
                ))}
                {textRegions.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No text regions</p>
                    <p className="text-sm">Double-click on image to add text</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 mb-4">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">Direct Image Editor</h1>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDownload}
                      disabled={!uploadedImage}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canvas Area */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
              <CardContent className="p-6 h-full">
                <div className="h-full flex items-center justify-center">
                  {uploadedImage ? (
                    <div className="relative max-w-full max-h-full">
                      <canvas
                        ref={canvasRef}
                        className="hidden"
                      />
                      <div 
                        className="relative cursor-crosshair"
                        onClick={handleImageClick}
                      >
                        <img
                          ref={imageRef}
                          src={uploadedImage}
                          alt="Uploaded content"
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                          onLoad={() => console.log('Image loaded')}
                        />
                        
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
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    setEditingRegion(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingRegion(null);
                                  }
                                }}
                                className="w-full h-full bg-transparent text-current resize-none border-none outline-none p-1"
                                style={{
                                  fontSize: `${region.fontSize}px`,
                                  fontFamily: region.fontFamily,
                                  color: region.color,
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="w-full h-full p-1 overflow-hidden">
                                <span className="block leading-tight">
                                  {region.text}
                                </span>
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
                      <p>Upload an image to start editing text directly</p>
                      <p className="text-sm mt-2">Double-click on image to add text regions</p>
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

export default ImageEditor;
