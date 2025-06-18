
import React from 'react';
import { Type, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DetectedElement } from '@/types/imageEditor';

interface DetectedElementsListProps {
  geminiElements: DetectedElement[];
  realElements: any[];
  selectedElement: string | null;
  onElementMouseDown: (e: React.MouseEvent, elementId: string) => void;
  onTextEdit: (elementId: string) => void;
  onUpdateText: (elementId: string, text: string) => void;
  onFinishTextEdit: (elementId: string) => void;
}

const DetectedElementsList: React.FC<DetectedElementsListProps> = ({
  geminiElements,
  realElements,
  selectedElement,
  onElementMouseDown,
  onTextEdit,
  onUpdateText,
  onFinishTextEdit
}) => {
  return (
    <>
      {/* Gemini Detected Elements */}
      {geminiElements.length > 0 && (
        <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
          <CardHeader>
            <CardTitle className="text-white">
              Gemini AI Detected ({geminiElements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {geminiElements.map((element) => (
              <div
                key={element.id}
                className={`p-3 rounded-lg border transition-all duration-200 cursor-move ${
                  element.isDragging
                    ? 'bg-white/30 border-white/50'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
                onMouseDown={(e) => onElementMouseDown(e, element.id)}
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
      {realElements.length > 0 && (
        <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
          <CardHeader>
            <CardTitle className="text-white">
              Real OCR Detected ({realElements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {realElements.map((element) => (
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
                    onClick={() => onTextEdit(element.id)}
                    className="text-white/60 hover:text-white hover:bg-white/10 h-6 w-6 p-0"
                  >
                    <Type className="w-3 h-3" />
                  </Button>
                </div>
                {element.isEditing ? (
                  <input
                    value={element.text}
                    onChange={(e) => onUpdateText(element.id, e.target.value)}
                    onBlur={() => onFinishTextEdit(element.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onFinishTextEdit(element.id);
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
    </>
  );
};

export default DetectedElementsList;
