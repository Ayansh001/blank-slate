import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollableTabsList, ScrollableTabsTrigger, TabsContent } from '@/components/ui/scrollable-tabs';
import { Tabs } from '@/components/ui/tabs';
import { AIConfigurationPanel } from '@/components/ai/AIConfigurationPanel';
import { UnifiedAIServiceSelector } from '@/features/ai/components/UnifiedAIServiceSelector';
import { QuotePreferencesPanel } from '@/components/settings/QuotePreferencesPanel';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from '@/providers/ThemeProvider';
import { useCompactMode } from '@/hooks/useCompactMode';
import { useAnimationSettings } from '@/hooks/useAnimationSettings';
import { StorageUsageIndicator } from '@/components/storage/StorageUsageIndicator';
import { useDataExport } from '@/hooks/useDataExport';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PasswordUpdateForm } from '@/features/auth/components/PasswordUpdateForm';
import { MFASettings } from '@/features/auth/components/MFASettings';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Download,
  Trash2,
  Moon,
  Sun,
  Monitor,
  AlertTriangle,
  Loader2,
  Quote
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import React from 'react';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { compactMode, setCompactMode } = useCompactMode();
  const { animationsEnabled, setAnimationsEnabled } = useAnimationSettings();
  const { exportAllData, backupSettings, isExporting } = useDataExport();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // This would typically call a Supabase function to handle account deletion
    // For now, we'll show a warning
    toast.error('Account deletion not implemented', {
      description: 'Please contact support to delete your account.'
    });
  };

  // Debug logging for Settings page
  React.useEffect(() => {
    console.log('[Settings] Component mounted');
    console.log('[Settings] User authenticated:', !!user);
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-800 rounded-xl flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your account and application preferences</p>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <ScrollableTabsList>
          <ScrollableTabsTrigger value="appearance">Appearance</ScrollableTabsTrigger>
          <ScrollableTabsTrigger value="notifications">Notifications</ScrollableTabsTrigger>
          <ScrollableTabsTrigger value="motivation">Motivation</ScrollableTabsTrigger>
          <ScrollableTabsTrigger value="ai">AI Services</ScrollableTabsTrigger>
          <ScrollableTabsTrigger value="storage">Storage & Data</ScrollableTabsTrigger>
          <ScrollableTabsTrigger value="advanced">Advanced</ScrollableTabsTrigger>
        </ScrollableTabsList>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="motivation" className="space-y-6">
          <QuotePreferencesPanel />
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <UnifiedAIServiceSelector />
          <AIConfigurationPanel />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize how StudyVault looks and feels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                      className="justify-start"
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                      className="justify-start"
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('system')}
                      className="justify-start"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      System
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Use less space for interface elements</p>
                    </div>
                    <Switch 
                      checked={compactMode === 'compact'}
                      onCheckedChange={(checked) => setCompactMode(checked ? 'compact' : 'normal')}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Animations</Label>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
                    </div>
                    <Switch 
                      checked={animationsEnabled === 'enabled'}
                      onCheckedChange={(checked) => setAnimationsEnabled(checked ? 'enabled' : 'disabled')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Basic Notifications
                </CardTitle>
                <CardDescription>Basic notification settings (see Notifications tab for full control)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Study Reminders</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Get reminded about your study goals</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI Suggestions</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Receive AI-powered study suggestions</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Get weekly progress summaries</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>File Processing</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Notifications when files are processed</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security - Now Functional */}
            <div className="space-y-6">
              <PasswordUpdateForm />
              <MFASettings />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Storage Usage - Enhanced Integration */}
            <div className="lg:col-span-2">
              <StorageUsageIndicator />
            </div>

            {/* Data Management Actions - Enhanced with better error handling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>Export, backup, and manage your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={exportAllData}
                  disabled={isExporting || !user}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export All Data
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={backupSettings}
                  disabled={isExporting || !user}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Backup Settings
                </Button>
                
                {!showDeleteConfirm ? (
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={!user}
                  >
                    <Trash2 className="w-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This action cannot be undone. All your data will be permanently deleted.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleDeleteAccount}
                        className="flex-1"
                      >
                        Confirm Delete
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                  Your data is stored securely on Supabase. Export includes all files metadata, notes, and study progress.
                </div>
              </CardContent>
            </Card>

            {/* Storage Tips - Enhanced */}
            <Card>
              <CardHeader>
                <CardTitle>Storage Optimization Tips</CardTitle>
                <CardDescription>Maximize your storage efficiency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p>• Large PDF files typically use the most storage space</p>
                  <p>• Image compression automatically reduces file sizes</p>
                  <p>• Delete old quiz sessions and chat history periodically</p>
                  <p>• Use text notes instead of image files when possible</p>
                  <p>• Export and archive completed study materials</p>
                  <p>• OCR text extraction can reduce dependency on original files</p>
                </div>
                
                {user && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Current plan: Supabase Free Tier (1GB storage limit)
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Additional configuration options</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">More settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
