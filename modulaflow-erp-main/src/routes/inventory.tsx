import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Package, Image as ImageIcon, Upload, X, Save, Pencil, Trash2,
  FileSpreadsheet, Plus, RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { AppShell } from "@/components/erp/AppShell";
import { NUM } from "@/lib/erp/units";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

/**
 * image: undefined = unchanged on server, string = new image (data URL), null = removed.
 * The server list never sends images; it sends hasImage + imageVer and the
 * browser loads each picture lazily from /inventory-products/:srNo/image.
 */
type Product = {
  srNo: string;
  itemName: string;
  dimension: string;
  price: number;
  category: string;
  series: string;
  hasImage?: boolean;
  imageVer?: number;
  image?: string | null;
};

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const PAGE_SIZE = 40;

const EMPTY_FORM = { srNo: "", itemName: "", dimension: "", price: "", category: "", series: "" };

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const labelCls = "mb-1.5 block text-sm font-semibold";

const bySrNo = (a: Product, b: Product) =>
  a.srNo.localeCompare(b.srNo, undefined, { numeric: true });

const imageUrl = (p: Product) =>
  p.image ||
  (p.hasImage
    ? `${API_URL}/inventory-products/${encodeURIComponent(p.srNo)}/image?v=${p.imageVer ?? 0}`
    : undefined);

/** What is sent to the server (image only when it changed). */
const toPayload = (p: Product) => ({
  srNo: p.srNo,
  itemName: p.itemName,
  dimension: p.dimension,
  price: p.price,
  category: p.category,
  series: p.series,
  ...(p.image !== undefined ? { image: p.image } : {}),
});

/* ------------------------------------------------------------------ */
/*  API                                                                */
/* ------------------------------------------------------------------ */

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}));
  return body?.message || `Server returned ${res.status}`;
}

const inventoryApi = {
  async list(): Promise<Product[]> {
    const res = await fetch(`${API_URL}/inventory-products`);
    if (!res.ok) throw new Error(await readError(res));
    const body = await res.json();
    return Array.isArray(body) ? body : (body.data ?? []);
  },

  async sync(upserts: Product[], deletes: string[]) {
    const res = await fetch(`${API_URL}/inventory-products/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upserts: upserts.map(toPayload), deletes }),
    });
    if (!res.ok) throw new Error(await readError(res));
  },
};

/* ------------------------------------------------------------------ */
/*  Image helpers                                                      */
/* ------------------------------------------------------------------ */

function fileToDataUrl(file: Blob, max = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("invalid image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Read images embedded in an .xlsx                                   */
/* ------------------------------------------------------------------ */

const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
};

const xmlDoc = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const byLocal = (root: Document | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS("*", name));

function resolvePath(base: string, target: string) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = base.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

async function readRels(zip: JSZip, path: string): Promise<Record<string, string>> {
  const dir = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop();
  const f = zip.file(`${dir}/_rels/${name}.rels`);
  const map: Record<string, string> = {};
  if (!f) return map;
  const doc = xmlDoc(await f.async("string"));
  for (const r of byLocal(doc, "Relationship")) {
    map[r.getAttribute("Id") ?? ""] = resolvePath(path, r.getAttribute("Target") ?? "");
  }
  return map;
}

async function readSheetImages(buf: ArrayBuffer, sheetName: string): Promise<Map<number, Blob>> {
  const out = new Map<number, Blob>();
  try {
    const zip = await JSZip.loadAsync(buf);
    const wbDoc = xmlDoc(await zip.file("xl/workbook.xml")!.async("string"));
    const wbRels = await readRels(zip, "xl/workbook.xml");
    const sheetEl = byLocal(wbDoc, "sheet").find((s) => s.getAttribute("name") === sheetName);
    const rid = sheetEl?.getAttributeNS(REL_NS, "id");
    const sheetPath = rid ? wbRels[rid] : undefined;
    if (!sheetPath) return out;

    const sheetRels = await readRels(zip, sheetPath);
    const sheetDoc = xmlDoc(await zip.file(sheetPath)!.async("string"));
    const drId = byLocal(sheetDoc, "drawing")[0]?.getAttributeNS(REL_NS, "id");
    const drawingPath = drId ? sheetRels[drId] : undefined;
    if (!drawingPath) return out;

    const drawRels = await readRels(zip, drawingPath);
    const drawDoc = xmlDoc(await zip.file(drawingPath)!.async("string"));
    const anchors = [...byLocal(drawDoc, "oneCellAnchor"), ...byLocal(drawDoc, "twoCellAnchor")];

    for (const a of anchors) {
      const from = byLocal(a, "from")[0];
      const rowText = from ? byLocal(from, "row")[0]?.textContent : null;
      const embed = byLocal(a, "blip")[0]?.getAttributeNS(REL_NS, "embed");
      const mediaPath = embed ? drawRels[embed] : undefined;
      if (rowText == null || !mediaPath) continue;

      const row = Number(rowText);
      if (out.has(row)) continue;
      const media = zip.file(mediaPath);
      if (!media) continue;

      const ext = mediaPath.split(".").pop()!.toLowerCase();
      const bytes = await media.async("uint8array");
      out.set(row, new Blob([bytes as unknown as BlobPart], { type: MIME[ext] ?? "image/png" }));
    }
  } catch {
    /* images are optional */
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Thumbnail: tap = zoom (or upload if empty)                         */
/* ------------------------------------------------------------------ */

function ProductImage({
  src,
  alt,
  onPick,
  onRemove,
}: {
  src?: string;
  alt: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [src]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const shown = src && !broken ? src : undefined;

  return (
    <div className="group relative mx-auto h-16 w-16 shrink-0 md:h-14">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => (shown ? setZoom(true) : inputRef.current?.click())}
        title={shown ? "Tap to zoom" : "Tap to upload image"}
        aria-label={shown ? `Zoom image of ${alt}` : `Upload image for ${alt}`}
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary",
          shown ? "cursor-zoom-in" : "cursor-pointer",
        )}
      >
        {shown ? (
          <img
            src={shown}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="h-full w-full bg-white object-contain"
          />
        ) : (
          <span className="flex flex-col items-center">
            <ImageIcon size={20} />
            <span className="mt-0.5 text-[10px]">Upload</span>
          </span>
        )}
      </button>

      {shown && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Change image"
            aria-label="Change image"
            className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white opacity-100 md:h-5 md:w-5 md:opacity-0 md:group-hover:opacity-100"
          >
            <Upload size={13} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove image"
            aria-label="Remove image"
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white opacity-100 md:h-4 md:w-4 md:opacity-0 md:group-hover:opacity-100"
          >
            <X size={12} />
          </button>
        </>
      )}

      {zoom && shown && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 p-4"
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={shown}
              alt={alt}
              className="max-h-[75vh] max-w-[92vw] rounded-xl bg-white object-contain shadow-2xl"
            />
            <p className="mt-3 text-center text-sm font-medium text-white">{alt}</p>
            <button
              type="button"
              onClick={() => setZoom(false)}
              aria-label="Close"
              className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverOk, setServerOk] = useState(false);

  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("All");
  const [category, setCategory] = useState("All");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formImage, setFormImage] = useState<string | null | undefined>(undefined);
  const [editingSrNo, setEditingSrNo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const formRef = useRef<HTMLElement>(null);
  const formImageRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const syncedRef = useRef<Map<string, string>>(new Map());

  /* ---------- load ---------- */
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const server = await inventoryApi.list();
      server.sort(bySrNo);
      syncedRef.current = new Map(server.map((p) => [p.srNo, JSON.stringify(p)]));
      setProducts(server);
      setServerOk(true);
    } catch (err) {
      setServerOk(false);
      const reason = err instanceof Error ? err.message : "Unknown error";
      setError(`Could not load products (${reason}). Check that the backend is running.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  /* ---------- auto-save changed rows ---------- */
  useEffect(() => {
    if (loading || !serverOk) return;

    const current = new Map(products.map((p) => [p.srNo, JSON.stringify(p)]));
    const upserts = products.filter((p) => syncedRef.current.get(p.srNo) !== current.get(p.srNo));
    const deletes = [...syncedRef.current.keys()].filter((k) => !current.has(k));
    if (upserts.length === 0 && deletes.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        await inventoryApi.sync(upserts, deletes);
        syncedRef.current = current;
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Unknown error";
        setError(`Changes were not saved (${reason}). Try again.`);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [products, loading, serverOk]);

  /* ---------- filters ---------- */
  const seriesList = useMemo(
    () => [...new Set(products.map((p) => p.series).filter(Boolean))].sort(),
    [products],
  );

  const categories = useMemo(
    () =>
      [
        ...new Set(
          products
            .filter((p) => seriesFilter === "All" || p.series === seriesFilter)
            .map((p) => p.category)
            .filter(Boolean),
        ),
      ],
    [products, seriesFilter],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (seriesFilter !== "All" && p.series !== seriesFilter) return false;
      if (category !== "All" && p.category !== category) return false;
      if (!query) return true;
      return (
        p.srNo.toLowerCase().includes(query) ||
        p.itemName.toLowerCase().includes(query) ||
        (p.dimension ?? "").toLowerCase().includes(query) ||
        (p.category ?? "").toLowerCase().includes(query) ||
        (p.series ?? "").toLowerCase().includes(query) ||
        String(p.price).includes(query)
      );
    });
  }, [products, search, seriesFilter, category]);

  useEffect(() => setVisible(PAGE_SIZE), [search, seriesFilter, category]);

  const shownProducts = filteredProducts.slice(0, visible);

  /* ---------- form helpers ---------- */
  const editing = editingSrNo ? products.find((p) => p.srNo === editingSrNo) : undefined;
  const formPreview = formImage ? formImage : formImage === undefined && editing ? imageUrl(editing) : undefined;

  const scrollToForm = () =>
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
    setMessage("");
  };

  const clearForm = () => {
    setForm(EMPTY_FORM);
    setFormImage(undefined);
    setEditingSrNo(null);
    setError("");
    setMessage("");
  };

  const openForm = () => {
    clearForm();
    setForm({ ...EMPTY_FORM, series: seriesFilter !== "All" ? seriesFilter : "" });
    setShowForm(true);
    scrollToForm();
  };

  const closeForm = () => {
    clearForm();
    setShowForm(false);
  };

  const pickImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG or JPG).");
      return null;
    }
    try {
      return await fileToDataUrl(file);
    } catch {
      setError("The image could not be loaded.");
      return null;
    }
  };

  /* ---------- add / edit / delete ---------- */
  const saveProduct = () => {
    const srNo = form.srNo.trim();
    const itemName = form.itemName.trim();
    const price = Number(form.price);

    if (!srNo || !itemName || form.price === "" || Number.isNaN(price) || price < 0) {
      setError("Sr.No, Item Name and a valid Price are required.");
      return;
    }
    if (srNo !== editingSrNo && products.some((p) => p.srNo === srNo)) {
      setError(`Sr.No ${srNo} already exists. Use a different Sr.No.`);
      return;
    }

    const item: Product = {
      srNo,
      itemName,
      dimension: form.dimension.trim(),
      price,
      category: form.category.trim() || "Uncategorised",
      series: form.series.trim() || "General",
      hasImage: Boolean(formPreview),
      imageVer: editing?.imageVer,
      image: formImage,
    };

    setProducts((prev) =>
      (editingSrNo ? prev.map((p) => (p.srNo === editingSrNo ? item : p)) : [...prev, item]).sort(bySrNo),
    );
    setMessage(editingSrNo ? `${srNo} updated.` : `${srNo} saved.`);
    closeFormKeepMessage();
  };

  const closeFormKeepMessage = () => {
    setForm(EMPTY_FORM);
    setFormImage(undefined);
    setEditingSrNo(null);
    setError("");
    setShowForm(false);
  };

  const editProduct = (p: Product) => {
    setForm({
      srNo: p.srNo,
      itemName: p.itemName,
      dimension: p.dimension ?? "",
      price: String(p.price),
      category: p.category ?? "",
      series: p.series ?? "",
    });
    setFormImage(undefined);
    setEditingSrNo(p.srNo);
    setError("");
    setMessage("");
    setShowForm(true);
    scrollToForm();
  };

  const deleteProduct = (p: Product) => {
    if (!confirm(`Delete "${p.itemName}" (${p.srNo})?`)) return;
    setProducts((prev) => prev.filter((x) => x.srNo !== p.srNo));
    if (editingSrNo === p.srNo) closeForm();
  };

  const setRowImage = async (srNo: string, file: File) => {
    const url = await pickImage(file);
    if (url)
      setProducts((prev) =>
        prev.map((p) => (p.srNo === srNo ? { ...p, image: url, hasImage: true } : p)),
      );
  };

  const removeRowImage = (srNo: string) =>
    setProducts((prev) =>
      prev.map((p) => (p.srNo === srNo ? { ...p, image: null, hasImage: false } : p)),
    );

  /* ---------- Excel export ---------- */
  const exportExcel = () => {
    if (products.length === 0) {
      setError("There are no products to export.");
      return;
    }
    const rows = products.map((p) => ({
      "Sr.No": p.srNo,
      "Item Name": p.itemName,
      "Dimension (mm)": p.dimension,
      "Price (₹)": p.price,
      Series: p.series,
      Category: p.category,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 10 }, { wch: 44 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 42 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Products");
    XLSX.writeFile(book, "Product_Catalogue.xlsx");
    setError("");
    setMessage(`${products.length} products exported to Excel.`);
  };

  /* ---------- Excel import ---------- */
  const importExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const book = XLSX.read(buf, { type: "array" });
      const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");

      const colIndex = (h: string[], exact: string[], starts: string[], not: string[] = []) => {
        for (const e of exact) {
          const i = h.indexOf(e);
          if (i >= 0) return i;
        }
        return h.findIndex(
          (x) => starts.some((s) => x.startsWith(s)) && !not.some((n) => x.startsWith(n)),
        );
      };

      let grid: unknown[][] = [];
      let headerAt = -1;
      let foundSheet = "";
      let col = { sr: -1, name: -1, dim: -1, price: -1, cat: -1, series: -1 };

      for (const sheetName of book.SheetNames) {
        const g = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], {
          header: 1,
          defval: "",
          raw: false,
        });
        for (let r = 0; r < Math.min(g.length, 30); r++) {
          const h = g[r].map(norm);
          const c = {
            sr: colIndex(h, ["srno"], ["srno"]),
            name: colIndex(h, ["itemname"], ["itemname"]),
            dim: colIndex(
              h,
              ["dimension", "dimensions"],
              ["dimension", "sizemm", "sizewidth"],
              ["dimensiontype"],
            ),
            price: colIndex(h, ["price"], ["price", "rate"]),
            cat: colIndex(h, ["category"], ["category"]),
            series: colIndex(h, ["series"], ["series"]),
          };
          if (c.sr >= 0 && c.name >= 0 && c.price >= 0) {
            grid = g;
            headerAt = r;
            col = c;
            foundSheet = sheetName;
            break;
          }
        }
        if (headerAt >= 0) break;
      }

      if (headerAt < 0) {
        setMessage("");
        setError("The Excel file needs Sr.No, Item Name and Price (or Rate) column headings.");
        return;
      }

      const firstRow = XLSX.utils.decode_range(book.Sheets[foundSheet]["!ref"] ?? "A1").s.r;
      const sheetImages = await readSheetImages(buf, foundSheet);
      const cell = (row: unknown[], i: number) => (i >= 0 ? String(row[i] ?? "").trim() : "");

      const next = [...products];
      const seen = new Set<string>();
      let added = 0, updated = 0, skipped = 0, duplicates = 0, withImage = 0;
      let group = "";

      for (let r = headerAt + 1; r < grid.length; r++) {
        const row = grid[r];
        const srNo = cell(row, col.sr);
        const itemName = cell(row, col.name);
        const priceText = cell(row, col.price).replace(/[^0-9.]/g, "");

        if (!srNo && !itemName && !priceText) continue;

        if (priceText === "") {
          if (srNo.includes(".") && itemName) skipped++;
          else if (srNo && itemName) group = itemName;
          continue;
        }

        const price = Number(priceText);
        if (!srNo || !itemName || Number.isNaN(price)) {
          skipped++;
          continue;
        }

        if (seen.has(srNo)) duplicates++;
        seen.add(srNo);

        const dimension = cell(row, col.dim);
        const cat = cell(row, col.cat) || group;
        const ser = cell(row, col.series);

        let image: string | undefined;
        const blob = sheetImages.get(firstRow + r);
        if (blob) {
          try {
            image = await fileToDataUrl(blob, 240);
            withImage++;
          } catch {
            /* skip bad image */
          }
        }

        const idx = next.findIndex((p) => p.srNo === srNo);
        if (idx >= 0) {
          const old = next[idx];
          next[idx] = {
            ...old,
            itemName,
            dimension,
            price,
            category: cat || old.category,
            series: ser || old.series,
            ...(image ? { image, hasImage: true } : {}),
          };
          updated++;
        } else {
          next.push({
            srNo, itemName, dimension, price,
            category: cat || "Uncategorised",
            series: ser || "General",
            hasImage: Boolean(image),
            image,
          });
          added++;
        }
      }

      setProducts(next.sort(bySrNo));
      setError("");
      setMessage(
        `Import done: ${added} new, ${updated} updated, ${withImage} images` +
        (skipped ? `, ${skipped} rows skipped` : "") +
        (duplicates ? `. Warning: ${duplicates} repeated Sr.No rows were overwritten` : "") +
        ".",
      );
    } catch {
      setMessage("");
      setError("The Excel file could not be read. Use an .xlsx or .csv file.");
    }
  };

  /* ---------- render ---------- */
  const rowActions = (product: Product) => (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => editProduct(product)}
        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 md:h-9 md:flex-none"
      >
        <Pencil size={14} />
        Edit
      </button>
      <button
        type="button"
        onClick={() => deleteProduct(product)}
        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 md:h-9 md:flex-none"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );

  const thumb = (product: Product) => (
    <ProductImage
      src={imageUrl(product)}
      alt={product.itemName}
      onPick={(f) => void setRowImage(product.srNo, f)}
      onRemove={() => removeRowImage(product.srNo)}
    />
  );

  return (
    <AppShell title="Inventory">
      {showForm && (
        <section
          ref={formRef}
          className="mb-5 scroll-mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Package size={20} />
            {editingSrNo ? `Edit Product - ${editingSrNo}` : "Add Product"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="p-srno">Sr.No</label>
              <input
                id="p-srno"
                value={form.srNo}
                disabled={Boolean(editingSrNo)}
                onChange={(e) => setField("srNo", e.target.value)}
                placeholder="e.g. RK-1.1"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="p-name">Item Name</label>
              <input
                id="p-name"
                value={form.itemName}
                onChange={(e) => setField("itemName", e.target.value)}
                placeholder="e.g. Elite C Side Leg - 600"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="p-series">Series</label>
              <input
                id="p-series"
                list="series-list"
                value={form.series}
                onChange={(e) => setField("series", e.target.value)}
                placeholder="e.g. Rock"
                className={inputCls}
              />
              <datalist id="series-list">
                {seriesList.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>

            <div>
              <label className={labelCls} htmlFor="p-cat">Category</label>
              <input
                id="p-cat"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="e.g. Side Legs"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="p-dim">Dimension</label>
              <input
                id="p-dim"
                value={form.dimension}
                onChange={(e) => setField("dimension", e.target.value)}
                placeholder="e.g. 590X725"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="p-price">Price (₹)</label>
              <input
                id="p-price"
                type="number"
                inputMode="decimal"
                min={0}
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="e.g. 2850"
                className={inputCls}
              />
            </div>

            <div className="md:col-span-2">
              <span className={labelCls}>Image</span>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={formImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const url = await pickImage(file);
                    if (url) setFormImage(url);
                  }}
                />
                <button
                  type="button"
                  onClick={() => formImageRef.current?.click()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium hover:border-primary hover:text-primary"
                >
                  <Upload size={16} />
                  {formPreview ? "Change image" : "Choose image"}
                </button>

                {formPreview && (
                  <div className="relative">
                    <img
                      src={formPreview}
                      alt="Preview"
                      className="h-14 w-16 rounded-md border border-border bg-white object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormImage(null)}
                      aria-label="Remove image"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={saveProduct}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Save size={18} />
              {editingSrNo ? "Update Product" : "Save Product"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="h-11 rounded-xl border border-border bg-background px-6 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>

            {error && <span className="text-sm font-medium text-destructive">{error}</span>}
          </div>
        </section>
      )}

      {!showForm && (error || message) && (
        <div
          role={error ? "alert" : "status"}
          className={cn(
            "mb-3 flex flex-wrap items-center gap-3 px-1 text-sm font-medium",
            error ? "text-destructive" : "text-success",
          )}
        >
          <span>{error || message}</span>
          {error && !serverOk && (
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <header className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Product Catalogue</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{filteredProducts.length}</span> of{" "}
              {products.length} products
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
            <div className="grid grid-cols-3 gap-2 xl:flex xl:gap-3">
              <button
                type="button"
                onClick={openForm}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 xl:px-5"
              >
                <Plus size={18} />
                Add
              </button>

              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void importExcel(file);
                }}
              />

              <button
                type="button"
                onClick={() => importRef.current?.click()}
                disabled={!serverOk}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-medium hover:border-primary hover:text-primary disabled:opacity-50 xl:px-4"
              >
                <Upload size={16} />
                Import
              </button>

              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 text-sm font-semibold text-white hover:bg-green-700 xl:px-4"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
            </div>

            <div className="relative w-full xl:w-72">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, size, price..."
                aria-label="Search products"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 xl:flex xl:gap-3">
              <select
                value={seriesFilter}
                onChange={(e) => {
                  setSeriesFilter(e.target.value);
                  setCategory("All");
                }}
                aria-label="Filter by series"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary xl:w-44"
              >
                <option value="All">All Series</option>
                {seriesList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary xl:w-56"
              >
                <option value="All">All Categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* ---------- phones: cards ---------- */}
        <ul className="divide-y divide-border border-t border-border md:hidden">
          {loading ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">Loading products...</li>
          ) : shownProducts.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              {products.length === 0
                ? "No products yet. Add one or import an Excel file."
                : "No products found. Try another search."}
            </li>
          ) : (
            shownProducts.map((product) => (
              <li
                key={product.srNo}
                className={cn("flex gap-3 p-4", editingSrNo === product.srNo && "bg-primary/5")}
              >
                {thumb(product)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{product.srNo}</span>
                    <span className="tabular text-sm font-bold">₹ {NUM.format(product.price)}</span>
                  </div>
                  <p className="mt-0.5 break-words font-medium leading-snug">{product.itemName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {product.dimension || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.series} / {product.category}
                  </p>
                  <div className="mt-3">{rowActions(product)}</div>
                </div>
              </li>
            ))
          )}
        </ul>

        {/* ---------- tablet / desktop: table ---------- */}
        <div className="hidden max-h-[640px] overflow-auto px-6 pb-2 md:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted text-left">
                <th className="rounded-l-lg px-4 py-3 font-semibold">Sr.No</th>
                <th className="px-4 py-3 font-semibold">Item Name</th>
                <th className="px-4 py-3 font-semibold">Dimension</th>
                <th className="px-4 py-3 text-right font-semibold">Price (₹)</th>
                <th className="px-4 py-3 text-center font-semibold">Image</th>
                <th className="rounded-r-lg px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Loading products...
                  </td>
                </tr>
              ) : shownProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {products.length === 0
                      ? "No products yet. Add one or import an Excel file."
                      : "No products found. Try another search."}
                  </td>
                </tr>
              ) : (
                shownProducts.map((product) => (
                  <tr
                    key={product.srNo}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/30",
                      editingSrNo === product.srNo && "bg-primary/5",
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{product.srNo}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.itemName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {product.series} / {product.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.dimension || "-"}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      {NUM.format(product.price)}
                    </td>
                    <td className="px-4 py-3 text-center">{thumb(product)}</td>
                    <td className="px-4 py-3">{rowActions(product)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredProducts.length > visible && (
          <div className="flex justify-center border-t border-border p-4">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="h-11 rounded-xl border border-border bg-background px-6 text-sm font-medium hover:border-primary hover:text-primary"
            >
              Show more ({filteredProducts.length - visible} left)
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default Inventory;