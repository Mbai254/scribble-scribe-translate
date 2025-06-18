
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ToolbarProps {
  uploadedImage: string | null;
  onDownload: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ uploadedImage, onDownload }) => {
  return (
    <Card className="backdrop-blur-lg bg-white/10 border-white/20 mb-4">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">AI-Powered Image Editor</h1>
          <Button
            onClick={onDownload}
            disabled={!uploadedImage}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Real Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Toolbar;
