import { localDb } from "../db/localDb";
import { api } from "./api";

export async function syncPending() {
  if (!navigator.onLine) return { synced: 0, pending: await localDb.patients.where("syncStatus").equals("pending").count() };
  const queued = await localDb.patients.where("syncStatus").equals("pending").limit(50).toArray();
  if (!queued.length) return { synced: 0, pending: 0 };
  const response = await api<{ results: { syncKey: string; status: "synced" | "failed" }[] }>("/sync", {
    method: "POST",
    body: JSON.stringify({ records: queued.map(({ syncStatus, createdByName, ...record }) => record) })
  });
  let synced = 0;
  for (const result of response.results) {
    if (result.status === "synced") {
      const item = queued.find(record => record.syncKey === result.syncKey);
      if (item) { await localDb.patients.update(item.localId, { syncStatus: "synced" }); synced++; }
    }
  }
  return { synced, pending: await localDb.patients.where("syncStatus").equals("pending").count() };
}
