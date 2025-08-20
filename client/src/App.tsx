import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileView } from '@/components/ProfileView';
import { AdminDashboard } from '@/components/AdminDashboard';
import { trpc } from '@/utils/trpc';
import type { PublicProfile } from '../../server/src/schema';

function App() {
  const [currentView, setCurrentView] = useState<'search' | 'profile' | 'admin'>('search');
  const [searchUsername, setSearchUsername] = useState('');
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample profiles for demo
  const sampleProfiles = ['creator1', 'johndoe', 'artist', 'developer'];

  const handleSearch = useCallback(async (username: string) => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await trpc.getPublicProfile.query({ username: username.trim() });
      if (result) {
        setProfile(result);
        setCurrentView('profile');
      } else {
        setError('Creator not found. Try searching for another username.');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBackToSearch = useCallback(() => {
    setCurrentView('search');
    setProfile(null);
    setError(null);
    setSearchUsername('');
  }, []);

  if (currentView === 'profile' && profile) {
    return <ProfileView profile={profile} onBack={handleBackToSearch} />;
  }

  if (currentView === 'admin') {
    return <AdminDashboard onBack={handleBackToSearch} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="gradient"></div>
      <div className="grid"></div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              ✨ LinkTree
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Discover amazing creators and their curated links
            </p>
          </div>

          {/* Search Section */}
          <Card className="p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
            <div className="space-y-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Enter username to find a creator..."
                  value={searchUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchUsername(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchUsername);
                    }
                  }}
                  className="flex-1 h-12 text-lg bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  disabled={isLoading}
                />
                <Button 
                  onClick={() => handleSearch(searchUsername)}
                  disabled={isLoading || !searchUsername.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    'Find Creator'
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Sample Profiles */}
              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Try these sample profiles:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {sampleProfiles.map((username: string) => (
                    <Badge 
                      key={username}
                      variant="secondary" 
                      className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-3 py-1"
                      onClick={() => handleSearch(username)}
                    >
                      @{username}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setCurrentView('admin')}
              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
            >
              Creator Dashboard ⚡
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-0 shadow-lg">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">🎨</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Beautiful Themes</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Choose from carefully crafted themes that match your aesthetic
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-0 shadow-lg">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Click Analytics</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Track engagement and see which links perform best
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-0 shadow-lg">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">⚡</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Easy Management</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Drag, drop, and organize your links with intuitive controls
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;