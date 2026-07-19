"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Trash2, Edit3, Settings, Check } from "lucide-react";

interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { label: string; value: any }[];
}

interface ColumnConfig<T> {
  key: keyof T | "actions";
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface FilterConfig {
  name: string;
  label: string;
  options: { label: string; value: any }[];
}

interface CrudTabProps<T extends { id: string; status?: string; [key: string]: any }> {
  title: string;
  itemName: string;
  initialData?: T[];
  apiEndpoint?: string;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  defaultNewItem: Omit<T, "id">;
  filterField?: FilterConfig;
  onSettingsClick?: () => void;
}

export function CrudTab<T extends { id: string; status?: string; [key: string]: any }>({
  title,
  itemName,
  initialData,
  apiEndpoint,
  columns,
  fields,
  defaultNewItem,
  filterField,
  onSettingsClick,
}: CrudTabProps<T>) {
  const [data, setData] = useState<T[]>(initialData || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<any>(defaultNewItem);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(!!apiEndpoint);

  const fetchData = async () => {
    if (!apiEndpoint) return;
    try {
      setLoading(true);
      const res = await fetch(apiEndpoint);
      const resJson = await res.json();
      if (resJson.success) {
        // Map database response to match table column expectations
        const mapped = resJson.data.map((item: any) => ({
          ...item,
          status: item.isActive === false ? "Nonaktif" : "Aktif",
          nama: item.name || item.nama,
          kode: item.code || item.kode,
        }));
        setData(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch master data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiEndpoint]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData(defaultNewItem);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: T) => {
    setEditingItem(item);
    setFormData(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Apakah Anda yakin ingin menonaktifkan/menghapus ${itemName} ini?`)) {
      if (apiEndpoint) {
        try {
          setLoading(true);
          const res = await fetch(`${apiEndpoint}/${id}`, {
            method: "DELETE",
          });
          const resJson = await res.json();
          if (resJson.success) {
            await fetchData();
          } else {
            alert(`Error: ${resJson.message}`);
          }
        } catch (e) {
          console.error("Failed to delete", e);
        } finally {
          setLoading(false);
        }
      } else {
        setData((prev) => prev.filter((item) => item.id !== id));
      }
    }
  };

  const handleReactivate = async (id: string) => {
    if (apiEndpoint) {
      try {
        setLoading(true);
        const res = await fetch(`${apiEndpoint}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Aktif" }),
        });
        const resJson = await res.json();
        if (resJson.success) {
          await fetchData();
        } else {
          alert(`Error: ${resJson.message}`);
        }
      } catch (e) {
        console.error("Failed to reactivate", e);
      } finally {
        setLoading(false);
      }
    } else {
      setData((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "Aktif" } : item))
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiEndpoint) {
      try {
        setLoading(true);
        if (editingItem) {
          // Edit: PUT
          const res = await fetch(`${apiEndpoint}/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          const resJson = await res.json();
          if (resJson.success) {
            await fetchData();
            setModalOpen(false);
          } else {
            alert(`Error: ${resJson.message}`);
          }
        } else {
          // Add: POST
          const res = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });
          const resJson = await res.json();
          if (resJson.success) {
            await fetchData();
            setModalOpen(false);
          } else {
            alert(`Error: ${resJson.message}`);
          }
        }
      } catch (e) {
        console.error("Failed to save", e);
      } finally {
        setLoading(false);
      }
    } else {
      if (editingItem) {
        setData((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...formData } : item))
        );
      } else {
        const newId = `NEW_${Math.random().toString(36).substr(2, 9)}`;
        const newItem = { id: newId, ...formData } as T;
        setData((prev) => [...prev, newItem]);
      }
      setModalOpen(false);
    }
  };

  const filteredData = filterField && filterValue
    ? data.filter((item) => String(item[filterField.name as keyof T]) === filterValue)
    : data;

  return (
    <div>
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          {filterField && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="h-9 px-3 text-xs rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua {filterField.label}</option>
              {filterField.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSettingsClick && (
            <Button variant="outline" size="sm" onClick={onSettingsClick} disabled={loading} title="Pengaturan">
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={handleOpenAdd} disabled={loading}>
            Tambah {itemName}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              {columns.map((col) => (
                <th key={col.key as string} className="px-6 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground animate-pulse">
                  Memuat data dari database...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  Tidak ada data. Silakan klik Tambah {itemName}.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  {columns.map((col) => {
                    if (col.key === "actions") {
                      return (
                        <td key="actions" className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {item.status === "Nonaktif" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReactivate(item.id)}
                                title="Aktifkan"
                                className="text-green-600 border-green-200 hover:bg-green-50 flex items-center gap-1"
                                disabled={loading}
                              >
                                <Check className="h-3 w-3" />
                                Aktifkan
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit"
                              className="flex items-center gap-1"
                              disabled={loading}
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              title="Hapus"
                              className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                              disabled={loading}
                            >
                              <Trash2 className="h-3 w-3" />
                              Hapus
                            </Button>
                          </div>
                        </td>
                      );
                    }

                    if (col.render) {
                      return (
                        <td key={col.key as string} className="px-6 py-4">
                          {col.render(item)}
                        </td>
                      );
                    }

                    return (
                      <td key={col.key as string} className="px-6 py-4">
                        {String(item[col.key as keyof T] ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit ${itemName}` : `Tambah ${itemName}`}
        description={`Silakan isi form di bawah untuk menyimpan ${itemName}.`}
      >
        <form onSubmit={handleSave} className="space-y-4 mt-2" autoComplete="off">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{field.label}</label>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  value={formData[field.name] ?? ""}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Pilih --</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name] ?? ""}
                  onChange={handleInputChange}
                  required
                  placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

