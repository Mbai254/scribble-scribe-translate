
import React from 'react';
import { Brush, Eraser, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface ToolsPanelProps {
  uploadedImage: string | null;
  currentTool: 'brush' | 'eraser' | 'blur' | 'enhance';
  toolSettings: {
    brushSize: number;
    brushColor: string;
  };
  onToolChange: (tool: 'brush' | 'eraser' | 'blur' | 'enhance') => void;
  onToolSettingsChange: (settings: any) => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  uploadedImage,
  currentTool,
  toolSettings,
  onToolChange,
  onToolSettingsChange
}) => {
  if (!uploadedImage) return null;

  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Drawing Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onToolChange('brush')}
            variant={currentTool === 'brush' ? 'default' : 'outline'}
            className="w-full"
          >
            <Brush className="w-4 h-4 mr-2" />
            Brush
          </Button>
          <Button
            onClick={() => onToolChange('eraser')}
            variant={currentTool === 'eraser' ? 'default' : 'outline'}
            className="w-full"
          >
            <Eraser className="w-4 h-4 mr-2" />
            Eraser
          </Button>
          <Button
            onClick={() => onToolChange('blur')}
            variant={currentTool === 'blur' ? 'default' : 'outline'}
            className="w-full"
          >
            Blur
          </Button>
          <Button
            onClick={() => onToolChange('enhance')}
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
            onValueChange={([value]) => onToolSettingsChange(prev => ({ ...prev, brushSize: value }))}
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
            onChange={(e) => onToolSettingsChange(prev => ({ ...prev, brushColor: e.target.value }))}
            className="w-full h-8 rounded"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ToolsPanel;
