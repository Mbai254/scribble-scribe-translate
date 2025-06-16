
import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RotateCcw, Languages, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface TextRegion {
  id: string;
  text: string;
  originalText: string;
  translatedText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'original' | 'translated' | 'edited';
  confidence: number;
  backgroundColor: string;
}

const LANGUAGES = {
  'auto': 'Auto-detect',
  'en': 'English',
  'es': 'Spanish', 
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'ru': 'Russian'
};

const MOCK_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Hello World': {
    'es': 'Hola Mundo',
    'fr': 'Bonjour le monde',
    'de': 'Hallo Welt',
    'it': 'Ciao mondo',
    'ja': 'こんにちは世界',
    'ko': '안녕하세요 세계',
    'zh': '你好世界',
    'ar': 'مرحبا بالعالم',
    'ru': 'Привет мир'
  },
  'Welcome to our app': {
    'es': 'Bienvenido a nuestra aplicación',
    'fr': 'Bienvenue dans notre application',
    'de': 'Willkommen in unserer App',
    'it': 'Benvenuto nella nostra app',
    'ja': '私たちのアプリへようこそ',
    'ko': '우리 앱에 오신 것을 환영합니다',
    'zh': '欢迎使用我们的应用',
    'ar': 'مرحبا بكم في تطبيقنا',
    'ru': 'Добро пожаловать в наше приложение'
  },
  'Click here': {
    'es': 'Haz clic aquí',
    'fr': 'Cliquez ici',
    'de': 'Hier klicken',
    'it': 'Clicca qui',
    'ja': 'ここをクリック',
    'ko': '여기를 클릭하세요',
    'zh': '点击这里',
    'ar': 'انقر هنا',
    'ru': 'Нажмите здесь'
  }
};

const Index = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [textRegions, setTextRegions] = useState<TextRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [isDetecting, setIsDetecting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = (file: File) => {
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, JPEG, GIF, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setTextRegions([]);
      setSelectedRegion(null);
      toast.success('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const detectText = () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }

    setIsDetecting(true);
    
    // Simulate OCR detection with mock data
    setTimeout(() => {
      const mockRegions: TextRegion[] = [
        {
          id: '1',
          text: 'Hello World',
          originalText: 'Hello World',
          translatedText: '',
          x: 50,
          y: 50,
          width: 120,
          height: 25,
          status: 'original',
          confidence: 0.95,
          backgroundColor: 'rgba(255, 255, 0, 0.3)'
        },
        {
          id: '2',
          text: 'Welcome to our app',
          originalText: 'Welcome to our app',
          translatedText: '',
          x: 200,
          y: 120,
          width: 180,
          height: 30,
          status: 'original',
          confidence: 0.89,
          backgroundColor: 'rgba(255, 255, 0, 0.3)'
        },
        {
          id: '3',
          text: 'Click here',
          originalText: 'Click here',
          translatedText: '',
          x: 100,
          y: 200,
          width: 90,
          height: 22,
          status: 'original',
          confidence: 0.92,
          backgroundColor: 'rgba(255, 255, 0, 0.3)'
        }
      ];
      
      setTextRegions(mockRegions);
      setIsDetecting(false);
      toast.success(`Detected ${mockRegions.length} text regions`);
    }, 2000);
  };

  const translateRegion = (regionId: string) => {
    setTextRegions(prev => prev.map(region => {
      if (region.id === regionId) {
        const translation = MOCK_TRANSLATIONS[region.originalText]?.[targetLang] || `[${region.originalText}]`;
        return {
          ...region,
          text: translation,
          translatedText: translation,
          status: 'translated' as const,
          backgroundColor: 'rgba(46, 204, 113, 0.3)'
        };
      }
      return region;
    }));
    toast.success('Text translated successfully!');
  };

  const translateAll = () => {
    setTextRegions(prev => prev.map(region => {
      const translation = MOCK_TRANSLATIONS[region.originalText]?.[targetLang] || `[${region.originalText}]`;
      return {
        ...region,
        text: translation,
        translatedText: translation,
        status: 'translated' as const,
        backgroundColor: 'rgba(46, 204, 113, 0.3)'
      };
    }));
    toast.success('All text translated successfully!');
  };

  const editRegion = (regionId: string, newText: string) => {
    setTextRegions(prev => prev.map(region => {
      if (region.id === regionId) {
        return {
          ...region,
          text: newText,
          status: 'edited' as const,
          backgroundColor: 'rgba(52, 152, 219, 0.3)'
        };
      }
      return region;
    }));
  };

  const deleteRegion = (regionId: string) => {
    setTextRegions(prev => prev.filter(region => region.id !== regionId));
    setSelectedRegion(null);
    toast.success('Text region deleted');
  };

  const resetToOriginal = () => {
    setTextRegions(prev => prev.map(region => ({
      ...region,
      text: region.originalText,
      status: 'original' as const,
      backgroundColor: 'rgba(255, 255, 0, 0.3)'
    })));
    toast.success('Reset to original text');
  };

  const clearAllRegions = () => {
    setTextRegions([]);
    setSelectedRegion(null);
    toast.success('All text regions cleared');
  };

  const downloadImage = () => {
    if (!canvasRef.current || !imageRef.current) {
      toast.error('No image to download');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw text regions
    textRegions.forEach(region => {
      ctx.fillStyle = region.backgroundColor;
      ctx.fillRect(region.x, region.y, region.width, region.height);
      
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText(region.text, region.x + 5, region.y + 18);
    });

    // Download
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL();
    link.click();
    
    toast.success('Image downloaded successfully!');
  };

  useEffect(() => {
    if (uploadedImage && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        imageRef.current = img;
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
                  Upload Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                    dragActive 
                      ? 'border-white bg-white/20' 
                      : 'border-white/40 hover:border-white/60 hover:bg-white/10'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/80 mb-2">
                    Drag & drop your image here
                  </p>
                  <p className="text-white/60 text-sm">
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Language Controls */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Translation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm mb-2 block">From</label>
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-white/80 text-sm mb-2 block">To</label>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).slice(1).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={detectText} 
                    disabled={!uploadedImage || isDetecting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isDetecting ? 'Detecting...' : 'Detect Text'}
                  </Button>
                  <Button 
                    onClick={translateAll}
                    disabled={textRegions.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Translate All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Text Regions List */}
            <Card className="backdrop-blur-lg bg-white/10 border-white/20 flex-1">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Text Regions ({textRegions.length})
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetToOriginal}
                      disabled={textRegions.length === 0}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
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
                      <span className="text-white/60 text-xs">
                        {Math.round(region.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-white text-sm font-medium mb-2 truncate">
                      {region.text}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          translateRegion(region.id);
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10 flex-1"
                      >
                        <Languages className="w-3 h-3 mr-1" />
                        Translate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRegion(region.id);
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10 flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRegion(region.id);
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {textRegions.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No text regions detected</p>
                    <p className="text-sm">Upload an image and click "Detect Text"</p>
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">Image Text Editor</h1>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadImage}
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
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        style={{ display: 'none' }}
                      />
                      <div className="relative">
                        <img
                          src={uploadedImage}
                          alt="Uploaded content"
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                          onLoad={() => console.log('Image loaded')}
                        />
                        {/* Text region overlays */}
                        {textRegions.map((region) => (
                          <div
                            key={region.id}
                            className={`absolute border-2 transition-all duration-200 cursor-pointer ${
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
                            }}
                            onClick={() => setSelectedRegion(region.id)}
                            onDoubleClick={() => setEditingRegion(region.id)}
                          >
                            {editingRegion === region.id ? (
                              <input
                                type="text"
                                value={region.text}
                                onChange={(e) => editRegion(region.id, e.target.value)}
                                onBlur={() => setEditingRegion(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setEditingRegion(null);
                                  }
                                }}
                                className="w-full h-full bg-transparent text-black text-sm px-1 border-none outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="text-black text-sm px-1 leading-tight block">
                                {region.text}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/60">
                      <Upload className="w-24 h-24 mx-auto mb-6 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">No Image Uploaded</h3>
                      <p>Upload an image to start editing and translating text</p>
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

export default Index;
