import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LinkManager } from '@/components/LinkManager';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  
  // Form states
  const [newUserForm, setNewUserForm] = useState<CreateUserInput>({
    username: '',
    email: '',
    display_name: null,
    bio: null,
    avatar_url: null,
    theme: 'minimal'
  });

  const [editForm, setEditForm] = useState<Partial<UpdateUserInput>>({});

  const loadUser = useCallback(async (username: string) => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    try {
      const user = await trpc.getUserByUsername.query({ username: username.trim() });
      if (user) {
        setCurrentUser(user);
        setEditForm({
          id: user.id,
          display_name: user.display_name,
          bio: user.bio,
          avatar_url: user.avatar_url,
          theme: user.theme,
          is_active: user.is_active
        });
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      alert('Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    
    try {
      const newUser = await trpc.createUser.mutate(newUserForm);
      setCurrentUser(newUser);
      setEditForm({
        id: newUser.id,
        display_name: newUser.display_name,
        bio: newUser.bio,
        avatar_url: newUser.avatar_url,
        theme: newUser.theme,
        is_active: newUser.is_active
      });
      setNewUserForm({
        username: '',
        email: '',
        display_name: null,
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      });
      alert('User created successfully!');
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user. Username might already exist.');
    } finally {
      setIsCreatingUser(false);
    }
  }, [newUserForm]);

  const handleUpdateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const updatedUser = await trpc.updateUser.mutate(editForm as UpdateUserInput);
      setCurrentUser(updatedUser);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }, [editForm, currentUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="gradient"></div>
      <div className="grid"></div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              ⚡ Creator Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your link-in-bio profile
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            ← Back to Search
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="links" disabled={!currentUser}>Links</TabsTrigger>
              <TabsTrigger value="create">Create User</TabsTrigger>
            </TabsList>

            {/* Profile Management */}
            <TabsContent value="profile" className="space-y-6">
              {!currentUser ? (
                <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Load Existing Profile</h2>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Enter username to edit..."
                        value={searchUsername}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchUsername(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            loadUser(searchUsername);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => loadUser(searchUsername)}
                        disabled={isLoading || !searchUsername.trim()}
                      >
                        {isLoading ? 'Loading...' : 'Load Profile'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Current Profile Preview */}
                  <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={currentUser.avatar_url || undefined} />
                        <AvatarFallback className="text-lg font-bold">
                          {(currentUser.display_name || currentUser.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {currentUser.display_name || currentUser.username}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">@{currentUser.username}</p>
                        <Badge variant={currentUser.is_active ? 'default' : 'secondary'} className="mt-1">
                          {currentUser.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentUser(null)}
                    >
                      Switch Profile
                    </Button>
                  </Card>

                  {/* Edit Profile Form */}
                  <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
                    <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div>
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          value={editForm.display_name || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditForm(prev => ({ ...prev, display_name: e.target.value || null }))
                          }
                          placeholder="Your display name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editForm.bio || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setEditForm(prev => ({ ...prev, bio: e.target.value || null }))
                          }
                          placeholder="Tell people about yourself..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div>
                        <Label htmlFor="avatar_url">Avatar URL</Label>
                        <Input
                          id="avatar_url"
                          type="url"
                          value={editForm.avatar_url || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditForm(prev => ({ ...prev, avatar_url: e.target.value || null }))
                          }
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>

                      <div>
                        <Label htmlFor="theme">Theme</Label>
                        <Select
                          value={editForm.theme || 'minimal'}
                          onValueChange={(value: 'light' | 'dark' | 'gradient' | 'minimal') =>
                            setEditForm(prev => ({ ...prev, theme: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minimal">✨ Minimal</SelectItem>
                            <SelectItem value="light">☀️ Light</SelectItem>
                            <SelectItem value="dark">🌙 Dark</SelectItem>
                            <SelectItem value="gradient">🌈 Gradient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={editForm.is_active ?? true}
                          onCheckedChange={(checked: boolean) =>
                            setEditForm(prev => ({ ...prev, is_active: checked }))
                          }
                        />
                        <Label htmlFor="is_active">Profile is active</Label>
                      </div>

                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? 'Updating...' : 'Update Profile'}
                      </Button>
                    </form>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Link Management */}
            <TabsContent value="links">
              {currentUser ? (
                <LinkManager userId={currentUser.id} />
              ) : (
                <Card className="p-8 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
                  <p className="text-slate-600 dark:text-slate-400">
                    Please load a profile first to manage links
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* Create User */}
            <TabsContent value="create">
              <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Create New User</h2>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="new_username">Username *</Label>
                    <Input
                      id="new_username"
                      value={newUserForm.username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserForm(prev => ({ ...prev, username: e.target.value }))
                      }
                      placeholder="username"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_email">Email *</Label>
                    <Input
                      id="new_email"
                      type="email"
                      value={newUserForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserForm(prev => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="user@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_display_name">Display Name</Label>
                    <Input
                      id="new_display_name"
                      value={newUserForm.display_name || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserForm(prev => ({ ...prev, display_name: e.target.value || null }))
                      }
                      placeholder="Your Name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_theme">Theme</Label>
                    <Select
                      value={newUserForm.theme}
                      onValueChange={(value: 'light' | 'dark' | 'gradient' | 'minimal') =>
                        setNewUserForm(prev => ({ ...prev, theme: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">✨ Minimal</SelectItem>
                        <SelectItem value="light">☀️ Light</SelectItem>
                        <SelectItem value="dark">🌙 Dark</SelectItem>
                        <SelectItem value="gradient">🌈 Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" disabled={isCreatingUser} className="w-full">
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}