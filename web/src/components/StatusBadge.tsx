import { ArchiveEntry } from "../api";

export const StatusBadge: React.FC<{ status: ArchiveEntry["status"] }> = ({ status }) => (
  <span className={`badge ${status}`}>{status}</span>
);
