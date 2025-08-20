import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { PublicProfile, Link } from '../../../server/src/schema';

interface ProfileViewProps {
  profile: PublicProfile;
  onBack: () => void;
}

// Icon mapping for different link types
const getIconForLink = (icon: string | null, url: string): string => {
  if (icon) return icon;
  
  // Auto-detect based on URL
  if (url.includes('twitter.com') || url.includes('x.com')) return '🐦';
  if (url.includes('instagram.com')) return '📷';
  if (url.includes('linkedin.com')) return '💼';
  if (url.includes('github.com')) return '⚡';
  if (url.includes('youtube.com')) return '📺';
  if (url.includes('tiktok.com')) return '🎵';
  if (url.includes('spotify.com')) return '🎧';
  if (url.includes('medium.com')) return '✍️';
  if (url.includes('behance.net')) return '🎨';
  if (url.includes('dribbble.com')) return '🏀';
  return '🔗';
};

// Theme configurations
const getThemeClasses = (theme: string) => {
  switch (theme) {
    case 'dark':
      return {
        container: 'bg-slate-900 text-white',
        card: 'bg-slate-800/80 border-slate-700 hover:bg-slate-700/80',
        accent: 'from-slate-400 to-slate-200'
      };
    case 'gradient':
      return {
        container: 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white',
        card: 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-md',
        accent: 'from-white to-purple-200'
      };
    case 'light':
      return {
        container: 'bg-white text-slate-900',
        card: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
        accent: 'from-slate-900 to-slate-700'
      };
    default: // minimal
      return {
        container: 'bg-gradient-to-br from-slate-50 to-white text-slate-900',
        card: 'bg-white/80 border-slate-200/50 hover:bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md',
        accent: 'from-slate-900 to-slate-600'
      };
  }
};

export function ProfileView({ profile, onBack }: ProfileViewProps) {
  const [clickingLink, setClickingLink] = useState<number | null>(null);
  const themeClasses = getThemeClasses(profile.user.theme);

  const handleLinkClick = useCallback(async (link: Link) => {
    setClickingLink(link.id);
    
    try {
      // Track the click
      await trpc.trackLinkClick.mutate({ link_id: link.id });
      
      // Small delay for visual feedback, then navigate
      setTimeout(() => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
        setClickingLink(null);
      }, 150);
    } catch (error) {
      console.error('Failed to track click:', error);
      // Still navigate even if tracking fails
      window.open(link.url, '_blank', 'noopener,noreferrer');
      setClickingLink(null);
    }
  }, []);

  const activeLinks = profile.links
    .filter((link: Link) => link.is_active)
    .sort((a: Link, b: Link) => a.position - b.position);

  return (
    <div className={`min-h-screen ${themeClasses.container} transition-colors duration-500`}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 text-current hover:bg-black/5 dark:hover:bg-white/10"
        >
          ← Back to Search
        </Button>

        {/* Profile Header */}
        <div className="text-center space-y-6 mb-12">
          <Avatar className="w-24 h-24 mx-auto ring-4 ring-current/10">
            <AvatarImage src={profile.user.avatar_url || undefined} alt={profile.user.display_name || profile.user.username} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700">
              {(profile.user.display_name || profile.user.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${themeClasses.accent} bg-clip-text text-transparent`}>
              {profile.user.display_name || profile.user.username}
            </h1>
            <p className="text-sm opacity-70">@{profile.user.username}</p>
            {profile.user.bio && (
              <p className="text-lg opacity-80 max-w-md mx-auto leading-relaxed">
                {profile.user.bio}
              </p>
            )}
          </div>

          {/* Theme Badge */}
          <Badge 
            variant="secondary" 
            className="bg-current/10 text-current border-current/20 capitalize"
          >
            {profile.user.theme} theme
          </Badge>
        </div>

        {/* Links */}
        {activeLinks.length === 0 ? (
          <Card className={`p-8 ${themeClasses.card} transition-all duration-300`}>
            <div className="text-center space-y-2">
              <p className="opacity-70">No links available</p>
              <p className="text-sm opacity-50">This creator hasn't added any links yet</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeLinks.map((link: Link) => (
              <Card
                key={link.id}
                className={`${themeClasses.card} transition-all duration-300 cursor-pointer group ${
                  clickingLink === link.id ? 'scale-95 opacity-75' : 'hover:scale-[1.02]'
                }`}
                onClick={() => handleLinkClick(link)}
              >
                <div className="p-6 flex items-center gap-4">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                    {getIconForLink(link.icon, link.url)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg group-hover:text-current transition-colors">
                      {link.title}
                    </h3>
                    {link.description && (
                      <p className="text-sm opacity-70 mt-1 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                  </div>

                  {/* Click Count & Arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {link.click_count > 0 && (
                      <Badge 
                        variant="outline" 
                        className="bg-current/5 text-current/70 border-current/20 text-xs"
                      >
                        {link.click_count} clicks
                      </Badge>
                    )}
                    <div className="opacity-40 group-hover:opacity-70 group-hover:translate-x-1 transition-all duration-200">
                      →
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-xs opacity-50">
            Profile created on {profile.user.created_at.toLocaleDateString()}
          </p>
          <p className="text-xs opacity-40">
            Powered by ✨ LinkTree
          </p>
        </div>
      </div>
    </div>
  );
}