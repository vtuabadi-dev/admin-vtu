/**
 * Generic Form Schema Contract
 * Defines how Master Data forms should be automatically rendered or validated.
 */

export type FormFieldType = 
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "EMAIL"
  | "SELECT"
  | "MULTI_SELECT"
  | "CHECKBOX"
  | "RADIO"
  | "DATE"
  | "IMAGE"
  | "FILE";

export interface IFormField {
  name: string; // Internal field name (e.g., "kode_paket")
  label: string; // Display label (e.g., "Kode Paket")
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  
  // Validation constraints (could map to Zod internally)
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  
  // UI rules
  readonly?: boolean;
  hidden?: boolean;
  
  // Reference data for Select/Multi-select
  options?: { label: string; value: string | number }[];
  referenceSource?: string; // If data is dynamic, e.g., "api/master/hotel"
  
  // Layout and Grouping
  layoutGroup?: string;
  tabGroup?: string;
  
  // Advanced Rules
  conditionalRules?: {
    dependsOnField: string;
    condition: "EQUALS" | "NOT_EQUALS" | "CONTAINS";
    value: any;
    action: "SHOW" | "HIDE" | "REQUIRE";
  }[];
}

export interface IFormSchema {
  entityName: string;
  fields: IFormField[];
  layoutGroups?: {
    id: string;
    title: string;
    description?: string;
  }[];
}
