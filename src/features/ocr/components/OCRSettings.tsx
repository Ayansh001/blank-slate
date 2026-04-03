
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOCR } from '../hooks/useOCR';

interface OCRSettingsProps {
  onClose: () => void;
}

export function OCRSettings({ onClose }: OCRSettingsProps) {
  const { supportedLanguages, getLanguageName } = useOCR();
  const [settings, setSettings] = useState({
    defaultLanguage: 'eng',
    autoProcess: false,
    qualityVsSpeed: 50,
    brightness: 0,
    contrast: 0,
    enablePreprocessing: true
  });

  const handleSave = () => {
    // Save settings to localStorage or user preferences
    localStorage.setItem('ocrSettings', JSON.stringify(settings));
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>OCR Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Language Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-language">Default Language</Label>
                <Select
                  value={settings.defaultLanguage}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, defaultLanguage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {getLanguageName(lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-process">Auto-process uploaded images</Label>
                <Switch
                  id="auto-process"
                  checked={settings.autoProcess}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoProcess: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Quality vs Speed</Label>
                <div className="px-3">
                  <Slider
                    value={[settings.qualityVsSpeed]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, qualityVsSpeed: value }))}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>Speed</span>
                    <span>Quality</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Image Preprocessing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-preprocessing">Enable automatic preprocessing</Label>
                <Switch
                  id="enable-preprocessing"
                  checked={settings.enablePreprocessing}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enablePreprocessing: checked }))}
                />
              </div>

              {settings.enablePreprocessing && (
                <>
                  <div className="space-y-2">
                    <Label>Brightness Adjustment</Label>
                    <div className="px-3">
                      <Slider
                        value={[settings.brightness]}
                        onValueChange={([value]) => setSettings(prev => ({ ...prev, brightness: value }))}
                        min={-50}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-muted-foreground mt-1">
                        {settings.brightness > 0 ? '+' : ''}{settings.brightness}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Contrast Adjustment</Label>
                    <div className="px-3">
                      <Slider
                        value={[settings.contrast]}
                        onValueChange={([value]) => setSettings(prev => ({ ...prev, contrast: value }))}
                        min={-50}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-muted-foreground mt-1">
                        {settings.contrast > 0 ? '+' : ''}{settings.contrast}%
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
