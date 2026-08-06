import React, { useState } from 'react';
import {
  Users,
  Plus,
  Calendar,
  Edit2,
  Trash2,
  ChevronRight,
  Package,
  X,
} from 'lucide-react';
import { DepartureGroup, DepartureStatus, ExpenseRecord } from '../types';
import {
  formatRupiah,
  formatTanggalIndo,
  calculateGroupExpenses,
} from '../utils/formatters';

interface DepartureGroupListProps {
  groups: DepartureGroup[];
  expenses: ExpenseRecord[];
  onAddGroup: (newGroup: DepartureGroup) => void;
  onUpdateGroup: (updatedGroup: DepartureGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onOpenNewExpenseForGroup: (groupId: string) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

export const DepartureGroupList: React.FC<DepartureGroupListProps> = ({
  groups,
  expenses,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSelectGroup,
  onOpenNewExpenseForGroup,
  isModalOpen,
  setIsModalOpen,
}) => {
  const [editingGroup, setEditingGroup] = useState<DepartureGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form Fields State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [packageType, setPackageType] = useState('Bintang 5 - 9 Hari');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [totalQuota, setTotalQuota] = useState(45);
  const [filledQuota, setFilledQuota] = useState(0);
  const [targetBudget, setTargetBudget] = useState(1200000000);
  const [status, setStatus] = useState<DepartureStatus>('Aktif');
  const [notes, setNotes] = useState('');

  const openModal = (groupToEdit?: DepartureGroup) => {
    if (groupToEdit) {
      setEditingGroup(groupToEdit);
      setCode(groupToEdit.code);
      setName(groupToEdit.name);
      setPackageType(groupToEdit.packageType);
      setDepartureDate(groupToEdit.departureDate);
      setReturnDate(groupToEdit.returnDate);
      setTotalQuota(groupToEdit.totalQuota);
      setFilledQuota(groupToEdit.filledQuota);
      setTargetBudget(groupToEdit.targetBudget);
      setStatus(groupToEdit.status);
      setNotes(groupToEdit.notes || '');
    } else {
      setEditingGroup(null);
      const year = new Date().getFullYear();
      const randomNum = Math.floor(100 + Math.random() * 900);
      setCode(`UMR-${year}-${randomNum}`);
      setName('');
      setPackageType('Bintang 5 - 9 Hari');
      setDepartureDate('');
      setReturnDate('');
      setTotalQuota(45);
      setFilledQuota(0);
      setTargetBudget(1200000000);
      setStatus('Aktif');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !departureDate) return;

    if (editingGroup) {
      const updated: DepartureGroup = {
        ...editingGroup,
        code,
        name,
        packageType,
        departureDate,
        returnDate,
        totalQuota: Number(totalQuota),
        filledQuota: Number(filledQuota),
        targetBudget: Number(targetBudget),
        status,
        notes,
      };
      onUpdateGroup(updated);
    } else {
      const newGrp: DepartureGroup = {
        id: `grp-${Date.now()}`,
        code,
        name,
        packageType,
        departureDate,
        returnDate,
        totalQuota: Number(totalQuota),
        filledQuota: Number(filledQuota),
        targetBudget: Number(targetBudget),
        status,
        notes,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onAddGroup(newGrp);
    }

    setIsModalOpen(false);
  };

  const filteredGroups = groups.filter((g) => {
    if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" /> Management Grup Keberangkatan Umroh
          </h2>
          <p className="text-xs text-slate-500">
            Terhubung otomatis dengan referensi Paket Umroh Aktif. Kelola alokasi anggaran vendor dan pantau ketersediaan seat kursi jamaah.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">Semua Status Grup</option>
            <option value="Aktif">Aktif / Persiapan</option>
            <option value="Direncanakan">Direncanakan</option>
            <option value="Berangkat">Sedang Berangkat</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* Groups Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGroups.map((grp) => {
          const groupExp = calculateGroupExpenses(grp.id, expenses);
          const seatsLeft = grp.totalQuota - grp.filledQuota;
          const quotaPercent = Math.round((grp.filledQuota / grp.totalQuota) * 100);
          const budgetPercent = Math.round((groupExp.totalActual / grp.targetBudget) * 100);

          return (
            <div
              key={grp.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                        {grp.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          grp.status === 'Aktif'
                            ? 'bg-blue-100 text-blue-800'
                            : grp.status === 'Berangkat'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {grp.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{grp.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" /> {grp.packageType}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openModal(grp)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                      title="Edit Grup"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus grup "${grp.name}"?`)) onDeleteGroup(grp.id);
                      }}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                      title="Hapus Grup"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Departure Dates & Notes */}
                <div className="my-3 grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Keberangkatan
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      {formatTanggalIndo(grp.departureDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Kepulangan
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {formatTanggalIndo(grp.returnDate)}
                    </span>
                  </div>
                </div>

                {/* Quota Progress Bar */}
                <div className="space-y-1 my-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> Sisa Kuota Seat:
                      <span className="text-emerald-700 font-extrabold">{seatsLeft} Kursi</span>
                    </span>
                    <span className="text-slate-500 font-medium">
                      {grp.filledQuota} / {grp.totalQuota} Pax ({quotaPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        seatsLeft <= 3 ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="space-y-1 my-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Realisasi Pengeluaran:</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(groupExp.totalActual)} / {formatRupiah(grp.targetBudget)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        budgetPercent > 100 ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenNewExpenseForGroup(grp.id)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> + Catat Biaya Vendor
                </button>

                <button
                  onClick={() => onSelectGroup(grp.id)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  Lihat Pengeluaran ({groupExp.expenseCount}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {editingGroup ? 'Edit Grup Keberangkatan' : 'Tambah Grup Keberangkatan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Keberangkatan</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="UMR-2026-SEP-01"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Keberangkatan</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DepartureStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Aktif">Aktif / Persiapan</option>
                    <option value="Direncanakan">Direncanakan</option>
                    <option value="Berangkat">Sedang Berangkat</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Grup Keberangkatan</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: Grup Umroh Mawaddah September 2026"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Paket / Layanan</label>
                <input
                  type="text"
                  required
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: Bintang 5 - 9 Hari (Saudia Airlines)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Keberangkatan</label>
                  <input
                    type="date"
                    required
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Kepulangan</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Kuota Seat</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalQuota}
                    onChange={(e) => setTotalQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jamaah Terisi</label>
                  <input
                    type="number"
                    min="0"
                    max={totalQuota}
                    required
                    value={filledQuota}
                    onChange={(e) => setFilledQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sisa Kursi</label>
                  <div className="px-3 py-2 bg-slate-100 rounded-xl font-bold text-emerald-700">
                    {totalQuota - filledQuota} Seat
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Budget Anggaran (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  required
                  value={targetBudget}
                  onChange={(e) => setTargetBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Catatan hotel, maskapai, or katering..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-950/30"
                >
                  Simpan Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
