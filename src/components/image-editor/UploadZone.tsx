
import React from 'react';
import { Upload, Scan, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UploadZoneProps {
  uploadedImage: string | null;
  isProcessing: boolean;
  isAnalyzing: boolean;
  isGeminiLoading: boolean;
  onFileUpload: (file: File) => void;
  onRealAnalysis: () => void;
  onGeminiAnalysis: () => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  uploadedImage,
  isProcessing,
  isAnalyzing,
  isGeminiLoading,
  onFileUpload,
  onRealAnalysis,
  onGeminiAnalysis
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
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
              onClick={onRealAnalysis}
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isAnalyzing}
            >
              <Scan className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing Real Pixels...' : 'Analyze Real Image'}
            </Button>
            
            <Button
              onClick={onGeminiAnalysis}
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
          onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
        />
      </CardContent>
    </Card>
  );
};

export default UploadZone;
