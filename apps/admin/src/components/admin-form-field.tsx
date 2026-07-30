"use client";

import {
  Badge,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  cn,
} from "@babascamera/ui";
import { Check, Search, X } from "lucide-react";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { useFormContext, type FieldValues } from "react-hook-form";

interface BaseFieldProps {
  name: string;
  label: string;
  description?: string;
  className?: string;
}

interface InputFieldProps extends BaseFieldProps {
  inputProps?: Omit<ComponentProps<typeof Input>, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref">;
  valueAsNumber?: boolean;
}

export function AdminInputField({
  name,
  label,
  description,
  className,
  inputProps,
  valueAsNumber = false,
}: InputFieldProps) {
  const form = useFormContext<FieldValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...inputProps}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === "string" || typeof field.value === "number" ? field.value : ""}
              onChange={(event) => {
                field.onChange(valueAsNumber ? event.target.valueAsNumber : event.target.value);
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TextareaFieldProps extends BaseFieldProps {
  textareaProps?: Omit<ComponentProps<typeof Textarea>, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref">;
}

export function AdminTextareaField({
  name,
  label,
  description,
  className,
  textareaProps,
}: TextareaFieldProps) {
  const form = useFormContext<FieldValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...textareaProps}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SelectFieldProps extends BaseFieldProps {
  children: ReactNode;
  selectProps?: Omit<ComponentProps<"select">, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref">;
}

export function AdminSelectField({
  name,
  label,
  description,
  className,
  children,
  selectProps,
}: SelectFieldProps) {
  const form = useFormContext<FieldValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <select
              {...selectProps}
              name={field.name}
              ref={field.ref}
              value={typeof field.value === "string" ? field.value : ""}
              onBlur={field.onBlur}
              onChange={field.onChange}
              className={cn("h-10 rounded-md border bg-white px-3 text-sm", selectProps?.className)}
            >
              {children}
            </select>
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SearchSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchSelectFieldProps extends BaseFieldProps {
  options: SearchSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  allowEmpty?: boolean;
  emptyValueLabel?: string;
}

export function AdminSearchSelectField({
  name,
  label,
  description,
  className,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyLabel = "No matches found.",
  allowEmpty = false,
  emptyValueLabel = "None",
}: SearchSelectFieldProps) {
  const form = useFormContext<FieldValues>();
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => (
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.description?.toLowerCase().includes(normalizedQuery) ||
      option.badge?.toLowerCase().includes(normalizedQuery)
    ));
  }, [options, query]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const selected = options.find((option) => option.value === field.value);
        return (
          <FormItem className={className}>
            <div className="flex items-center justify-between gap-3">
              <FormLabel>{label}</FormLabel>
              {selected || placeholder ? (
                <span className={cn(
                  "max-w-48 truncate text-xs font-semibold",
                  selected ? "text-slate-500" : "text-slate-400",
                )}>
                  {selected?.label ?? placeholder}
                </span>
              ) : null}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  type="search"
                />
                {query ? (
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <FormControl>
                <input type="hidden" name={field.name} value={typeof field.value === "string" ? field.value : ""} />
              </FormControl>
              <div className="max-h-64 overflow-auto p-1">
                {allowEmpty ? (
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                      !field.value && "bg-slate-100",
                    )}
                    onClick={() => field.onChange("")}
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full border">
                      {!field.value ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 font-semibold text-slate-700">{emptyValueLabel}</span>
                  </button>
                ) : null}
                {filteredOptions.map((option) => {
                  const isSelected = option.value === field.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
                        isSelected && "bg-slate-100",
                      )}
                      onClick={() => field.onChange(option.value)}
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border">
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-slate-900">{option.label}</span>
                        {option.description ? (
                          <span className="block truncate text-xs text-slate-500">{option.description}</span>
                        ) : null}
                      </span>
                      {option.badge ? <Badge variant="outline">{option.badge}</Badge> : null}
                    </button>
                  );
                })}
                {!filteredOptions.length ? <p className="px-3 py-6 text-center text-sm text-slate-500">{emptyLabel}</p> : null}
              </div>
            </div>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

interface CheckboxFieldProps extends BaseFieldProps {
  checkboxProps?: Omit<ComponentProps<"input">, "type" | "name" | "checked" | "defaultChecked" | "onChange" | "onBlur" | "ref">;
}

export function AdminCheckboxField({
  name,
  label,
  description,
  className,
  checkboxProps,
}: CheckboxFieldProps) {
  const form = useFormContext<FieldValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center gap-2">
            <FormControl>
              <input
                {...checkboxProps}
                type="checkbox"
                name={field.name}
                ref={field.ref}
                checked={Boolean(field.value)}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            </FormControl>
            <FormLabel className="font-semibold">{label}</FormLabel>
          </div>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
