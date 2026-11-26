import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Plus,
  AlertTriangle,
  Save,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
} from "lucide-react";
import { AppShell } from "@/components/erp/AppShell";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const STAGES = [
  "Pending",
  "Cutting",
  "Edge Banding",
  "CNC",
  "Assembly",
  "Finishing",
  "QC",
  "Ready",
];

type AnyRecord = Record<string, any>;
type ModalMode = "create" | "edit" | "view" | null;

type WorkOrder = {
  id: string;
  workOrderNo: string;
  projectName?: string;
  productWork?: string;
  customerName?: string;
  quantity?: number;
  status?: string;
};

type Bom = {
  id: string;
  bomNo?: string;
  bomName?: string;
  project?: string;
  workOrderNo?: string;
  materials?: AnyRecord[];
};

type ProductionJob = {
  id: string;
  workOrderNo: string;
  productName: string;
  quantity: number;
  currentStage: string;
  department?: string;
  deadline?: string | null;
  notes?: string | null;
  bomId?: string | null;
  bom?: Bom | null;
  createdAt?: string;
};

async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || result.error || `Request failed (${response.status})`
    );
  }

  return result as T;
}

function asArray<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.workOrders)) return result.workOrders;
  if (Array.isArray(result?.boms)) return result.boms;
  if (Array.isArray(result?.jobs)) return result.jobs;
  if (Array.isArray(result?.productions)) return result.productions;
  return [];
}

function getId(item: AnyRecord): string {
  return String(item?.id ?? item?._id ?? "");
}

function getWorkOrderLabel(order: WorkOrder): string {
  return [
    order.workOrderNo,
    order.projectName || order.productWork || "",
    order.customerName || "",
  ]
    .filter(Boolean)
    .join(" — ");
}

function getBomLabel(bom: Bom): string {
  return [bom.bomNo || "", bom.bomName || "Unnamed BOM", bom.workOrderNo || ""]
    .filter(Boolean)
    .join(" — ");
}

function stageClass(stage?: string): string {
  if (!stage || stage === "Pending") return "bg-gray-100 text-gray-700";
  if (stage === "Ready") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}

function ProductionPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [boms, setBoms] = useState<Bom[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);

  const [workOrderNo, setWorkOrderNo] = useState("");
  const [bomId, setBomId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [currentStage, setCurrentStage] = useState("Pending");
  const [department, setDepartment] = useState("Production");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedWorkOrder = useMemo(
    () => workOrders.find((item) => item.workOrderNo === workOrderNo),
    [workOrders, workOrderNo]
  );

  const selectedBom = useMemo(
    () => boms.find((item) => getId(item) === bomId),
    [boms, bomId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        apiRequest("/work-orders"),
        apiRequest("/production/boms"),
        apiRequest("/production"),
      ]);

      if (results[0].status === "fulfilled") {
        setWorkOrders(asArray<WorkOrder>(results[0].value));
      }

      if (results[1].status === "fulfilled") {
        setBoms(asArray<Bom>(results[1].value));
      } else {
        try {
          const result = await apiRequest("/bom");
          setBoms(asArray<Bom>(result));
        } catch (e) {
          console.error("BOM load failed:", e);
        }
      }

      if (results[2].status === "fulfilled") {
        setJobs(asArray<ProductionJob>(results[2].value));
      } else {
        throw results[2].reason;
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load Production data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setWorkOrderNo("");
    setBomId("");
    setProductName("");
    setQuantity("1");
    setCurrentStage("Pending");
    setDepartment("Production");
    setDeadline("");
    setNotes("");
    setEditingId("");
  };

  const closeModal = () => {
    setModalMode(null);
    resetForm();
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setModalMode("create");
  };

  const fillFromJob = (job: ProductionJob) => {
    setEditingId(job.id);
    setWorkOrderNo(job.workOrderNo || "");
    setBomId(job.bomId ? String(job.bomId) : "");
    setProductName(job.productName || "");
    setQuantity(String(job.quantity || 1));
    setCurrentStage(job.currentStage || "Pending");
    setDepartment(job.department || "Production");
    setDeadline(job.deadline ? job.deadline.slice(0, 10) : "");
    setNotes(job.notes || "");
    setError("");
    setSuccess("");
  };

  const openEdit = (job: ProductionJob) => {
    fillFromJob(job);
    setModalMode("edit");
  };

  const openView = (job: ProductionJob) => {
    fillFromJob(job);
    setModalMode("view");
  };

  const handleWorkOrderChange = (value: string) => {
    setWorkOrderNo(value);
    setError("");

    const order = workOrders.find((item) => item.workOrderNo === value);

    if (order) {
      setProductName(order.productWork || order.projectName || "");
      setQuantity(String(order.quantity || 1));

      const matchingBom = boms.find((item) => item.workOrderNo === value);
      setBomId(matchingBom ? getId(matchingBom) : "");
    }
  };

  const handleBomChange = (value: string) => {
    setBomId(value);
    setError("");

    const bom = boms.find((item) => getId(item) === value);

    if (bom?.workOrderNo) {
      setWorkOrderNo(bom.workOrderNo);

      const order = workOrders.find(
        (item) => item.workOrderNo === bom.workOrderNo
      );

      if (order && !productName.trim()) {
        setProductName(order.productWork || order.projectName || "");
      }
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modalMode === "view") return;

    setError("");
    setSuccess("");

    if (!workOrderNo.trim()) {
      setError("Please select a Work Order.");
      return;
    }

    if (!productName.trim()) {
      setError("Please enter the Product Name.");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      setError("Production Quantity must be at least 1.");
      return;
    }

    const payload = {
      workOrderNo: workOrderNo.trim(),
      productName: productName.trim(),
      quantity: Number(quantity),
      currentStage,
      department: department.trim() || "Production",
      deadline: deadline || null,
      notes: notes.trim() || null,
      bomId: bomId || null,
    };

    setSaving(true);

    try {
      if (modalMode === "edit" && editingId) {
        await apiRequest(`/production/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("Production job updated successfully.");
      } else {
        await apiRequest("/production", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Production job saved successfully.");
      }

      setModalMode(null);
      resetForm();
      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save Production job."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (job: ProductionJob) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete production job ${job.workOrderNo}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/production/${job.id}`, { method: "DELETE" });
      setSuccess("Production job deleted successfully.");
      await loadData();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to delete Production job."
      );
    }
  };

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return jobs.filter((job) => {
      if (
        stageFilter !== "All Stages" &&
        (job.currentStage || "Pending") !== stageFilter
      ) {
        return false;
      }

      if (!term) return true;

      return [
        job.workOrderNo,
        job.productName,
        job.currentStage,
        job.department,
        job.bom?.bomName,
        job.bom?.bomNo,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [jobs, search, stageFilter]);

  const pendingJobs = jobs.filter(
    (job) => !job.currentStage || job.currentStage === "Pending"
  ).length;

  const activeJobs = jobs.filter(
    (job) =>
      job.currentStage && !["Pending", "Ready"].includes(job.currentStage)
  ).length;

  const readyJobs = jobs.filter((job) => job.currentStage === "Ready").length;

  const modalTitle =
    modalMode === "edit"
      ? "Edit Production Job"
      : modalMode === "view"
        ? "Production Job Details"
        : "Create Production Job";

  return (
    <AppShell>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Production floor control
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Production
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage work orders, BOM materials and production stages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Create Production Job
            </button>
          </div>
        </div>

        {error && !modalMode && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Jobs", value: jobs.length },
            { label: "Pending", value: pendingJobs },
            { label: "In Progress", value: activeJobs },
            { label: "Ready", value: readyJobs },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border bg-white px-6 py-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Records */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <h2 className="text-lg font-semibold">Production Job Records</h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredJobs.length} record(s)
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search work order, product, BOM..."
                  className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm"
                />
              </div>

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-xl border px-4 py-2.5 text-sm"
              >
                <option>All Stages</option>
                {STAGES.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="border-t py-10 text-center text-sm text-gray-500">
              Loading production data...
            </p>
          ) : filteredJobs.length === 0 ? (
            <p className="border-t py-10 text-center text-sm text-gray-500">
              No production jobs found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-900">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Work Order</th>
                    <th className="px-6 py-4 font-semibold">
                      Product / BOM
                    </th>
                    <th className="px-6 py-4 font-semibold">Quantity</th>
                    <th className="px-6 py-4 font-semibold">Department</th>
                    <th className="px-6 py-4 font-semibold">Deadline</th>
                    <th className="px-6 py-4 font-semibold">Stage</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredJobs.map((job) => {
                    const bomName =
                      job.bom?.bomName ||
                      boms.find((bom) => getId(bom) === String(job.bomId))
                        ?.bomName ||
                      "";

                    return (
                      <tr key={job.id} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold">
                          {job.workOrderNo || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold">
                            {job.productName || "-"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {bomName || "No BOM linked"}
                          </p>
                        </td>
                        <td className="px-6 py-4">{job.quantity ?? 0}</td>
                        <td className="px-6 py-4">
                          {job.department || "Production"}
                        </td>
                        <td className="px-6 py-4">
                          {job.deadline ? job.deadline.slice(0, 10) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${stageClass(
                              job.currentStage
                            )}`}
                          >
                            {job.currentStage || "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => openView(job)}
                              title="View"
                              className="text-gray-700 hover:text-gray-900"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(job)}
                              title="Edit"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(job)}
                              title="Delete"
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 md:p-8">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{modalTitle}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <fieldset
                disabled={modalMode === "view"}
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Work Order Number *
                  </label>
                  <select
                    value={workOrderNo}
                    onChange={(e) => handleWorkOrderChange(e.target.value)}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Select Work Order</option>
                    {workOrders.map((order) => (
                      <option
                        key={order.id || order.workOrderNo}
                        value={order.workOrderNo}
                      >
                        {getWorkOrderLabel(order)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    BOM Name
                  </label>
                  <select
                    value={bomId}
                    onChange={(e) => handleBomChange(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Select BOM</option>
                    {boms.map((bom) => (
                      <option key={getId(bom)} value={getId(bom)}>
                        {getBomLabel(bom)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Modular Kitchen"
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Production Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Production Stage
                  </label>
                  <select
                    value={currentStage}
                    onChange={(e) => setCurrentStage(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Department
                  </label>
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Notes
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
              </fieldset>

              {selectedWorkOrder && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p>
                    <strong>Work Order:</strong> {selectedWorkOrder.workOrderNo}
                  </p>
                  <p>
                    <strong>Project:</strong>{" "}
                    {selectedWorkOrder.projectName || "-"}
                  </p>
                  <p>
                    <strong>Customer:</strong>{" "}
                    {selectedWorkOrder.customerName || "-"}
                  </p>
                </div>
              )}

              {selectedBom && (
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="font-semibold">BOM Materials & Stock Usage</h3>

                  {selectedBom.materials?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3">Material Code</th>
                            <th className="p-3">Material Name</th>
                            <th className="p-3">Required Qty</th>
                            <th className="p-3">Available Stock</th>
                            <th className="p-3">Unit</th>
                            <th className="p-3">Stock Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBom.materials.map((material, index) => {
                            const required = Number(material.requiredQty ?? 0);
                            const available = Number(
                              material.availableQty ?? 0
                            );
                            const sufficient = available >= required;

                            return (
                              <tr
                                key={
                                  material.id ||
                                  `${material.materialCode}-${index}`
                                }
                                className="border-t"
                              >
                                <td className="p-3">
                                  {material.materialCode || "-"}
                                </td>
                                <td className="p-3">
                                  {material.materialName || "-"}
                                </td>
                                <td className="p-3">{required}</td>
                                <td className="p-3">{available}</td>
                                <td className="p-3">
                                  {material.unit || "Pieces"}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs ${
                                      sufficient
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {sufficient ? "Sufficient" : "Insufficient"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No materials linked to this BOM.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50"
                >
                  {modalMode === "view" ? "Close" : "Cancel"}
                </button>

                {modalMode !== "view" && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving
                      ? "Saving..."
                      : modalMode === "edit"
                        ? "Update Production"
                        : "Save Production"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default ProductionPage;