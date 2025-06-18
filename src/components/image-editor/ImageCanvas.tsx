
import React from 'react';
import { Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DetectedElement } from '@/types/imageEditor';

interface ImageCanvasProps {
  uploadedImage: string | null;
  workingCanvasRef: React.RefObject<HTMLCanvasElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  geminiElements: DetectedElement[];
  onCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  uploadedImage,
  workingCanvasRef,
  imageRef,
  geminiElements,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasClick,
  onMouseMove,
  onMouseUp
}) => {
  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
      <CardContent className="p-6 h-full">
        <div className="h-full flex items-center justify-center">
          {uploadedImage ? (
            <div 
              className="relative max-w-full max-h-full"
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {/* Working canvas for real editing */}
              <canvas
                ref={workingCanvasRef}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg cursor-crosshair"
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onCanvasMouseMove}
                onMouseUp={onCanvasMouseUp}
                onClick={onCanvasClick}
              />
              
              {/* Overlay detected elements */}
              {geminiElements.map((element) => (
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
  );
};

export default ImageCanvas;
