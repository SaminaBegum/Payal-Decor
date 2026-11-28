const pool = require("../config/db");

/* ------------------------------------------------------------------ *
 * SCHEMA MAP - taken from your model files.
 * A missing table or wrong column does NOT crash the dashboard: that
 * section returns empty and the error is printed in the backend console.
 * ------------------------------------------------------------------ */
const SCHEMA = {
  quotations: {
    table: "quotations",
    date: "createdAt",
    amount: "grandTotal",
    number: "quotationNo",
    customer: "customerName",
  },
  invoices: {
    table: "Invoice",
    date: "invoiceDate",
    amount: "grandTotal",
    balance: "balance",
    number: "invoiceNo",
    customer: "billToName",
    due: "invoiceDate", // no due-date column exists, so invoice date is used
  },
  projects: {
    table: "projects",
    date: "created_at",
    name: "name",
    customer: "customer_name",
    status: "status",
    progress: "progress",
    value: "value",
  },
  leads: {
    table: "LeadEnquiry",
    date: "createdAt",
    customer: "customerName",
    requirement: "requirement",
  },
  // Uses only existing columns of public.inventory_products (module unchanged).
  products: {
    table: "inventory_products",
    category: "category",
  },
  // No sales-by-category source exists (quotation_items has no category).
  categories: null,
};

/* ------------------------------ helpers ---------------------------- */
const q = (id) => `"${String(id).replace(/"/g, '""')}"`; // identifiers come from SCHEMA only
const tbl = (name) => `public.${q(name)}`;
// Safe casts: blank or text values do not crash the query
const num = (col) => `NULLIF(${q(col)}::text, '')::numeric`;
const dt = (col) => `NULLIF(${q(col)}::text, '')::timestamp`;

async function tableExists(name) {
  const r = await pool.query(`SELECT to_regclass($1) AS t`, [`public.${q(name)}`]);
  return Boolean(r.rows[0].t);
}

async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Dashboard section "${label}" failed:`, error.message);
    return fallback;
  }
}

const pct = (cur, prev) =>
  prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null;

// Current month vs previous month, for a count or a SUM.
async function periodStats(cfg, valueCol) {
  if (!cfg || !(await tableExists(cfg.table))) return null;
  const agg = valueCol ? `SUM(${num(valueCol)})` : `COUNT(*)`;
  const d = dt(cfg.date);
  const r = await pool.query(`
    SELECT
      COALESCE(${agg} FILTER (WHERE ${d} >= date_trunc('month', NOW())), 0) AS cur,
      COALESCE(${agg} FILTER (WHERE ${d} >= date_trunc('month', NOW()) - interval '1 month'
                              AND ${d} <  date_trunc('month', NOW())), 0) AS prev,
      COALESCE(${agg}, 0) AS total
    FROM ${tbl(cfg.table)}
  `);
  const row = r.rows[0];
  return { cur: Number(row.cur), prev: Number(row.prev), total: Number(row.total) };
}

/* ------------------------------ handler ---------------------------- */
async function getDashboardSummary(req, res) {
  try {
    const S = SCHEMA;

    // ---- KPI cards ----
    const kpis = [];

    const invSales = await safe("kpi sales", () => periodStats(S.invoices, S.invoices.amount), null);
    if (invSales)
      kpis.push({ key: "sales", label: "Total Sales", kind: "money", value: invSales.total,
        delta: pct(invSales.cur, invSales.prev), compare: "vs last month" });

    const proj = await safe("kpi projects", () => periodStats(S.projects, null), null);
    if (proj)
      kpis.push({ key: "projects", label: "Total Projects", kind: "count", value: proj.total,
        delta: pct(proj.cur, proj.prev), compare: "vs last month" });

    const quo = await safe("kpi quotations", () => periodStats(S.quotations, null), null);
    if (quo)
      kpis.push({ key: "quotations", label: "Total Quotations", kind: "count", value: quo.total,
        delta: pct(quo.cur, quo.prev), compare: "vs last month" });

    const invCount = await safe("kpi invoices", () => periodStats(S.invoices, null), null);
    if (invCount)
      kpis.push({ key: "invoices", label: "Total Invoices", kind: "count", value: invCount.total,
        delta: pct(invCount.cur, invCount.prev), compare: "vs last month" });

    const outstandingTotal = await safe("kpi outstanding", async () => {
      if (!(await tableExists(S.invoices.table))) return null;
      const r = await pool.query(
        `SELECT COALESCE(SUM(${num(S.invoices.balance)}), 0) AS t FROM ${tbl(S.invoices.table)}`
      );
      return Number(r.rows[0].t);
    }, null);
    if (outstandingTotal !== null)
      kpis.push({ key: "outstanding", label: "Outstanding", kind: "money",
        value: outstandingTotal, delta: null, compare: "unpaid invoices" });

    // ---- Sales trend: last 6 months, in Lakhs ----
    const salesTrend = await safe("sales trend", async () => {
      if (!(await tableExists(S.invoices.table))) return [];
      const d = dt(S.invoices.date);
      const r = await pool.query(`
        SELECT to_char(date_trunc('month', ${d}), 'YYYY-MM') AS ym,
               SUM(${num(S.invoices.amount)}) AS total
        FROM ${tbl(S.invoices.table)}
        WHERE ${d} >= date_trunc('month', NOW()) - interval '5 months'
        GROUP BY ym
      `);
      const byMonth = new Map(r.rows.map((x) => [x.ym, Number(x.total)]));
      const out = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
        out.push({
          month: m.toLocaleString("en-US", { month: "short" }),
          sales: Math.round(((byMonth.get(key) || 0) / 100000) * 100) / 100,
        });
      }
      return out;
    }, []);

    // ---- Sales by category (no source yet) ----
    const salesByCategory = await safe("sales by category", async () => {
      const c = S.categories;
      if (!c || !(await tableExists(c.table))) return [];
      const r = await pool.query(`
        SELECT ${q(c.category)} AS name, SUM(${num(c.amount)}) AS amount
        FROM ${tbl(c.table)} GROUP BY 1 ORDER BY 2 DESC LIMIT 6
      `);
      const total = r.rows.reduce((s, x) => s + Number(x.amount), 0);
      return r.rows.map((x) => ({
        name: x.name || "Other",
        amount: Number(x.amount),
        value: total > 0 ? Math.round((Number(x.amount) / total) * 1000) / 10 : 0,
      }));
    }, []);

    // ---- Top projects ----
    const topProjects = await safe("top projects", async () => {
      const p = S.projects;
      if (!(await tableExists(p.table))) return [];
      const r = await pool.query(`
        SELECT ${q(p.name)} AS name, ${q(p.customer)} AS customer, ${q(p.status)}::text AS status,
               COALESCE(${q(p.progress)}, 0) AS progress, COALESCE(${q(p.value)}, 0) AS value
        FROM ${tbl(p.table)} ORDER BY ${q(p.value)} DESC NULLS LAST LIMIT 5
      `);
      return r.rows.map((x) => ({
        name: x.name,
        customer: x.customer || "",
        status: ["Completed", "Pending"].includes(x.status) ? x.status : "In Progress",
        progress: Math.min(100, Math.max(0, Number(x.progress))),
        value: Number(x.value),
      }));
    }, []);

    // ---- Inventory: product count per category (no stock column exists) ----
    const inventorySummary = await safe("inventory", async () => {
      const p = S.products;
      if (!p || !(await tableExists(p.table))) return [];
      const r = await pool.query(`
        SELECT COALESCE(NULLIF(${q(p.category)}, ''), 'Uncategorised') AS item,
               COUNT(*) AS cnt
        FROM ${tbl(p.table)}
        GROUP BY 1
        ORDER BY cnt DESC, item ASC
        LIMIT 6
      `);
      return r.rows.map((x) => ({
        item: x.item,
        qty: `${Number(x.cnt)} ${Number(x.cnt) === 1 ? "item" : "items"}`,
        status: null,
      }));
    }, []);

    // ---- Outstanding invoices: oldest unpaid first ----
    const outstandingInvoices = await safe("outstanding invoices", async () => {
      const i = S.invoices;
      if (!(await tableExists(i.table))) return [];
      const r = await pool.query(`
        SELECT ${q(i.number)} AS no, ${q(i.customer)} AS customer,
               to_char(${dt(i.due)}, 'YYYY-MM-DD') AS due, ${num(i.balance)} AS amount
        FROM ${tbl(i.table)}
        WHERE ${num(i.balance)} > 0
        ORDER BY ${dt(i.due)} ASC NULLS LAST LIMIT 5
      `);
      return r.rows.map((x) => ({
        no: x.no,
        customer: x.customer || "",
        due: x.due || null,
        amount: Number(x.amount),
      }));
    }, []);

    // ---- Recent activity: newest leads + quotations ----
    const activities = await safe("activities", async () => {
      const items = [];
      if (await tableExists(S.leads.table)) {
        const r = await pool.query(`
          SELECT id, ${q(S.leads.customer)} AS customer, ${q(S.leads.requirement)} AS detail,
                 ${q(S.leads.date)} AS at
          FROM ${tbl(S.leads.table)} ORDER BY ${q(S.leads.date)} DESC LIMIT 4
        `);
        r.rows.forEach((x) =>
          items.push({ id: `lead-${x.id}`, kind: "quotation", title: "New lead enquiry",
            detail: [x.customer, x.detail].filter(Boolean).join(" - "), at: x.at })
        );
      }
      if (await tableExists(S.quotations.table)) {
        const r = await pool.query(`
          SELECT ${q(S.quotations.number)} AS no, ${q(S.quotations.customer)} AS customer,
                 ${q(S.quotations.date)} AS at
          FROM ${tbl(S.quotations.table)} ORDER BY ${q(S.quotations.date)} DESC LIMIT 4
        `);
        r.rows.forEach((x, idx) =>
          items.push({ id: `quo-${x.no}-${idx}`, kind: "quotation", title: "New Quotation created",
            detail: [x.no, x.customer].filter(Boolean).join(" - "), at: x.at })
        );
      }
      return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
    }, []);

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      kpis,
      salesTrend,
      salesByCategory,
      topProjects,
      inventorySummary,
      outstandingInvoices,
      activities,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ success: false, message: "Unable to load dashboard data." });
  }
}

module.exports = { getDashboardSummary };