"use client";

import {
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
import type { ComponentProps, ReactNode } from "react";
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
