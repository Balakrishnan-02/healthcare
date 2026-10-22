export type StaffRole = "admin" | "doctor" | "nurse" | "staff";
export interface StaffUser { id: string; name: string; email: string; role: StaffRole }
export interface PatientRecord {
  localId: string; fullName: string; age?: number; sex: "Female" | "Male" | "Other" | "Prefer not to say";
  village?: string; phone?: string; note?: string; createdAtClient: string; syncKey: string;
  syncStatus: "pending" | "synced"; createdByName?: string;
}
