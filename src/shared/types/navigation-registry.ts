/**
 * Navigation Registry is strictly for rendering the Sidebar UI.
 * It is completely independent from the Module Registry, meaning menus 
 * will always appear even if the underlying module logic isn't finished yet (showing Placeholder).
 */

export const MasterDataNavigation = [
  {
    id: "jenis-paket",
    label: "Jenis Paket",
    href: "/admin/master-data/jenis-paket",
  },
  {
    id: "starting-point",
    label: "Starting Point",
    href: "/admin/master-data/starting-point",
  },

  {
    id: "landing-pattern",
    label: "Landing Pattern",
    href: "/admin/master-data/landing-pattern",
  },
  {
    id: "maskapai",
    label: "Maskapai",
    href: "/admin/master-data/maskapai",
  },
  {
    id: "hotel",
    label: "Hotel",
    href: "/admin/master-data/hotel",
  },

  {
    id: "klaster",
    label: "Klaster",
    href: "/admin/master-data/klaster",
  },
];
