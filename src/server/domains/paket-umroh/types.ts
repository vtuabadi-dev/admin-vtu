export interface PaketUmrohConfiguration {
  namaPaket: string;
  deskripsi: string;
  hargaBase: number;
  durasiHari: number;
  hotelMekkahOptions: any[];
  hotelMadinahOptions: any[];
}

export interface PaketUmrohDetail extends PaketUmrohConfiguration {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
