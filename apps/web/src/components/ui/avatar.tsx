import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function Avatar({ name = "", src, size = "md", className }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "bg-[#F7F6F3] text-[#111111]",
    "bg-[#E1F3FE] text-[#1F6C9F]",
    "bg-[#EDF3EC] text-[#346538]",
    "bg-[#FBF3DB] text-[#956400]",
    "bg-[#FDEBEC] text-[#9F2F2D]",
  ];
  const hash = name
    .split("")
    .reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const colorIndex = Math.abs(hash) % colors.length;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover border border-[#EAEAEA]",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold border border-[#EAEAEA]",
        sizes[size],
        colors[colorIndex],
        className
      )}
      title={name}
    >
      {initials || "?"}
    </div>
  );
}

export { Avatar, type AvatarProps };
