import { randomUUID } from "node:crypto";

import { db, products } from "@babascamera/db";
import ExcelJS from "exceljs";

import { parseMoney } from "@/lib/money";
import { sanitizeProductDescription } from "@/lib/security/rich-text";
import { optionalText, slugify } from "@/lib/utils";
import { getProductCatalogPageForExport } from "@/features/catalog/server/readers";
import {
  productImportHeaders,
  requiredProductImportHeaders,
  type RawProductImportRow,
} from "@/features/catalog/schemas/product-import";
import type {
  ProductImportPreview,
  ProductImportResult,
  ProductImportRowError,
} from "@/features/catalog/types";
import type { ProductListQuery } from "@/features/catalog/types";
import type { ProductExportRow } from "@/features/catalog/types";

const maxImportBytes = 2 * 1024 * 1024;
const moneyPattern = /^\d+(?:\.\d{1,2})?$/;
const integerPattern = /^\d+$/;

interface ProductImportLookup {
  categoriesByName: Map<string, { id: string; name: string }>;
  brandsByName: Map<string, { id: string; name: string }>;
  existingSkus: Set<string>;
  existingSlugs: Set<string>;
}

interface ValidProductImportRow {
  rowNumber: number;
  values: typeof products.$inferInsert;
}

interface ProductImportValidation {
  preview: ProductImportPreview;
  validRows: ValidProductImportRow[];
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

function cellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("formula" in value) {
      const formulaValue = value as ExcelJS.CellFormulaValue;
      return cellText(formulaValue.result as ExcelJS.CellValue);
    }
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    return "";
  }
  return String(value).trim();
}

function parseBoolean(value: string, fallback: boolean) {
  const normalized = normalizeLookup(value);
  if (!normalized) return { value: fallback };
  if (["yes", "true", "1", "y"].includes(normalized)) return { value: true };
  if (["no", "false", "0", "n"].includes(normalized)) return { value: false };
  return { error: "Use yes/no, true/false, or 1/0." };
}

function parseOptionalMoneyField(value: string, label: string) {
  if (!value) return { value: null };
  if (!moneyPattern.test(value)) return { error: `${label} must be a valid amount.` };
  try {
    return { value: parseMoney(value).decimal };
  } catch {
    return { error: `${label} must be a valid amount.` };
  }
}

function parseRequiredMoneyField(value: string, label: string) {
  if (!value) return { error: `${label} is required.` };
  return parseOptionalMoneyField(value, label);
}

function uniqueSlug(name: string, reservedSlugs: Set<string>) {
  const base = slugify(name) || "product";
  let candidate = base;
  let suffix = 2;
  while (reservedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  reservedSlugs.add(candidate);
  return candidate;
}

function generatedProductSku(name: string) {
  const base = slugify(name)
    .replaceAll("-", "")
    .slice(0, 32)
    .toUpperCase() || "PRODUCT";
  return `AUTO-${base}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function errorRow(rowNumber: number, row: RawProductImportRow, errors: string[]): ProductImportRowError {
  return {
    rowNumber,
    sku: row.sku,
    name: row.name,
    errors,
  };
}

export function validateRawProductImportRows(
  rows: { rowNumber: number; row: RawProductImportRow }[],
  lookup: ProductImportLookup,
): ProductImportValidation {
  const errors: ProductImportRowError[] = [];
  const validRows: ValidProductImportRow[] = [];
  const fileSkus = new Set<string>();
  const reservedSlugs = new Set(lookup.existingSlugs);

  for (const { rowNumber, row } of rows) {
    const rowErrors: string[] = [];
    const name = row.name.trim();
    const sku = row.sku.trim();
    const categoryName = row.category.trim();
    const brandName = row.brand.trim();

    if (!name) rowErrors.push("Name is required.");
    if (!categoryName) rowErrors.push("Category is required.");

    const skuKey = normalizeLookup(sku);
    if (skuKey) {
      if (fileSkus.has(skuKey)) rowErrors.push("SKU is duplicated in this file.");
      fileSkus.add(skuKey);
      if (lookup.existingSkus.has(skuKey)) rowErrors.push("SKU already exists.");
    }

    const category = lookup.categoriesByName.get(normalizeLookup(categoryName));
    if (categoryName && !category) rowErrors.push("Category does not exist.");
    const brand = brandName ? lookup.brandsByName.get(normalizeLookup(brandName)) : null;
    if (brandName && !brand) rowErrors.push("Brand does not exist.");

    const mrp = parseRequiredMoneyField(row.mrp, "MRP");
    if (mrp.error) rowErrors.push(mrp.error);
    const salePrice = parseRequiredMoneyField(row.sale_price, "Sale price");
    if (salePrice.error) rowErrors.push(salePrice.error);
    if (mrp.value && salePrice.value && parseMoney(salePrice.value).paise > parseMoney(mrp.value).paise) {
      rowErrors.push("Sale price cannot exceed MRP.");
    }

    if (!row.stock) rowErrors.push("Stock is required.");
    if (row.stock && !integerPattern.test(row.stock)) rowErrors.push("Stock must be a non-negative integer.");
    if (row.low_stock_threshold && !integerPattern.test(row.low_stock_threshold)) {
      rowErrors.push("Low-stock threshold must be a non-negative integer.");
    }

    const gstRate = parseOptionalMoneyField(row.gst_rate, "GST percentage");
    if (gstRate.error) rowErrors.push(gstRate.error);
    if (gstRate.value !== null && gstRate.value !== undefined && Number(gstRate.value) > 100) {
      rowErrors.push("GST percentage must be between 0 and 100.");
    }
    const costPrice = parseOptionalMoneyField(row.cost_price, "Cost price");
    if (costPrice.error) rowErrors.push(costPrice.error);
    const weight = parseOptionalMoneyField(row.weight, "Weight");
    if (weight.error) rowErrors.push(weight.error);
    const shippingFee = parseOptionalMoneyField(row.shipping_fee, "Shipping fee");
    if (shippingFee.error) rowErrors.push(shippingFee.error);

    if (row.youtube_url) {
      try {
        const parsed = new URL(row.youtube_url);
        if (!["http:", "https:"].includes(parsed.protocol)) rowErrors.push("YouTube URL must use HTTP or HTTPS.");
      } catch {
        rowErrors.push("YouTube URL must be a valid HTTP or HTTPS URL.");
      }
    }

    const priceIncludesGst = parseBoolean(row.price_includes_gst, true);
    if (priceIncludesGst.error) rowErrors.push(`Price includes GST: ${priceIncludesGst.error}`);
    const active = parseBoolean(row.active, true);
    if (active.error) rowErrors.push(`Active: ${active.error}`);
    const featured = parseBoolean(row.featured, false);
    if (featured.error) rowErrors.push(`Featured: ${featured.error}`);

    if (rowErrors.length || !category || !mrp.value || !salePrice.value) {
      errors.push(errorRow(rowNumber, row, rowErrors));
      continue;
    }

    validRows.push({
      rowNumber,
      values: {
        id: randomUUID(),
        name,
        slug: uniqueSlug(name, reservedSlugs),
        sku: sku || generatedProductSku(name),
        categoryId: category.id,
        brandId: brand?.id ?? null,
        mrp: mrp.value,
        salePrice: salePrice.value,
        costPrice: costPrice.value ?? null,
        gstRate: gstRate.value ?? null,
        priceIncludesGst: priceIncludesGst.value ?? true,
        stock: Number(row.stock),
        lowStockThreshold: row.low_stock_threshold ? Number(row.low_stock_threshold) : 5,
        shortDescription: optionalText(row.short_description),
        description: sanitizeProductDescription(row.description) || null,
        youtubeUrl: optionalText(row.youtube_url),
        weight: weight.value ?? null,
        shippingFee: shippingFee.value ?? null,
        warranty: optionalText(row.warranty),
        metaTitle: optionalText(row.meta_title),
        metaDescription: optionalText(row.meta_description),
        isActive: active.value ?? true,
        isFeatured: featured.value ?? false,
      },
    });
  }

  return {
    preview: {
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: errors.length,
      errors,
    },
    validRows,
  };
}

function setupWorksheet(workbook: ExcelJS.Workbook, name: string) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = productImportHeaders.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 2),
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  return worksheet;
}

async function workbookBuffer(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildProductSampleWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Baba's Camera Admin";
  const worksheet = setupWorksheet(workbook, "Product import sample");
  const notes = workbook.addWorksheet("Import notes");
  notes.columns = [
    { header: "Field", key: "field", width: 24 },
    { header: "Required", key: "required", width: 12 },
    { header: "Notes", key: "notes", width: 72 },
  ];
  notes.getRow(1).font = { bold: true };
  notes.addRows([
    { field: "name", required: "yes", notes: "Product name shown in admin and storefront." },
    { field: "sku", required: "no", notes: "Leave blank to generate a unique internal SKU automatically." },
    { field: "category", required: "yes", notes: "Must match an existing category name." },
    { field: "brand", required: "no", notes: "Must match an existing brand name when provided. Leave blank for no brand." },
    { field: "mrp", required: "yes", notes: "INR amount with up to two decimals. Example: 72500.00." },
    { field: "sale_price", required: "yes", notes: "Cannot exceed MRP." },
    { field: "cost_price", required: "no", notes: "Internal optional DB field. Leave blank if not used." },
    { field: "stock", required: "yes", notes: "Non-negative whole number." },
    { field: "gst_rate", required: "no", notes: "0 to 100 when provided." },
    { field: "price_includes_gst", required: "no", notes: "Use yes/no, true/false, or 1/0. Defaults to yes." },
    { field: "active", required: "no", notes: "Defaults to yes." },
    { field: "featured", required: "no", notes: "Defaults to no." },
  ]);
  worksheet.addRows([
    {
      name: "Canon EOS R50 Body",
      sku: "",
      category: "Cameras",
      brand: "Canon",
      mrp: "72500.00",
      sale_price: "68990.00",
      stock: "8",
      short_description: "Compact mirrorless camera body.",
      description: "Beginner-friendly mirrorless body with fast autofocus.",
      youtube_url: "https://www.youtube.com/watch?v=example",
      gst_rate: "18",
      price_includes_gst: "yes",
      low_stock_threshold: "2",
      weight: "0.38",
      shipping_fee: "0.00",
      warranty: "2-year manufacturer warranty.",
      meta_title: "Canon EOS R50 Body",
      meta_description: "Shop Canon EOS R50 camera body.",
      active: "yes",
      featured: "no",
    },
    {
      name: "Sony 50mm f/1.8 Lens",
      sku: "SONY-50-18",
      category: "Lenses",
      brand: "Sony",
      mrp: "24990.00",
      sale_price: "21990.00",
      stock: "5",
      short_description: "Prime lens for portraits.",
      description: "Lightweight 50mm prime lens.",
      gst_rate: "18",
      price_includes_gst: "yes",
      low_stock_threshold: "1",
      active: "yes",
      featured: "yes",
    },
  ]);
  return workbookBuffer(workbook);
}

export async function buildProductExportWorkbook(query?: ProductListQuery) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Baba's Camera Admin";
  const worksheet = setupWorksheet(workbook, "Products");
  const rawRows = query
    ? await getProductCatalogPageForExport(query)
    : await db.query.products.findMany({
      with: {
        category: { columns: { id: true, name: true } },
        brand: { columns: { id: true, name: true } },
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    });
  const rows: ProductExportRow[] = rawRows.map((product) => {
    if ("categoryId" in product) {
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: {
          id: (product.categoryId ?? product.category.id) as string,
          name: (product.category.name),
        },
        brand: product.brand
          ? {
            id: product.brand.id,
            name: product.brand.name,
          }
          : null,
        mrp: product.mrp,
        salePrice: product.salePrice,
        costPrice: product.costPrice ?? "",
        stock: product.stock,
        shortDescription: product.shortDescription ?? "",
        description: product.description ?? "",
        youtubeUrl: product.youtubeUrl ?? "",
        gstRate: product.gstRate ?? "",
        priceIncludesGst: product.priceIncludesGst,
        lowStockThreshold: product.lowStockThreshold,
        weight: product.weight ?? "",
        shippingFee: product.shippingFee ?? "",
        warranty: product.warranty ?? "",
        metaTitle: product.metaTitle ?? "",
        metaDescription: product.metaDescription ?? "",
        isActive: product.isActive,
        isFeatured: product.isFeatured,
      };
    }
    return product;
  });

  worksheet.addRows(rows.map((product) => ({
    name: product.name,
    sku: product.sku,
    category: product.category.name,
    brand: product.brand?.name ?? "",
    mrp: product.mrp,
    sale_price: product.salePrice,
    cost_price: product.costPrice ?? "",
    stock: product.stock,
    short_description: product.shortDescription ?? "",
    description: product.description ?? "",
    youtube_url: product.youtubeUrl ?? "",
    gst_rate: product.gstRate ?? "",
    price_includes_gst: product.priceIncludesGst ? "yes" : "no",
    low_stock_threshold: product.lowStockThreshold,
    weight: product.weight ?? "",
    shipping_fee: product.shippingFee ?? "",
    warranty: product.warranty ?? "",
    meta_title: product.metaTitle ?? "",
    meta_description: product.metaDescription ?? "",
    active: product.isActive ? "yes" : "no",
    featured: product.isFeatured ? "yes" : "no",
  })));
  return workbookBuffer(workbook);
}

async function parseProductImportWorkbook(file: File) {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Upload an .xlsx file.");
  }
  if (file.size > maxImportBytes) {
    throw new Error("Excel file must be 2 MiB or smaller.");
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Excel file has no worksheets.");

  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = cellText(cell.value).toLowerCase();
    if (header) headers.set(header, columnNumber);
  });
  const missing = requiredProductImportHeaders.filter((header) => !headers.has(header));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}.`);
  }

  const rows: { rowNumber: number; row: RawProductImportRow }[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const excelRow = worksheet.getRow(rowNumber);
    const raw = Object.fromEntries(productImportHeaders.map((header) => {
      const column = headers.get(header);
      return [header, column ? cellText(excelRow.getCell(column).value) : ""];
    })) as RawProductImportRow;
    if (productImportHeaders.every((header) => raw[header] === "")) continue;
    rows.push({ rowNumber, row: raw });
  }
  return rows;
}

async function loadImportLookup(skus: string[]) {
  const [categoryRows, brandRows, skuRows, slugRows] = await Promise.all([
    db.query.categories.findMany({ columns: { id: true, name: true } }),
    db.query.brands.findMany({ columns: { id: true, name: true } }),
    skus.length
      ? db.query.products.findMany({
        where: (table, { inArray: inValues }) => inValues(table.sku, skus),
        columns: { sku: true },
      })
      : Promise.resolve([]),
    db.query.products.findMany({ columns: { slug: true } }),
  ]);
  return {
    categoriesByName: new Map(categoryRows.map((item) => [normalizeLookup(item.name), item])),
    brandsByName: new Map(brandRows.map((item) => [normalizeLookup(item.name), item])),
    existingSkus: new Set(skuRows.map((item) => normalizeLookup(item.sku))),
    existingSlugs: new Set(slugRows.map((item) => item.slug)),
  };
}

export async function validateProductImportFile(file: File): Promise<ProductImportPreview> {
  const rows = await parseProductImportWorkbook(file);
  const skus = rows.map(({ row }) => row.sku.trim()).filter(Boolean);
  const lookup = await loadImportLookup(skus);
  return validateRawProductImportRows(rows, lookup).preview;
}

export async function importProductExcelFile(file: File): Promise<ProductImportResult> {
  const rows = await parseProductImportWorkbook(file);
  const skus = rows.map(({ row }) => row.sku.trim()).filter(Boolean);
  const lookup = await loadImportLookup(skus);
  const validation = validateRawProductImportRows(rows, lookup);
  if (validation.preview.invalidRows > 0) {
    return { ...validation.preview, importedRows: 0 };
  }
  if (validation.validRows.length) {
    await db.insert(products).values(validation.validRows.map((row) => row.values));
  }
  return { ...validation.preview, importedRows: validation.validRows.length };
}
