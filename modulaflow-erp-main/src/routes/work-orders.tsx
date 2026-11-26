// work-orders.tsx
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppShell } from "@/components/erp/AppShell";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

interface WorkOrderItem {
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
}

interface WorkOrder {
  id: string;
  workOrderNo: string;
  salesOrderId?: string | null;
  salesOrderNo?: string | null;
  customerName: string;
  projectName: string;
  startDate: string;
  dueDate: string;
  priority: string;
  status: string;
  notes: string;
  items: WorkOrderItem[];
  createdAt?: string;
}

interface SalesOrderLite {
  id: string;
  salesOrderNo: string;
  customerName: string;
  projectName: string;
  deliveryDate: string;
  items: WorkOrderItem[];
}

const STATUS_OPTIONS = [
  "Draft",
  "Approved",
  "In Production",
  "On Hold",
  "Completed",
  "Cancelled",
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High"];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const today = () => new Date().toISOString().slice(0, 10);

function createWorkOrderNumber() {
  return `WO-${Date.now().toString().slice(-8)}`;
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed (${response.status})`,
    );
  }

  return data;
}

function getList<T>(data: any, keys: string[]): T[] {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key] as T[];
    }
  }

  return [];
}

function normalizeItems(items: any): WorkOrderItem[] {
  if (!Array.isArray(items)) return [];

  return items.map((row: any) => ({
    itemName: row.itemName ?? row.name ?? "",
    description: row.description ?? "",
    quantity: Number(row.quantity ?? 1),
    unit: row.unit ?? "NOS",
  }));
}

function normalizeWorkOrder(item: any): WorkOrder {
  return {
    id: String(item.id),
    workOrderNo: item.workOrderNo || "WO-PENDING",
    salesOrderId:
      item.salesOrderId != null ? String(item.salesOrderId) : null,
    salesOrderNo: item.salesOrderNo ?? null,
    customerName: item.customerName ?? "",
    projectName: item.projectName ?? "",
    startDate: item.startDate ? String(item.startDate).slice(0, 10) : "",
    dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : "",
    priority: item.priority ?? "Medium",
    status: item.status ?? "Draft",
    notes: item.notes ?? "",
    items: normalizeItems(item.items),
    createdAt: item.createdAt,
  };
}

function normalizeSalesOrderLite(item: any): SalesOrderLite {
  return {
    id: String(item.id),
    salesOrderNo: item.salesOrderNo ?? "",
    customerName: item.customerName ?? "",
    projectName: item.projectName ?? "",
    deliveryDate: item.deliveryDate
      ? String(item.deliveryDate).slice(0, 10)
      : "",
    items: normalizeItems(item.items),
  };
}

const emptyForm = {
  salesOrderId: "",
  customerName: "",
  projectName: "",
  startDate: today(),
  dueDate: "",
  priority: "Medium",
  status: "Draft",
  notes: "",
};

const emptyItem = (): WorkOrderItem => ({
  itemName: "",
  description: "",
  quantity: 1,
  unit: "NOS",
});

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Low") return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderLite[]>([]);

  const [form, setForm] = useState({ ...emptyForm });
  const [formItems, setFormItems] = useState<WorkOrderItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<WorkOrder | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/work-orders`);
      const data = await parseResponse(response);

      setOrders(
        getList<any>(data, ["workOrders", "orders", "data"]).map(
          normalizeWorkOrder,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Work Orders could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalesOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/sales-orders`);
      const data = await parseResponse(response);

      setSalesOrders(
        getList<any>(data, ["salesOrders", "orders", "data"]).map(
          normalizeSalesOrderLite,
        ),
      );
    } catch {
      // Sales order list is optional; the form still works without it.
      setSalesOrders([]);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    void loadSalesOrders();
  }, [loadOrders, loadSalesOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = [
        order.workOrderNo,
        order.salesOrderNo,
        order.customerName,
        order.projectName,
        order.status,
        order.notes,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query),
      );

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(
    () => ({
      draft: orders.filter((o) => o.status === "Draft").length,
      approved: orders.filter((o) => o.status === "Approved").length,
      production: orders.filter((o) => o.status === "In Production")
        .length,
      completed: orders.filter((o) => o.status === "Completed").length,
    }),
    [orders],
  );

  function setField<K extends keyof typeof emptyForm>(
    field: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function selectSalesOrder(id: string) {
    if (!id) {
      setField("salesOrderId", "");
      return;
    }

    const so = salesOrders.find((item) => item.id === id);
    if (!so) return;

    setForm((previous) => ({
      ...previous,
      salesOrderId: id,
      customerName: so.customerName,
      projectName: so.projectName,
      dueDate: so.deliveryDate || previous.dueDate,
    }));
    setFormItems(so.items.map((item) => ({ ...item })));
  }

  function updateItem<K extends keyof WorkOrderItem>(
    index: number,
    field: K,
    value: WorkOrderItem[K],
  ) {
    setFormItems((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setFormItems((previous) => previous.filter((_, i) => i !== index));
  }

  function openCreate() {
    setEditingId(null);
    setViewing(null);
    setForm({ ...emptyForm, startDate: today() });
    setFormItems([]);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(order: WorkOrder) {
    setEditingId(order.id);
    setViewing(null);

    setForm({
      salesOrderId: order.salesOrderId ?? "",
      customerName: order.customerName ?? "",
      projectName: order.projectName ?? "",
      startDate: order.startDate || today(),
      dueDate: order.dueDate || "",
      priority: order.priority || "Medium",
      status: order.status || "Draft",
      notes: order.notes ?? "",
    });

    setFormItems(order.items.map((item) => ({ ...item })));
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function validateForm() {
    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return false;
    }

    if (!form.projectName.trim()) {
      setError("Project name is required.");
      return false;
    }

    if (!form.startDate) {
      setError("Please select the start date.");
      return false;
    }

    if (form.dueDate && form.dueDate < form.startDate) {
      setError("Due date cannot be before the start date.");
      return false;
    }

    return true;
  }

  async function submitForm(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setSaving(true);

    try {
      const existing = editingId
        ? orders.find((item) => item.id === editingId)
        : undefined;

      const linkedSalesOrder = salesOrders.find(
        (item) => item.id === form.salesOrderId,
      );

      const payload = {
        workOrderNo: existing?.workOrderNo ?? createWorkOrderNumber(),
        salesOrderId: form.salesOrderId || null,
        salesOrderNo:
          linkedSalesOrder?.salesOrderNo ??
          (form.salesOrderId ? existing?.salesOrderNo : null) ??
          null,
        customerName: form.customerName.trim(),
        projectName: form.projectName.trim(),
        startDate: form.startDate,
        dueDate: form.dueDate || null,
        priority: form.priority,
        status: form.status,
        notes: form.notes.trim() || null,
        items: formItems
          .filter((item) => item.itemName.trim())
          .map((item) => ({
            itemName: item.itemName.trim(),
            description: item.description?.trim() || null,
            quantity: Number(item.quantity) || 1,
            unit: item.unit || "NOS",
          })),
      };

      const url = editingId
        ? `${API_BASE}/work-orders/${encodeURIComponent(editingId)}`
        : `${API_BASE}/work-orders`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      await parseResponse(response);

      setSuccess(
        editingId
          ? "Work Order updated successfully."
          : "Work Order saved successfully.",
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setFormItems([]);

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Work Order could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order: WorkOrder) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${order.workOrderNo}?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE}/work-orders/${encodeURIComponent(order.id)}`,
        { method: "DELETE" },
      );

      await parseResponse(response);

      setSuccess("Work Order deleted successfully.");
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Work Order could not be deleted.",
      );
    }
  }

  function viewOrder(order: WorkOrder) {
    setViewing(order);
    setShowForm(false);
    setError("");
  }

  return (
    <AppShell title="Work Orders">
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">
              Production execution control
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Work Orders
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and track manufacturing work from confirmed
              sales.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadOrders();
                void loadSalesOrders();
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Work Order
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Draft", value: stats.draft },
            { label: "Approved", value: stats.approved },
            { label: "In Production", value: stats.production },
            { label: "Completed", value: stats.completed },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border bg-white p-5"
            >
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <section className="rounded-xl border bg-white p-4 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId
                    ? "Edit Work Order"
                    : "Create Work Order"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select a Sales Order (optional) or type the
                  customer details directly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close work order form"
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitForm} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm md:col-span-3">
                  <span>Sales Order (optional)</span>
                  <select
                    className={inputClass}
                    value={form.salesOrderId}
                    onChange={(event) =>
                      selectSalesOrder(event.target.value)
                    }
                  >
                    <option value="">
                      — None / type customer manually —
                    </option>
                    {salesOrders.map((so) => (
                      <option key={so.id} value={so.id}>
                        {so.salesOrderNo} — {so.customerName} (
                        {so.projectName})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Customer Name *</span>
                  <input
                    className={inputClass}
                    required
                    value={form.customerName}
                    onChange={(event) =>
                      setField("customerName", event.target.value)
                    }
                    placeholder="Customer name"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Project Name *</span>
                  <input
                    className={inputClass}
                    required
                    value={form.projectName}
                    onChange={(event) =>
                      setField("projectName", event.target.value)
                    }
                    placeholder="Modular Kitchen, Wardrobe..."
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Work Order Number</span>
                  <input
                    className={inputClass}
                    readOnly
                    value={
                      editingId
                        ? orders.find(
                            (order) => order.id === editingId,
                          )?.workOrderNo ?? ""
                        : "Generated on save"
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Start Date *</span>
                  <input
                    className={inputClass}
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(event) =>
                      setField("startDate", event.target.value)
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Due Date</span>
                  <input
                    className={inputClass}
                    type="date"
                    min={form.startDate}
                    value={form.dueDate}
                    onChange={(event) =>
                      setField("dueDate", event.target.value)
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span>Priority</span>
                  <select
                    className={inputClass}
                    value={form.priority}
                    onChange={(event) =>
                      setField("priority", event.target.value)
                    }
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Status</span>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(event) =>
                      setField("status", event.target.value)
                    }
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Items to Produce
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFormItems((previous) => [
                        ...previous,
                        emptyItem(),
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>

                {formItems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No items added yet.
                  </p>
                ) : (
                  formItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-12"
                    >
                      <input
                        className={`${inputClass} md:col-span-4`}
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "itemName",
                            event.target.value,
                          )
                        }
                      />
                      <input
                        className={`${inputClass} md:col-span-4`}
                        placeholder="Description / size"
                        value={item.description ?? ""}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                      />
                      <input
                        className={`${inputClass} md:col-span-2`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            Number(event.target.value),
                          )
                        }
                      />
                      <input
                        className={`${inputClass} md:col-span-1`}
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(index, "unit", event.target.value)
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => removeItem(index)}
                        className="rounded p-2 text-red-600 hover:bg-red-50 md:col-span-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <label className="block space-y-1 text-sm">
                <span>Notes / Production Instructions</span>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setField("notes", event.target.value)
                  }
                  placeholder="Material, finish, size or production instructions..."
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Work Order"
                      : "Save Work Order"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-5 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {viewing && (
          <section className="space-y-4 rounded-xl border bg-white p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Work Order Details
                </h2>
                <p className="text-sm text-gray-500">
                  {viewing.workOrderNo}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close work order details"
                className="rounded p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="font-medium">
                  {viewing.customerName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Project</p>
                <p className="font-medium">
                  {viewing.projectName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sales Order</p>
                <p className="font-medium">
                  {viewing.salesOrderNo || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium">
                  {viewing.startDate || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="font-medium">
                  {viewing.dueDate || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <p className="font-medium">{viewing.priority}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-medium">{viewing.status}</p>
              </div>
            </div>

            {viewing.items.length > 0 && (
              <div className="overflow-x-auto">
                <h3 className="mb-3 font-semibold">
                  Items to Produce
                </h3>
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewing.items.map((item, index) => (
                      <tr key={`${item.itemName}-${index}`}>
                        <td className="p-3">
                          <div>{item.itemName}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewing.notes && (
              <p className="text-sm">
                <strong>Notes:</strong> {viewing.notes}
              </p>
            )}

            <button
              type="button"
              onClick={() => openEdit(viewing)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Work Order
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold">Work Order Records</h2>
              <p className="mt-1 text-xs text-gray-500">
                {filteredOrders.length} record(s)
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  className={`${inputClass} pl-9 sm:w-64`}
                  placeholder="Search order, customer, project..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                className={inputClass}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter work orders by status"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-gray-500">
              Loading Work Orders...
            </p>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-gray-700">
                No Work Orders found.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Create a new work order or refresh the list.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                Create Work Order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3">Work Order</th>
                    <th className="p-3">Customer / Project</th>
                    <th className="p-3">Sales Order</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold">
                        {order.workOrderNo}
                      </td>

                      <td className="p-3">
                        <div className="font-medium">
                          {order.customerName || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.projectName || "—"}
                        </div>
                      </td>

                      <td className="p-3">
                        {order.salesOrderNo || "—"}
                      </td>

                      <td className="p-3">{order.startDate || "—"}</td>

                      <td className="p-3">{order.dueDate || "—"}</td>

                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass(order.priority)}`}
                        >
                          {order.priority}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {order.status}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`View ${order.workOrderNo}`}
                            title="View"
                            onClick={() => viewOrder(order)}
                            className="rounded p-2 text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            aria-label={`Edit ${order.workOrderNo}`}
                            title="Edit"
                            onClick={() => openEdit(order)}
                            className="rounded p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${order.workOrderNo}`}
                            title="Delete"
                            onClick={() => void deleteOrder(order)}
                            className="rounded p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default WorkOrdersPage;