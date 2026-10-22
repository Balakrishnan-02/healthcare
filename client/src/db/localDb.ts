import Dexie, { type Table } from "dexie";
import type { PatientRecord } from "../types";

class RuralCareDB extends Dexie {
  patients!: Table<PatientRecord, string>;
  constructor() {
    super("RuralCareLocal");
    this.version(1).stores({ patients: "localId, syncStatus, createdAtClient, syncKey" });
  }
}
export const localDb = new RuralCareDB();
