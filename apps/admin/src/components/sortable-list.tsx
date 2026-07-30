"use client";

import { Button, cn } from "@babascamera/ui";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";

type SortableStrategy = "vertical" | "rect";

interface SortableListProps {
  id: string;
  itemIds: string[];
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  strategy?: SortableStrategy;
  disabled?: boolean;
}

export function SortableList({
  id,
  itemIds,
  children,
  onDragEnd,
  strategy = "vertical",
  disabled = false,
}: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        if (!disabled) onDragEnd(event);
      }}
    >
      <SortableContext
        items={itemIds}
        strategy={strategy === "rect" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemContextValue {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
  disabled: boolean;
}

const SortableItemContext = createContext<SortableItemContextValue | null>(null);

interface SortableListItemProps {
  id: string;
  children: ReactNode;
  className?: string;
  draggingClassName?: string;
  disabled?: boolean;
  as?: "div" | "li";
}

export function SortableListItem({
  id,
  children,
  className,
  draggingClassName = "relative z-10 shadow-lg",
  disabled = false,
  as: Component = "div",
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableItemContext.Provider value={{ attributes, listeners, setActivatorNodeRef, disabled }}>
      <Component
        ref={setNodeRef}
        className={cn(className, isDragging && draggingClassName)}
        style={style}
      >
        {children}
      </Component>
    </SortableItemContext.Provider>
  );
}

interface SortableDragHandleProps {
  label: string;
  disabled?: boolean;
  className?: string;
}

export function SortableDragHandle({
  label,
  disabled = false,
  className,
}: SortableDragHandleProps) {
  const context = useContext(SortableItemContext);
  if (!context) {
    throw new Error("SortableDragHandle must be used inside SortableListItem.");
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("size-8 shrink-0 cursor-grab touch-none", className)}
      disabled={disabled || context.disabled}
      aria-label={label}
      ref={context.setActivatorNodeRef}
      {...context.attributes}
      {...context.listeners}
    >
      <GripVertical className="size-4" />
    </Button>
  );
}
