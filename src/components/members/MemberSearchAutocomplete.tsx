import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Clock, 
  X, 
  AlertTriangle, 
  Ban, 
  Users, 
  TrendingDown,
  CheckCircle,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Member } from "@/hooks/useGymData";
import { Badge } from "@/components/ui/badge";

interface StatusFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
}

interface MemberSearchAutocompleteProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  members: Member[];
  onMemberSelect?: (member: Member) => void;
}

const STATUS_FILTERS: StatusFilter[] = [
  { id: "all", label: "All", icon: Users, color: "text-muted-foreground", activeColor: "bg-primary" },
  { id: "active", label: "Active", icon: CheckCircle, color: "text-[hsl(var(--md-green))]", activeColor: "bg-[hsl(var(--md-green))]" },
  { id: "expiring_soon", label: "Expiring", icon: AlertTriangle, color: "text-[hsl(var(--md-orange))]", activeColor: "bg-[hsl(var(--md-orange))]" },
  { id: "expired", label: "Expired", icon: TrendingDown, color: "text-destructive", activeColor: "bg-destructive" },
  { id: "blocked", label: "Blocked", icon: Ban, color: "text-muted-foreground", activeColor: "bg-muted-foreground" },
];

const STORAGE_KEY = "member-search-recent";
const MAX_RECENT_SEARCHES = 5;

export function MemberSearchAutocomplete({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  members,
  onMemberSelect,
}: MemberSearchAutocompleteProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate filter counts
  const filterCounts: Record<string, number> = {
    all: members.length,
    active: members.filter((m) => m.status === "active" && !m.is_blocked).length,
    expiring_soon: members.filter((m) => m.status === "expiring_soon").length,
    expired: members.filter((m) => m.status === "expired").length,
    blocked: members.filter((m) => m.is_blocked).length,
  };

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

  const showContent = showDropdown && (
    recentSearches.length > 0 || 
    suggestions.length > 0 || 
    searchQuery.length === 0
  );

  return (
    <div className="space-y-3">
      {/* Search Input with Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search by name, phone, or ID..."
            className="pl-10 pr-8"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

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
                    <p className="text-xs font-medium text-muted-foreground">Recent</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] text-muted-foreground hover:text-foreground px-1"
                      onClick={clearAllRecent}
                    >
                      Clear
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

              {/* Empty state */}
              {searchQuery.length === 0 && recentSearches.length === 0 && (
                <div className="p-4 text-center">
                  <Search className="h-6 w-6 text-muted-foreground mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    Type to search members
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            const count = filterCounts[filter.id] || 0;
            
            return (
              <button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? `${filter.activeColor} text-white shadow-sm`
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{filter.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  isActive ? "bg-white/20" : "bg-background"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
