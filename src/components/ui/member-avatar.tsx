import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MemberAvatar({ name, size = "md", className }: MemberAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  return (
    <div className={cn("member-avatar", sizeClasses[size], className)}>
      {initials}
    </div>
  );
}
