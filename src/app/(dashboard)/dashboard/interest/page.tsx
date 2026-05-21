'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  IconPlus,
  IconTrash,
  IconX,
  IconSearch,
  IconTags,
  IconFolderPlus,
  IconChevronRight,
} from '@tabler/icons-react';

interface InterestGroup {
  id: string;
  name: string;
  color: 'blue' | 'emerald' | 'violet' | 'warning' | 'success' | 'destructive';
  subInterests: string[];
}

const initialGroups: InterestGroup[] = [
  {
    id: '1',
    name: 'Food & Drink',
    color: 'warning',
    subInterests: [
      'Trying Specialty Coffee Shops',
      'Going Wine Tasting',
      'Trying New Restaurants',
      'Brewery Hopping',
      'Sushi Making Classes',
      'Splurging on Fine Dining',
      'Local Pub Sessions',
      'Trying Cocktail Bars',
      'Attending Supper Clubs',
      'Baking & Cooking Workshops'
    ],
  },
  {
    id: '2',
    name: 'Music & Audio',
    color: 'violet',
    subInterests: [
      'Indie & Punk Gigs',
      'Raving (House & Techno)',
      'Jazz Club Nights',
      'Record Store Digging',
      'Studio Jam Sessions',
      'Discovering Local Bands',
      'Opera & Orchestral Nights',
      'R&B & Soul Live Shows',
      'Going to Music Festivals',
      'Open Mic & Jam Nights',
      'Songwriting Sessions'
    ],
  },
  {
    id: '3',
    name: 'Sport & Fitness',
    color: 'destructive',
    subInterests: [
      'Partner HYROX Training',
      'Social 5k Runs',
      'Long Distance Run Pacing',
      'Playing Padel/Pickleball',
      'HIIT Sessions',
      'Muay Thai / Pad Sessions',
      'Weekend Group Cycling',
      'Reformer Pilates Classes',
      'Gym Spotting / Powerlifting',
      '5-a-side Football Matches',
      'Playing Tennis'
    ],
  },
  {
    id: '4',
    name: 'Film, TV & Media',
    color: 'blue',
    subInterests: [
      'Indie Cinema Trips',
      'Cult Classic Screenings',
      'TV Series Watch Parties',
      'Anime Screenings & Cons',
      'Docu-Screenings & Debates',
      'Short Film Collabs',
      'Horror Cinema Nights',
      'Attending Film Festivals',
      'Sci-Fi Cinema Events',
      'Reality TV Watch Parties'
    ],
  },
  {
    id: '5',
    name: 'Literature & Reading',
    color: 'success',
    subInterests: [
      'Sci-Fi Book Clubs',
      'Non-Fiction Book Swaps',
      'Spoken Word & Poetry Nights',
      'Joining Local Book Clubs',
      'Co-Writing Cafe Sessions',
      'Zine & Art Workshops',
      'Historical Book Clubs',
      'Philosophy Discussion Groups',
      'Comic Store Runs',
      'Thriller Book Clubs'
    ],
  },
  {
    id: '6',
    name: 'Art, Culture & Entertainment',
    color: 'emerald',
    subInterests: [
      'Gallery Hopping',
      'Pottery Making Classes',
      'Drink & Draw / Life Drawing',
      'Stand-up Comedy Nights',
      'West End / Theatre Trips',
      'Museum Exhibits',
      'Escape Rooms',
      'Guided Architecture Walks',
      'Photowalks (35mm/Digital)',
      'Street Art Tours',
      'Watching Football live or at the pub',
      'Watching Tennis live or at the pub',
      'Watching Cricket live or at the pub',
      'Watching Rugby live or at the pub'
    ],
  },
  {
    id: '7',
    name: 'Outdoor & Adventure',
    color: 'success',
    subInterests: [
      'Weekend Hikes / Walks',
      'Wild Swimming Dips',
      'Guided Foraging Walks',
      'Off-Grid Camping Trips',
      'Trail Running Together',
      'Group Ski/Snowboard Trips',
      'Weekend Surf Trips',
      'Watersport Sessions (Kite Surfing, WaterSkiing etc.)',
      'Botanical Garden Strolls',
      'Nature Walks & Birding',
      'Paintballing',
      'Go Karting'
    ],
  },
  {
    id: '8',
    name: 'Tech, Gaming & Career',
    color: 'blue',
    subInterests: [
      'Startup Pitch Events',
      'Going To Tech Events',
      'Sofa Gaming Sessions',
      'Online Gaming',
      'Playing Group Board Games (Catan, Monopoly)',
      'Crypto & Web3 Meetups',
      'Women in Biz Networking',
      'Co-working Cafe Days'
    ],
  },
  {
    id: '9',
    name: 'Wellness & Mindset',
    color: 'violet',
    subInterests: [
      'Group Meditation Sessions',
      'Attending Sound Baths',
      'Ice Bath & Sauna Sessions',
      'Cold Plunge Meetups',
      'Yoga Studio Classes',
      'Breathwork Workshops',
      'Wellness Retreat Days',
      'Mindfulness & Cacao Ceremonies',
      'Tarot & Astrology Readings',
      'Spa Days'
    ],
  },
  {
    id: '10',
    name: 'Fashion & Lifestyle',
    color: 'warning',
    subInterests: [
      'Vintage & Thrift Shopping',
      'Sneaker Drops & Events',
      'Upcycling & Sewing Workshops',
      'Fashion Pop-ups & Shows',
      'Furniture & Antique Markets',
      'Plant Shop Browsing',
      'Fragrance Testing Tours',
      'Spa & Skincare Days',
      'Weekend Car Meets',
      'Group Dog Walking'
    ],
  },
];

export default function InterestsPage() {
  const [groups, setGroups] = useState<InterestGroup[]>(initialGroups);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Accordion state
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<'blue' | 'emerald' | 'violet' | 'warning' | 'success' | 'destructive'>('blue');
  
  // Inline input states per group card
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    
    const newId = Date.now().toString();
    const newGroup: InterestGroup = {
      id: newId,
      name: newGroupName.trim(),
      color: newGroupColor,
      subInterests: [],
    };
    
    setGroups((prev) => [newGroup, ...prev]);
    setNewGroupName('');
    setIsCreating(false);
    setActiveGroupId(newId); // auto-expand the newly created group
  };

  const handleDeleteGroup = (id: string) => {
    if (window.confirm('Are you sure you want to delete this interest group?')) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (activeGroupId === id) {
        setActiveGroupId(null);
      }
    }
  };

  const handleSubInputChange = (groupId: string, val: string) => {
    setSubInputs((prev) => ({ ...prev, [groupId]: val }));
  };

  const handleAddSubInterest = (groupId: string) => {
    const val = subInputs[groupId]?.trim();
    if (!val) return;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          // Prevent duplicates
          if (g.subInterests.includes(val)) return g;
          return { ...g, subInterests: [...g.subInterests, val] };
        }
        return g;
      })
    );

    // Clear input
    setSubInputs((prev) => ({ ...prev, [groupId]: '' }));
  };

  const handleDeleteSubInterest = (groupId: string, subInterest: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, subInterests: g.subInterests.filter((s) => s !== subInterest) };
        }
        return g;
      })
    );
  };

  // Filter groups and their sub-interests by query
  const filteredGroups = groups.filter((group) => {
    const matchesGroup = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSub = group.subInterests.some((sub) =>
      sub.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesGroup || matchesSub;
  });

  return (
    <div className="flex flex-col p-4 gap-5 w-full max-w-[1400px] mx-auto animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-glow">Interests</h1>
            <div className="hidden sm:inline-flex text-[10px] font-bold text-primary/70 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 tracking-widest uppercase">
              {groups.length} Groups
            </div>
          </div>
          <p className="text-muted-foreground text-xs font-medium">Manage interest categories and their sub-interests</p>
        </div>

        {/* Actions & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 h-9 px-4 shadow-xl shadow-primary/20 text-xs font-bold uppercase tracking-wider ml-auto sm:ml-0"
          >
            {isCreating ? <IconX size={16} /> : <IconPlus size={16} />}
            <span>{isCreating ? 'Cancel' : 'New Group'}</span>
          </Button>
        </div>
      </div>

      {/* Creation Panel */}
      {isCreating && (
        <Card className="border-primary/20 bg-primary/5 shadow-2xl p-5 animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <IconFolderPlus size={18} className="text-primary" />
              <span>Create New Interest Group</span>
            </CardTitle>
            <CardDescription className="text-xs">Groups categorize and organize individual sub-interests.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group Name</label>
              <Input
                placeholder="e.g. Sports & Outdoors, Music & Beats..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            
            <div className="w-full md:w-56 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Theme Color</label>
              <div className="flex gap-2 items-center h-9">
                {(['blue', 'emerald', 'violet', 'warning', 'success', 'destructive'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewGroupColor(c)}
                    className={`h-6 w-6 rounded-full border transition-all ${
                      newGroupColor === c 
                        ? 'ring-2 ring-primary ring-offset-2 scale-110 border-white' 
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: 
                        c === 'blue' ? '#3b82f6' : 
                        c === 'emerald' ? '#10b981' : 
                        c === 'violet' ? '#8b5cf6' : 
                        c === 'warning' ? '#f59e0b' : 
                        c === 'success' ? '#22c55e' : '#ef4444'
                    }}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="h-9 w-full md:w-auto px-6 font-bold text-xs uppercase tracking-wider"
            >
              Create Group
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accordion Row List */}
      <div className="flex flex-col gap-3.5 w-full">
        {filteredGroups.map((group) => {
          const isOpen = activeGroupId === group.id;

          // Color map mappings
          const colorMap = {
            blue: {
              border: isOpen ? 'border-blue-500/30' : 'border-blue-500/10 hover:border-blue-500/25',
              text: 'text-blue-400',
              bg: 'bg-blue-500/5',
              badge: 'blue' as const,
              glow: isOpen ? 'glow-blue/15' : 'hover:glow-blue/5'
            },
            emerald: {
              border: isOpen ? 'border-emerald-500/30' : 'border-emerald-500/10 hover:border-emerald-500/25',
              text: 'text-emerald-400',
              bg: 'bg-emerald-500/5',
              badge: 'emerald' as const,
              glow: isOpen ? 'glow-emerald/15' : 'hover:glow-emerald/5'
            },
            violet: {
              border: isOpen ? 'border-violet-500/30' : 'border-violet-500/10 hover:border-violet-500/25',
              text: 'text-violet-400',
              bg: 'bg-violet-500/5',
              badge: 'violet' as const,
              glow: isOpen ? 'glow-violet/15' : 'hover:glow-violet/5'
            },
            warning: {
              border: isOpen ? 'border-amber-500/30' : 'border-amber-500/10 hover:border-amber-500/25',
              text: 'text-amber-400',
              bg: 'bg-amber-500/5',
              badge: 'warning' as const,
              glow: isOpen ? 'glow-amber/15' : 'hover:glow-amber/5'
            },
            success: {
              border: isOpen ? 'border-green-500/30' : 'border-green-500/10 hover:border-green-500/25',
              text: 'text-green-400',
              bg: 'bg-green-500/5',
              badge: 'success' as const,
              glow: isOpen ? 'glow-green/15' : 'hover:glow-green/5'
            },
            destructive: {
              border: isOpen ? 'border-red-500/30' : 'border-red-500/10 hover:border-red-500/25',
              text: 'text-red-400',
              bg: 'bg-red-500/5',
              badge: 'destructive' as const,
              glow: isOpen ? 'glow-red/15' : 'hover:glow-red/5'
            }
          };

          const style = colorMap[group.color] || colorMap.blue;
          
          return (
            <Card 
              key={group.id} 
              className={`overflow-hidden transition-all duration-300 border-white/5 ${style.border} ${style.glow} group`}
            >
              {/* Clickable Header Row */}
              <div 
                onClick={() => setActiveGroupId(isOpen ? null : group.id)}
                className="flex flex-row items-center justify-between p-4 cursor-pointer bg-white/[0.01] hover:bg-white/[0.025] transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <IconChevronRight 
                    size={16} 
                    className={`text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-90 text-white' : 'text-muted-foreground/60'}`} 
                  />
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 ${style.bg} ${style.text}`}>
                    <IconTags size={16} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <span className="text-sm font-bold text-white tracking-tight">{group.name}</span>
                    <span className="inline-flex text-[9px] font-extrabold text-muted-foreground/70 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 tracking-wider uppercase w-fit">
                      {group.subInterests.length} Sub-Interests
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <IconTrash size={14} />
                </Button>
              </div>

              {/* Collapsible content area */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-in-out',
                  opacity: isOpen ? 1 : 0,
                }}
                className={isOpen ? '' : 'pointer-events-none'}
              >
                <div className="min-h-0 overflow-hidden">
                  <CardContent className="p-4 pt-3 flex flex-col gap-4 border-t border-white/5 bg-white/[0.003]">
                    {/* Sub-Interests */}
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      {group.subInterests.length > 0 ? (
                        group.subInterests.map((sub, idx) => (
                          <Badge 
                            key={idx} 
                            variant={style.badge} 
                            className="group/badge flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border-white/5 transition-all hover:scale-105 duration-200"
                          >
                            <span>{sub}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSubInterest(group.id, sub);
                              }}
                              className="opacity-40 hover:opacity-100 transition-opacity rounded-full hover:bg-white/10 p-0.5"
                            >
                              <IconX size={10} />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic font-medium py-1.5">No sub-interests added yet.</span>
                      )}
                    </div>

                    {/* Add Sub-Interest Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <Input
                        placeholder="Add sub-interest..."
                        value={subInputs[group.id] || ''}
                        onChange={(e) => handleSubInputChange(group.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSubInterest(group.id);
                          }
                        }}
                        className="h-8 text-xs bg-white/5 border-white/10"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddSubInterest(group.id)}
                        className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider"
                      >
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
