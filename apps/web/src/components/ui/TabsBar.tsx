// components/ui/TabsBar.tsx
"use client";


type TabItem = string | { label: string; value?: string };

interface TabsBarProps {
  items: TabItem[];
  active: string;
  onChange: (value: string) => void;

  containerWidth?: number;
  containerHeight?: number;
  containerPadding?: number;
  containerBg?: string;

  itemWidth?: number;
  itemHeight?: number;
  itemPadding?: string;
  itemRadius?: number;
  activeBg?: string;

  className?: string;
}

export default function TabsBar({
  items,
  active,
  onChange,

  containerWidth = 600,
  containerHeight = 41,
  containerPadding = 3,
  containerBg = "var(--bg-muted, #F4F4F5)",

  itemWidth = 198,
  itemHeight = 35,
  itemPadding = "4px 8px",
  itemRadius = 8,
  activeBg = "var(--bg-secondary, #FFFFFF)",

  className = "",
}: TabsBarProps) {

  const toLabel = (t: TabItem) => (typeof t === "string" ? t : t.label);
  const toValue = (t: TabItem) =>
    typeof t === "string" ? t : t.value ?? t.label;

  return (
    <div
      className={`flex items-center justify-between gap-4 ${className}`}
      style={{ width: "100%" }}
    >
      {/* Tabs container */}
      <div
        role="tablist"
        aria-label="tabs"
        className="flex items-center rounded-lg"
        style={{
          width: containerWidth,
          height: containerHeight,
          padding: containerPadding,
          background: containerBg,
          opacity: 1,
        }}
      >
        {items.map((t) => {
          const label = toLabel(t);
          const value = toValue(t);
          const isActive = active === value;

          return (
            <button
              key={value}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(value)}
              className="text-sm font-medium transition-colors focus:outline-none cursor-pointer"
              style={{
                width: itemWidth,
                height: itemHeight,
                padding: itemPadding,
                borderRadius: itemRadius,
                border: isActive
                  ? "1px solid rgba(0,0,0,0.15)"
                  : "1px solid transparent",
                background: isActive ? activeBg : "transparent",
                color: isActive ? "#0F172A" : "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                fontFamily: "Geist, sans-serif", // ✅ Tabs font
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
