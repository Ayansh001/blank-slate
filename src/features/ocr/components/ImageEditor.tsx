
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCw, Crop, Sliders, FileText } from 'lucide-react';
import { PreprocessingOptions } from '../types';

interface ImageEditorProps {
  imageUrl: string;
  fileName: string;
  onClose: () => void;
  onProcessOCR: (options: PreprocessingOptions) => void;
}

export function ImageEditor({ imageUrl, fileName, onClose, onProcessOCR }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [language, setLanguage] = useState('eng');
  const [isLoading, setIsLoading] = useState(true);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'kor', name: 'Korean' }
  ];

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setIsLoading(false);
      drawImage(img);
    };
    img.onerror = () => {
      setIsLoading(false);
      console.error('Failed to load image');
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (originalImage) {
      drawImage(originalImage);
    }
  }, [brightness, contrast, rotation, originalImage]);

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.save();

    // Apply rotation
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Draw the image
    ctx.drawImage(img, 0, 0);

    // Apply brightness and contrast
    if (brightness !== 0 || contrast !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const brightnessValue = brightness * 255 / 100;
      const contrastValue = contrast / 100 + 1;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * contrastValue + brightnessValue));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * contrastValue + brightnessValue));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * contrastValue + brightnessValue));
      }

      ctx.putImageData(imageData, 0, 0);
    }

    ctx.restore();
  };

  const handleProcessOCR = () => {
    const options: PreprocessingOptions = {};
    
    if (brightness !== 0) options.brightness = brightness;
    if (contrast !== 0) options.contrast = contrast;
    if (rotation !== 0) options.rotation = rotation;

    onProcessOCR(options);
    onClose();
  };

  const resetSettings = () => {
    setBrightness(0);
    setContrast(0);
    setRotation(0);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Image Editor - {fileName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-sm text-gray-500">Loading image...</div>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-64 object-contain border"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label>OCR Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <Label>Brightness: {brightness}%</Label>
              <Slider
                value={[brightness]}
                onValueChange={(value) => setBrightness(value[0])}
                min={-100}
                max={100}
                step={5}
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <Label>Contrast: {contrast}%</Label>
              <Slider
                value={[contrast]}
                onValueChange={(value) => setContrast(value[0])}
                min={-100}
                max={100}
                step={5}
              />
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <Label>Rotation: {rotation}°</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0])}
                  min={-180}
                  max={180}
                  step={90}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={resetSettings}
                className="flex-1"
              >
                <Sliders className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleProcessOCR}
                className="flex-1"
                disabled={isLoading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Extract Text
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
