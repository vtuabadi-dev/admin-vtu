declare module "pdfmake" {
  interface TFontDictionary {
    [fontName: string]: {
      normal?: string;
      bold?: string;
      italics?: string;
      bolditalics?: string;
    };
  }

  interface TDocumentDefinitions {
    content: any[];
    styles?: any;
    defaultStyle?: any;
    pageOrientation?: string;
    pageSize?: string;
  }

  class TDocumentDefinitions {}

  class PdfPrinter {
    constructor(fonts: TFontDictionary);
    createPdfKitDocument(docDefinition: TDocumentDefinitions): any;
  }

  export default PdfPrinter;
}
