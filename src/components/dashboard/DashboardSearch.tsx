import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member } from "@/hooks/useGymData";

interface DashboardSearchProps {
  members: Member[];
  onMemberClick?: (member: Member) => void;
}

export function DashboardSearch({ members, onMemberClick }: DashboardSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return members
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.member_id.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [query, members]);

  const isOpen = isFocused && query.trim().length > 0;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered.length, query]);

  const selectMember = (member: Member) => {
    if (onMemberClick) {
      onMemberClick(member);
    }
    setQuery("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const goToMembers = () => {
    navigate(`/members?search=${encodeURIComponent(query.trim())}`);
    setQuery("");
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" && query.trim()) {
        goToMembers();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length)); // length = "view all" option
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        selectMember(filtered[highlightIndex]);
      } else {
        goToMembers();
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 sm:flex-none z-50">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder="Search members..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className="w-full sm:w-[280px] pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:sm:w-[340px]"
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:w-[380px] mt-2 rounded-xl border border-border bg-popover shadow-xl shadow-black/10 z-50 overflow-hidden animate-fade-in">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No members found for "{query}"</p>
              <button
                onClick={goToMembers}
                className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Search in Members page <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {filtered.map((member, i) => (
                  <button
                    key={member.id}
                    onClick={() => selectMember(member)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      highlightIndex === i
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <MemberAvatar
                      name={member.full_name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {member.member_id} · {member.phone}
                      </p>
                    </div>
                    <StatusBadge status={member.status} />
                  </button>
                ))}
              </div>
              <button
                onClick={goToMembers}
                onMouseEnter={() => setHighlightIndex(filtered.length)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm border-t border-border transition-colors",
                  highlightIndex === filtered.length
                    ? "bg-accent text-accent-foreground"
                    : "text-primary hover:bg-accent/50"
                )}
              >
                <Users className="h-4 w-4" />
                View all in Members
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
