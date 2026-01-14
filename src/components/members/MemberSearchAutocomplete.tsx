import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Clock, 
  X, 
  AlertTriangle, 
  Ban, 
  Users, 
  TrendingUp,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Member } from "@/hooks/useGymData";

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  filter: (member: Member) => boolean;
  variant: "default" | "warning" | "destructive" | "secondary";
}

interface MemberSearchAutocompleteProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onQuickFilter: (filterId: string | null) => void;
  activeQuickFilter: string | null;
  members: Member[];
  onMemberSelect?: (member: Member) => void;
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "expiring_soon",
    label: "Expiring Soon",
    icon: AlertTriangle,
    filter: (m) => m.status === "expiring_soon",
    variant: "warning",
  },
  {
    id: "blocked",
    label: "Blocked",
    icon: Ban,
    filter: (m) => m.is_blocked,
    variant: "destructive",
  },
  {
    id: "expired",
    label: "Expired",
    icon: TrendingUp,
    filter: (m) => m.status === "expired",
    variant: "secondary",
  },
  {
    id: "high_visits",
    label: "Frequent Visitors",
    icon: Users,
    filter: (m) => m.total_visits >= 20,
    variant: "default",
  },
];

const STORAGE_KEY = "member-search-recent";
const MAX_RECENT_SEARCHES = 5;

export function MemberSearchAutocomplete({
  searchQuery,
  onSearchChange,
  onQuickFilter,
  activeQuickFilter,
  members,
  onMemberSelect,
}: MemberSearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save to recent searches when user selects a result or presses enter
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeRecentSearch = (search: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== search);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Filter members for suggestions
  const suggestions = searchQuery.length >= 2
    ? members
        .filter((m) =>
          m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.phone.includes(searchQuery) ||
          m.member_id.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      setShowDropdown(false);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleRecentClick = (search: string) => {
    onSearchChange(search);
    saveRecentSearch(search);
    setShowDropdown(false);
  };

  const handleMemberClick = (member: Member) => {
    onSearchChange(member.full_name);
    saveRecentSearch(member.full_name);
    setShowDropdown(false);
    onMemberSelect?.(member);
  };

  const handleQuickFilterClick = (filterId: string) => {
    onQuickFilter(activeQuickFilter === filterId ? null : filterId);
    onSearchChange("");
    setShowDropdown(false);
  };

  const showContent = showDropdown && (
    recentSearches.length > 0 || 
    suggestions.length > 0 || 
    searchQuery.length === 0
  );

  return (
    <div className="relative flex-1">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search by name, phone, or ID..."
          className="pl-10 pr-8"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (activeQuickFilter) onQuickFilter(null);
          }}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
        />
        {(searchQuery || activeQuickFilter) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              onSearchChange("");
              onQuickFilter(null);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Quick Filter Badges */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {QUICK_FILTERS.map((filter) => {
          const count = members.filter(filter.filter).length;
          const Icon = filter.icon;
          const isActive = activeQuickFilter === filter.id;
          
          return (
            <Badge
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105 gap-1 py-1 px-2",
                isActive && filter.variant === "warning" && "bg-[hsl(var(--md-orange))] hover:bg-[hsl(var(--md-orange))]/90 text-white border-transparent",
                isActive && filter.variant === "destructive" && "bg-destructive hover:bg-destructive/90",
                isActive && filter.variant === "secondary" && "bg-muted-foreground hover:bg-muted-foreground/90 text-white",
                isActive && filter.variant === "default" && "bg-primary hover:bg-primary/90",
                !isActive && "hover:bg-accent"
              )}
              onClick={() => handleQuickFilterClick(filter.id)}
            >
              <Icon className="h-3 w-3" />
              <span className="text-xs">{filter.label}</span>
              {count > 0 && (
                <span className={cn(
                  "ml-0.5 text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
                  isActive ? "bg-white/20" : "bg-muted"
                )}>
                  {count}
                </span>
              )}
            </Badge>
          );
        })}
      </div>

      {/* Dropdown */}
      {showContent && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Member Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1.5">Members</p>
              {suggestions.map((member) => (
                <button
                  key={member.id}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors text-left"
                  onClick={() => handleMemberClick(member)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.member_id} • {member.phone}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] flex-shrink-0",
                      member.status === "active" && "border-[hsl(var(--md-green))] text-[hsl(var(--md-green))]",
                      member.status === "expiring_soon" && "border-[hsl(var(--md-orange))] text-[hsl(var(--md-orange))]",
                      member.status === "expired" && "border-destructive text-destructive"
                    )}
                  >
                    {member.status.replace("_", " ")}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && searchQuery.length === 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <p className="text-xs font-medium text-muted-foreground">Recent Searches</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAllRecent}
                >
                  Clear all
                </Button>
              </div>
              {recentSearches.map((search) => (
                <button
                  key={search}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left group"
                  onClick={() => handleRecentClick(search)}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{search}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => removeRecentSearch(search, e)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </button>
              ))}
            </div>
          )}

          {/* Empty state hint */}
          {searchQuery.length === 0 && recentSearches.length === 0 && (
            <div className="p-4 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Start typing to search members
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { QUICK_FILTERS };
export type { QuickFilter };
