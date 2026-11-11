import { describe, it, expect, beforeEach } from "vitest";
import {
  mergeEntitiesById,
  mergeGroupIntoList,
  applyHotelUpdatesToJamaahList,
  buildPartialGroupFromSummary,
  useOperationalStore,
} from "@/stores/operational-store";
import type { GroupPaymentSummary, Jamaah, RegistrationGroup } from "@/shared/types";

function makeGroup(overrides: Partial<RegistrationGroup> & { id: string }): RegistrationGroup {
  return {
    kodeRegistrasi: "GRP-2026-0001",
    namaGroup: "GRUP TEST",
    jumlahAnggota: 1,
    totalTagihan: 30_000_000,
    totalPembayaran: 0,
    sisaPembayaran: 30_000_000,
    paketKeberangkatanId: "pkg-1",
    invoices: [],
    pembayaran: [],
    anggota: [],
    ...overrides,
  } as RegistrationGroup;
}

function makeJamaah(overrides: Partial<Jamaah> & { id: string }): Jamaah {
  return {
    namaLengkap: "ARDI",
    groupId: "grp-1",
    hotelMekkah: "LE MERIDIEN TOWERS",
    hotelMadinah: "DURRAT AL EIMAN",
    ...overrides,
  } as Jamaah;
}

describe("Operational Store & Billing Sync State Helpers", () => {
  beforeEach(() => {
    useOperationalStore.setState({
      keberangkatanList: [],
      jamaahList: [],
      groupList: [],
      staleFlags: { groups: false, jamaah: false },
    });
  });

  describe("mergeEntitiesById", () => {
    it("returns existing array when incoming is empty", () => {
      const existing = [makeGroup({ id: "grp-1" })];
      expect(mergeEntitiesById(existing, [])).toBe(existing);
    });

    it("updates matching entities in place while keeping other packages untouched", () => {
      const existing = [
        makeGroup({ id: "grp-1", totalTagihan: 89_700_000, paketKeberangkatanId: "pkg-1" }),
        makeGroup({ id: "grp-other", totalTagihan: 45_000_000, paketKeberangkatanId: "pkg-2" }),
      ];
      const updated = makeGroup({
        id: "grp-1",
        totalTagihan: 103_200_000,
        paketKeberangkatanId: "pkg-1",
      });
      const added = makeGroup({ id: "grp-2", totalTagihan: 29_900_000, paketKeberangkatanId: "pkg-1" });

      const result = mergeEntitiesById(existing, [updated, added]);
      expect(result).toHaveLength(3);
      expect(result.find((g) => g.id === "grp-1")?.totalTagihan).toBe(103_200_000);
      expect(result.find((g) => g.id === "grp-other")?.totalTagihan).toBe(45_000_000);
      expect(result.find((g) => g.id === "grp-2")?.totalTagihan).toBe(29_900_000);
    });
  });

  describe("mergeGroupIntoList", () => {
    it("patches existing group and appends unknown group only when kodeRegistrasi is present", () => {
      const existing = [
        makeGroup({
          id: "grp-1",
          totalTagihan: 89_700_000,
          sisaPembayaran: 89_700_000,
          anggota: [makeJamaah({ id: "j-1", groupId: "grp-1" })],
        }),
      ];

      const patched = mergeGroupIntoList(existing, {
        id: "grp-1",
        totalTagihan: 103_200_000,
        sisaPembayaran: 103_200_000,
        anggota: undefined,
      });
      expect(patched).toHaveLength(1);
      expect(patched[0]?.totalTagihan).toBe(103_200_000);
      expect(patched[0]?.anggota).toHaveLength(1);

      const ignoredUnknown = mergeGroupIntoList(patched, {
        id: "grp-unknown-partial",
        totalTagihan: 1_000_000,
      });
      expect(ignoredUnknown).toHaveLength(1);

      const inserted = mergeGroupIntoList(patched, {
        id: "grp-2",
        kodeRegistrasi: "GRP-2026-0099",
        totalTagihan: 50_000_000,
      });
      expect(inserted).toHaveLength(2);
      expect(inserted[1]?.id).toBe("grp-2");
    });
  });

  describe("applyHotelUpdatesToJamaahList", () => {
    it("updates only targeted group members by name/id without affecting other groups", () => {
      const list = [
        makeJamaah({ id: "j-1", groupId: "grp-1", namaLengkap: "Ardi" }),
        makeJamaah({ id: "j-2", groupId: "grp-1", namaLengkap: "Irda" }),
        makeJamaah({ id: "j-3", groupId: "grp-2", namaLengkap: "Ardi" }),
      ];

      const next = applyHotelUpdatesToJamaahList(list, {
        jamaahNames: ["  ARDI ", "IRDA"],
        groupId: "grp-1",
        hotelMekkah: "SAFWAH TOWER",
      });

      expect(next[0]?.hotelMekkah).toBe("SAFWAH TOWER");
      expect(next[0]?.hotelMadinah).toBe("DURRAT AL EIMAN");
      expect(next[1]?.hotelMekkah).toBe("SAFWAH TOWER");
      expect(next[2]?.hotelMekkah).toBe("LE MERIDIEN TOWERS");
    });

    it("returns original list reference when neither hotelMekkah nor hotelMadinah is passed", () => {
      const list = [makeJamaah({ id: "j-1" })];
      expect(applyHotelUpdatesToJamaahList(list, { groupId: "grp-1" })).toBe(list);
    });
  });

  describe("buildPartialGroupFromSummary", () => {
    it("maps GroupPaymentSummary fields to partial RegistrationGroup", () => {
      const summary = {
        groupId: "grp-12",
        kodeRegistrasi: "GRP-2026-0012",
        namaGroup: "GRUP ARDI",
        totalTagihan: 103_200_000,
        totalPembayaran: 0,
        sisaPembayaran: 103_200_000,
        jumlahAnggota: 3,
        invoices: [{ id: "inv-1", nomorInvoice: "INV-001", totalTagihan: 103_200_000 }],
      } as unknown as GroupPaymentSummary;

      const partial = buildPartialGroupFromSummary(summary);
      expect(partial.id).toBe("grp-12");
      expect(partial.totalTagihan).toBe(103_200_000);
      expect(partial.sisaPembayaran).toBe(103_200_000);
      expect(partial.invoices).toHaveLength(1);
    });
  });

  describe("useOperationalStore actions and staleFlags", () => {
    it("tracks invalidation flags and clears them when fresh store updates arrive", () => {
      const store = useOperationalStore.getState();

      store.setGroupList([
        makeGroup({
          id: "grp-12",
          kodeRegistrasi: "GRP-2026-0012",
          totalTagihan: 89_700_000,
          anggota: [
            makeJamaah({ id: "j-1", groupId: "grp-12", namaLengkap: "ARDI" }),
            makeJamaah({ id: "j-2", groupId: "grp-12", namaLengkap: "IRDA" }),
          ],
        }),
      ]);
      store.setJamaahList([
        makeJamaah({ id: "j-1", groupId: "grp-12", namaLengkap: "ARDI" }),
        makeJamaah({ id: "j-2", groupId: "grp-12", namaLengkap: "IRDA" }),
      ]);

      store.invalidateOperationalData(["groups", "jamaah"]);
      expect(useOperationalStore.getState().staleFlags).toEqual({ groups: true, jamaah: true });

      store.syncGroupSummaryInStore({
        groupId: "grp-12",
        kodeRegistrasi: "GRP-2026-0012",
        namaGroup: "GRUP ARDI",
        totalTagihan: 103_200_000,
        totalPembayaran: 0,
        sisaPembayaran: 103_200_000,
        jumlahAnggota: 2,
      } as unknown as GroupPaymentSummary);

      expect(useOperationalStore.getState().groupList[0]?.totalTagihan).toBe(103_200_000);
      expect(useOperationalStore.getState().staleFlags).toEqual({ groups: false, jamaah: true });

      store.updateJamaahHotelsInStore({
        jamaahNames: ["ARDI", "IRDA"],
        groupId: "grp-12",
        hotelMekkah: "SAFWAH TOWER",
      });

      const nextState = useOperationalStore.getState();
      expect(nextState.staleFlags).toEqual({ groups: false, jamaah: false });
      expect(nextState.jamaahList.every((j) => j.hotelMekkah === "SAFWAH TOWER")).toBe(true);
      expect(
        nextState.groupList[0]?.anggota?.every((a) => a.hotelMekkah === "SAFWAH TOWER")
      ).toBe(true);
    });
  });
});

