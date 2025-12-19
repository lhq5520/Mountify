"use client";

import { useEffect, useState } from "react";
import { Package, Save, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  on_hand: number;
  reserved: number;
  available: number;
  inventory_updated_at: string | null;
}

export default function InventoryPage() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/admin/inventory");
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory);
      }
    } catch (e) {
      console.error("Failed to fetch inventory:", e);
      showToast("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditValue(item.on_hand.toString());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveStock(id: number) {
    const onHand = parseInt(editValue, 10);
    if (isNaN(onHand) || onHand < 0) {
      showToast("Stock must be a non-negative number", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onHand }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to update stock", "error");
        return;
      }

      showToast("Stock updated", "success");
      setEditingId(null);
      fetchInventory();
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  function getStockStatus(available: number) {
    if (available <= 0)
      return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
    if (available <= 5)
      return { label: "Low Stock", color: "text-orange-600 bg-orange-50" };
    return { label: "In Stock", color: "text-green-600 bg-green-50" };
  }

  return (
    <div>
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Manage product stock levels
          </p>
        </div>
      </header>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              No products found
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  On Hand
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Reserved
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {inventory.map((item) => {
                const status = getStockStatus(item.available);
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {item.name}
                      </p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">
                        ${Number(item.price).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {item.available <= 0 ? (
                          <AlertTriangle size={12} />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-[var(--color-border)] rounded-lg focus:border-[var(--color-primary)] focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {item.on_hand}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--color-text-secondary)]">
                      {item.reserved}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`font-semibold ${
                          item.available <= 0
                            ? "text-red-600"
                            : item.available <= 5
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveStock(item.id)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            <Save size={14} />
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="px-3 py-1 text-sm text-[var(--color-primary)] hover:underline"
                        >
                          Edit Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
