import { Menu, Search, Bell, Settings, User, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { setRateLimitNotificationCallback } from '@/features/ai/services/AIErrorHandler';
import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SwipeToDeleteItem } from '@/components/notifications/SwipeToDeleteItem';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, addRateLimitNotification } = useNotifications();

  useEffect(() => {
    // Set up rate limit notification callback
    setRateLimitNotificationCallback(addRateLimitNotification);
  }, [addRateLimitNotification]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SV</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              StudyVault
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI-Powered Study Platform
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <SwipeToDeleteItem
                    key={notification.id}
                    onDelete={() => deleteNotification(notification.id)}
                  >
                    <div
                      className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                        notification.is_read
                          ? 'bg-muted/30'
                          : 'bg-primary/5 border-primary/20'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-muted-foreground mt-1">
                        {notification.message}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </div>
                  </SwipeToDeleteItem>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user?.user_metadata?.full_name && (
                  <p className="font-medium">{user.user_metadata.full_name}</p>
                )}
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
