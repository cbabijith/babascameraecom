"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from "@babascamera/ui";
import { Download, FileDown, MoreHorizontal, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import type { ProductImportPreview, ProductImportResult } from "@/features/catalog/types";

function isPreview(value: unknown): value is ProductImportPreview {
  return (
    typeof value === "object" &&
    value !== null &&
    "totalRows" in value &&
    "validRows" in value &&
    "invalidRows" in value &&
    "errors" in value
  );
}

export function ProductImportExportPanel({
  exportHref = "/api/admin/catalog/products/export",
  iconOnly = false,
}: {
  exportHref?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const chooseFile = () => {
    setMenuOpen(false);
    fileRef.current?.click();
  };
  const upload = (endpoint: string, selectedFile: File) => {
    const payload = new FormData();
    payload.set("file", selectedFile);
    return fetch(endpoint, { method: "POST", body: payload });
  };
  const parseJson = async (response: Response) => {
    const body: unknown = await response.json();
    const envelope = typeof body === "object" && body && "success" in body
      ? body as { success: boolean; data?: unknown; error?: { message?: string } }
      : null;
    if (!response.ok) {
      if (envelope?.data && isPreview(envelope.data)) return envelope.data;
      const message = envelope?.error?.message ?? "Excel request failed.";
      throw new Error(message);
    }
    return envelope?.success ? envelope.data : body;
  };
  const validateFile = (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(null);
    setDialogOpen(true);
    startTransition(async () => {
      try {
        const response = await upload("/api/admin/catalog/products/import/preview", selectedFile);
        const body = await parseJson(response);
        if (!isPreview(body)) throw new Error("Import preview response was invalid.");
        setPreview(body);
        if (body.invalidRows > 0) toast.error("Fix the Excel errors before importing.");
        else toast.success("Excel file is ready to import.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Excel validation failed.");
      }
    });
  };
  const importFile = () => {
    if (!file || !preview || preview.invalidRows > 0) return;
    startTransition(async () => {
      try {
        const response = await upload("/api/admin/catalog/products/import", file);
        const body = await parseJson(response);
        if (!isPreview(body)) throw new Error("Import response was invalid.");
        const result = body as ProductImportResult;
        if (result.invalidRows > 0) {
          setPreview(result);
          toast.error("Import blocked because the file has errors.");
          return;
        }
        toast.success(`${result.importedRows} products imported.`);
        setDialogOpen(false);
        setFile(null);
        setPreview(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Product import failed.");
      }
    });
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (selectedFile) validateFile(selectedFile);
        }}
      />
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Open product import and export actions"
          title="Import and export"
          className={iconOnly
            ? "grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            : "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="size-4" />
          {iconOnly ? <span className="sr-only">Import and export</span> : "Import / export"}
        </button>
        {menuOpen ? (
          <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={chooseFile}
              disabled={isPending}
            >
              <Upload className="size-4" /> {isPending ? "Checking..." : "Import products"}
            </button>
            <a
              href={exportHref}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <FileDown className="size-4" /> Export current view
            </a>
            <Link
              href="/api/admin/catalog/products/sample"
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <Download className="size-4" /> Download sample
            </Link>
          </div>
        ) : null}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import products</DialogTitle>
            <DialogDescription>Create products from Excel. SKU is optional; existing SKUs are rejected when provided.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input value={file?.name ?? ""} readOnly aria-label="Selected Excel file" />
            {preview ? (
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-slate-500">Rows</p>
                    <p className="text-lg font-semibold">{preview.totalRows}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-slate-500">Valid</p>
                    <p className="text-lg font-semibold text-emerald-700">{preview.validRows}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-slate-500">Invalid</p>
                    <p className="text-lg font-semibold text-rose-700">{preview.invalidRows}</p>
                  </div>
                </div>
                {preview.errors.length ? (
                  <div className="max-h-72 overflow-auto rounded-md border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">SKU</th>
                          <th className="p-2">Product</th>
                          <th className="p-2">Errors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.errors.map((item) => (
                          <tr key={item.rowNumber} className="border-t align-top">
                            <td className="p-2 font-medium">{item.rowNumber}</td>
                            <td className="p-2">{item.sku || "-"}</td>
                            <td className="p-2">{item.name || "-"}</td>
                            <td className="p-2 text-rose-700">{item.errors.join(" ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Validating Excel file...</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={importFile}
                disabled={isPending || !preview || preview.invalidRows > 0 || preview.validRows === 0}
              >
                {isPending ? "Importing..." : "Import products"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
