import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Link, CreateLinkInput, UpdateLinkInput } from '../../../server/src/schema';

interface LinkManagerProps {
  userId: number;
}

// Common icons for quick selection
const commonIcons = [
  '🔗', '🌐', '📷', '🐦', '💼', '⚡', '📺', '🎵', '🎧', '✍️', 
  '🎨', '🏀', '🎯', '💡', '🚀', '📱', '💻', '🎮', '📚', '🎪'
];

export function LinkManager({ userId }: LinkManagerProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [createForm, setCreateForm] = useState<Omit<CreateLinkInput, 'user_id'>>({
    title: '',
    url: '',
    description: null,
    icon: null,
    position: undefined
  });

  const [editForm, setEditForm] = useState<Omit<UpdateLinkInput, 'id'>>({});

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const userLinks = await trpc.getLinksByUser.query({ user_id: userId });
      setLinks(userLinks.sort((a: Link, b: Link) => a.position - b.position));
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleCreateLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const newLink = await trpc.createLink.mutate({
        ...createForm,
        user_id: userId,
        position: createForm.position ?? links.length
      });
      
      setLinks(prev => [...prev, newLink].sort((a: Link, b: Link) => a.position - b.position));
      setCreateForm({
        title: '',
        url: '',
        description: null,
        icon: null,
        position: undefined
      });
      setShowCreateForm(false);
      alert('Link created successfully!');
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('Failed to create link');
    } finally {
      setIsLoading(false);
    }
  }, [createForm, userId, links.length]);

  const handleUpdateLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    
    setIsLoading(true);
    try {
      const updatedLink = await trpc.updateLink.mutate({
        id: editingLink.id,
        ...editForm
      });
      
      setLinks(prev => 
        prev.map((link: Link) => link.id === editingLink.id ? updatedLink : link)
          .sort((a: Link, b: Link) => a.position - b.position)
      );
      setEditingLink(null);
      setEditForm({});
      alert('Link updated successfully!');
    } catch (error) {
      console.error('Failed to update link:', error);
      alert('Failed to update link');
    } finally {
      setIsLoading(false);
    }
  }, [editForm, editingLink]);

  const handleDeleteLink = useCallback(async (linkId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteLink.mutate({ id: linkId });
      setLinks(prev => prev.filter((link: Link) => link.id !== linkId));
      alert('Link deleted successfully!');
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Failed to delete link');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const moveLink = useCallback(async (linkId: number, direction: 'up' | 'down') => {
    const currentIndex = links.findIndex((link: Link) => link.id === linkId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const reorderedLinks = [...links];
    [reorderedLinks[currentIndex], reorderedLinks[newIndex]] = [reorderedLinks[newIndex], reorderedLinks[currentIndex]];

    // Update positions
    const updates = reorderedLinks.map((link: Link, index: number) => ({
      id: link.id,
      position: index
    }));

    setIsLoading(true);
    try {
      await trpc.reorderLinks.mutate({
        user_id: userId,
        link_orders: updates
      });
      setLinks(reorderedLinks);
    } catch (error) {
      console.error('Failed to reorder links:', error);
      alert('Failed to reorder links');
    } finally {
      setIsLoading(false);
    }
  }, [links, userId]);

  const startEdit = useCallback((link: Link) => {
    setEditingLink(link);
    setEditForm({
      title: link.title,
      url: link.url,
      description: link.description,
      icon: link.icon,
      position: link.position,
      is_active: link.is_active
    });
  }, []);

  if (isLoading && links.length === 0) {
    return (
      <Card className="p-8 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
        <div className="animate-pulse">Loading links...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Manage Links</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-slate-900 to-slate-700"
        >
          + Add Link
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Create New Link</h3>
          <form onSubmit={handleCreateLink} className="space-y-4">
            <div>
              <Label htmlFor="create_title">Title *</Label>
              <Input
                id="create_title"
                value={createForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Link title"
                required
              />
            </div>

            <div>
              <Label htmlFor="create_url">URL *</Label>
              <Input
                id="create_url"
                type="url"
                value={createForm.url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm(prev => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="create_description">Description</Label>
              <Textarea
                id="create_description"
                value={createForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateForm(prev => ({ ...prev, description: e.target.value || null }))
                }
                placeholder="Optional description..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label>Icon</Label>
              <div className="space-y-2">
                <Input
                  value={createForm.icon || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm(prev => ({ ...prev, icon: e.target.value || null }))
                  }
                  placeholder="Custom emoji or icon"
                />
                <div className="flex flex-wrap gap-2">
                  {commonIcons.map((icon: string) => (
                    <Button
                      key={icon}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateForm(prev => ({ ...prev, icon }))}
                      className="w-10 h-10 p-0"
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Link'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <Card className="p-8 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
          <p className="text-slate-600 dark:text-slate-400">
            No links yet. Create your first link above!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {links.map((link: Link, index: number) => (
            <Card 
              key={link.id} 
              className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl"
            >
              {editingLink?.id === link.id ? (
                /* Edit Form */
                <form onSubmit={handleUpdateLink} className="space-y-4">
                  <div>
                    <Label htmlFor={`edit_title_${link.id}`}>Title</Label>
                    <Input
                      id={`edit_title_${link.id}`}
                      value={editForm.title || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm(prev => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Link title"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`edit_url_${link.id}`}>URL</Label>
                    <Input
                      id={`edit_url_${link.id}`}
                      type="url"
                      value={editForm.url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm(prev => ({ ...prev, url: e.target.value }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`edit_description_${link.id}`}>Description</Label>
                    <Textarea
                      id={`edit_description_${link.id}`}
                      value={editForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setEditForm(prev => ({ ...prev, description: e.target.value || null }))
                      }
                      placeholder="Optional description..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label>Icon</Label>
                    <div className="space-y-2">
                      <Input
                        value={editForm.icon || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditForm(prev => ({ ...prev, icon: e.target.value || null }))
                        }
                        placeholder="Custom emoji or icon"
                      />
                      <div className="flex flex-wrap gap-2">
                        {commonIcons.map((icon: string) => (
                          <Button
                            key={icon}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditForm(prev => ({ ...prev, icon }))}
                            className="w-10 h-10 p-0"
                          >
                            {icon}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`edit_active_${link.id}`}
                      checked={editForm.is_active ?? link.is_active}
                      onCheckedChange={(checked: boolean) =>
                        setEditForm(prev => ({ ...prev, is_active: checked }))
                      }
                    />
                    <Label htmlFor={`edit_active_${link.id}`}>Link is active</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditingLink(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                /* Display Mode */
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0 mt-1">
                    {link.icon || '🔗'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{link.title}</h3>
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {link.click_count} clicks
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-blue-600 dark:text-blue-400 break-all mb-2">
                      {link.url}
                    </p>
                    
                    {link.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {link.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {/* Move buttons */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveLink(link.id, 'up')}
                        disabled={index === 0 || isLoading}
                        className="w-8 h-8 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveLink(link.id, 'down')}
                        disabled={index === links.length - 1 || isLoading}
                        className="w-8 h-8 p-0"
                      >
                        ↓
                      </Button>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(link)}
                        disabled={isLoading}
                      >
                        Edit
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Link</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{link.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteLink(link.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}