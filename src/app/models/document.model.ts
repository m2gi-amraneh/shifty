// document.model.ts
export interface Document {
  id: string;             // Unique identifier for the document
  userId: string;         // ID of the user associated with the document
  type: DocumentType;     // Type of document (CONTRACT, PAYSLIP, WORKHOURS)
  title: string;          // Human-readable title of the document
  fileRef: string;        // Reference to the file in storage (e.g., Firebase Storage path)
  createdAt: Date | string; // Date when the document was created
  createdBy: string;      // ID or identifier of the creator (e.g., 'system' or admin user ID)
  signed?: boolean;       // Whether the document (e.g., contract) is signed
  signedAt?: Date | string; // Date when the document was signed (optional)
  metadata?: any;         // Additional metadata specific to the document type
}

export type DocumentType = 'CONTRACT' | 'PAYSLIP' | 'WORKHOURS';
