import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, LinearProgress, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";

const initialFilters = { engine: "", channel: "", start: "", end: "" };

export default function AdminDatabase({ requestJson, fieldSx }) {
  const [databaseId, setDatabaseId] = useState("");
  const [table, setTable] = useState("");
  const [options, setOptions] = useState({ engines: [], channels: [] });
  const [result, setResult] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(true);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const limit = 50;

  const query = useCallback((extra = {}) => {
    const parameters = new URLSearchParams({ db: databaseId, table, limit: String(limit), offset: String(offset), ...appliedFilters, ...extra });
    [...parameters.entries()].forEach(([key, value]) => { if (!value) parameters.delete(key); });
    return parameters;
  }, [databaseId, table, offset, appliedFilters]);

  useEffect(() => {
    let active = true;
    requestJson("/api/admin/sqlite")
      .then((data) => {
        if (!active) return;
        setDatabaseId(data.databases.find((item) => item.exists)?.id || data.databases[0]?.id || "");
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [requestJson]);

  useEffect(() => {
    if (!databaseId) return;
    let active = true;
    setBusy(true);
    setError("");
    setResult(null);
    requestJson(`/api/admin/sqlite/tables?db=${encodeURIComponent(databaseId)}`)
      .then((data) => {
        if (!active) return;
        setTable(data.tables[0] || "");
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [databaseId, requestJson]);

  useEffect(() => {
    if (!databaseId || !table) return;
    let active = true;
    requestJson(`/api/admin/sqlite/options?db=${encodeURIComponent(databaseId)}&table=${encodeURIComponent(table)}`)
      .then((data) => active && setOptions(data))
      .catch((requestError) => active && setError(requestError.message));
    return () => { active = false; };
  }, [databaseId, table, requestJson]);

  useEffect(() => {
    if (!databaseId || !table) return;
    let active = true;
    setBusy(true);
    setError("");
    requestJson(`/api/admin/sqlite/rows?${query()}`)
      .then((data) => active && setResult(data))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [databaseId, table, offset, appliedFilters, query, requestJson]);

  const columns = result?.columns ?? [];
  const columnNames = useMemo(() => new Set(columns.map((column) => column.name)), [columns]);
  const canPageBack = offset > 0;
  const canPageForward = result && offset + result.rows.length < result.total;

  const applyFilters = (event) => {
    event.preventDefault();
    setOffset(0);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setOffset(0);
    setAppliedFilters(initialFilters);
  };

  const download = async (kind) => {
    setActionBusy(kind);
    setError("");
    try {
      const parameters = kind === "export" ? query({ offset: "" }) : new URLSearchParams({ db: databaseId });
      const response = await fetch(`/api/admin/sqlite/${kind}?${parameters}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Download failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || (kind === "backup" ? "history.sqlite3" : "sqlite-history.csv");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionBusy("");
    }
  };

  const checkDatabase = async () => {
    setActionBusy("check");
    setError("");
    setMessage("");
    try {
      const data = await requestJson(`/api/admin/sqlite/check?db=${encodeURIComponent(databaseId)}`, { method: "POST" });
      setMessage(data.ok ? "SQLite quick check passed: database is healthy." : `Integrity issue: ${data.messages.join("; ")}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionBusy("");
    }
  };

  return (
    <Box sx={{ minWidth: 0, border: "1px solid #364153", borderRadius: 2, overflow: "hidden", bgcolor: "#182231" }}>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 600 }}>Database</Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 0.5 }}>History data written by the Modbus collector and used by consumption and trend pages.</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" disabled={!databaseId || Boolean(actionBusy)} onClick={checkDatabase} sx={{ color: "#cbd5e1", borderColor: "#475569", textTransform: "none" }}>{actionBusy === "check" ? "Checking..." : "Check integrity"}</Button>
            <Button size="small" variant="outlined" disabled={!databaseId || Boolean(actionBusy)} onClick={() => download("backup")} sx={{ color: "#cbd5e1", borderColor: "#475569", textTransform: "none" }}>{actionBusy === "backup" ? "Preparing..." : "Download backup"}</Button>
          </Box>
        </Box>

        {(error || message) && (error ? <Alert severity="error">{error}</Alert> : <Alert severity="success">{message}</Alert>)}

        <Box component="form" onSubmit={applyFilters} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "120px minmax(180px, 1fr) 190px 190px auto" }, gap: 1.5, alignItems: "start" }}>
          <TextField select size="small" label="Engine" disabled={!columnNames.has("Engine")} value={filters.engine} onChange={(event) => setFilters((current) => ({ ...current, engine: event.target.value }))} sx={fieldSx}>
            <MenuItem value="">All engines</MenuItem>
            {options.engines.map((engine) => <MenuItem key={engine} value={String(engine)}>{engine}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Channel Description" disabled={!columnNames.has("Channel Description")} value={filters.channel} onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))} sx={fieldSx}>
            <MenuItem value="">All channels</MenuItem>
            {options.channels.map((channel) => <MenuItem key={channel} value={channel}>{channel}</MenuItem>)}
          </TextField>
          <TextField size="small" label="From" type="datetime-local" disabled={!columnNames.has("Timestamp")} value={filters.start} onChange={(event) => setFilters((current) => ({ ...current, start: event.target.value }))} InputLabelProps={{ shrink: true }} sx={fieldSx} />
          <TextField size="small" label="To" type="datetime-local" disabled={!columnNames.has("Timestamp")} value={filters.end} onChange={(event) => setFilters((current) => ({ ...current, end: event.target.value }))} InputLabelProps={{ shrink: true }} sx={fieldSx} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button type="submit" variant="contained" disabled={busy || !table} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Apply</Button>
            <Button type="button" onClick={clearFilters} disabled={busy} sx={{ color: "#94a3b8", textTransform: "none" }}>Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ height: 3, bgcolor: "#364153" }}>{busy && <LinearProgress sx={{ height: 3 }} />}</Box>
      <TableContainer sx={{ maxHeight: 540 }}>
        <Table stickyHeader size="small" aria-label="SQLite table rows">
          <TableHead><TableRow>{columns.map((column) => <TableCell key={column.cid} sx={{ bgcolor: "#263449", color: "#94a3b8", borderColor: "#364153", whiteSpace: "nowrap" }}>{column.name}<Typography component="span" sx={{ display: "block", color: "#64748b", fontSize: 10 }}>{column.type || "ANY"}{column.pk ? " · PK" : ""}</Typography></TableCell>)}</TableRow></TableHead>
          <TableBody>
            {(result?.rows ?? []).map((row, rowIndex) => <TableRow key={`${offset}-${rowIndex}`} hover>{row.map((value, index) => <TableCell key={columns[index]?.cid ?? index} sx={{ color: "#cbd5e1", borderColor: "#364153", fontSize: 12, whiteSpace: "nowrap", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>{value === null ? <Box component="span" sx={{ color: "#64748b" }}>NULL</Box> : String(value)}</TableCell>)}</TableRow>)}
            {!busy && !(result?.rows?.length) && <TableRow><TableCell colSpan={Math.max(columns.length, 1)} sx={{ color: "#94a3b8", borderColor: "#364153", height: 120, textAlign: "center" }}>{table ? "No rows match the current filters." : "No table is available."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, borderTop: "1px solid #364153", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
        <Box>
          <Typography sx={{ color: "#cbd5e1", fontSize: 12 }}>{result ? `${result.total.toLocaleString()} matching rows` : "Loading table summary..."}</Typography>
          {result?.earliest && <Typography sx={{ color: "#94a3b8", fontSize: 11, mt: 0.25 }}>{result.earliest} → {result.latest} · {result.indexes.length} index(es)</Typography>}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" disabled={!result || busy || Boolean(actionBusy)} onClick={() => download("export")} sx={{ color: "#cbd5e1", borderColor: "#475569", textTransform: "none" }}>{actionBusy === "export" ? "Exporting..." : "Export filtered CSV"}</Button>
          <Button size="small" disabled={!canPageBack || busy} onClick={() => setOffset(Math.max(0, offset - limit))} sx={{ color: "#93c5fd", textTransform: "none" }}>Previous</Button>
          <Chip size="small" label={`${result?.total ? offset + 1 : 0}–${Math.min(offset + limit, result?.total ?? 0)}`} sx={{ bgcolor: "#263449", color: "#cbd5e1" }} />
          <Button size="small" disabled={!canPageForward || busy} onClick={() => setOffset(offset + limit)} sx={{ color: "#93c5fd", textTransform: "none" }}>Next</Button>
        </Box>
      </Box>
    </Box>
  );
}
