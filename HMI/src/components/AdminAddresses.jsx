import { useEffect, useState } from "react";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";

export default function AdminAddresses({ requestJson, fieldSx }) {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [page, setPage] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await requestJson("/api/admin/addresses");
      setRows(data.addresses);
      setDrafts({});
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);
  const changes = rows.filter((row) => drafts[row.path] !== undefined && drafts[row.path] !== String(row.address));
  const save = async () => {
    setError("");
    setMessage("");
    if (changes.some((row) => !/^\d+$/.test(drafts[row.path]) || !Number.isSafeInteger(Number(drafts[row.path])))) {
      setError("Addresses must be whole numbers.");
      return;
    }
    setBusy(true);
    try {
      const data = await requestJson("/api/admin/addresses", {
        method: "PUT",
        body: JSON.stringify({ changes: changes.map((row) => ({ path: row.path, previous_address: row.address, address: Number(drafts[row.path]) })) }),
      });
      setRows(data.addresses);
      setDrafts({});
      setMessage(data.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const visible = rows.filter((row) => (!page || row.page === page) && `${row.label} ${row.key} ${row.path} ${row.address}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Box className="w-full !pt-8 flex flex-col gap-4">
      <Typography variant="h6" className="!text-[#f8fafc]">Signal addresses</Typography>
      <Typography className="!text-[#94a3b8]">Use visible Modbus addresses (40001 for holding registers, 10001 for discrete inputs). Each row updates only the indicated page mapping.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      <Box className="flex flex-wrap gap-3">
        <TextField select label="Page" value={page} onChange={(event) => setPage(event.target.value)} sx={{ ...fieldSx, minWidth: 200 }}>
          <MenuItem value="">All pages</MenuItem>
          {[...new Set(rows.map((row) => row.page))].map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
        </TextField>
        <TextField label="Search signal / address" value={search} onChange={(event) => setSearch(event.target.value)} sx={fieldSx} />
      </Box>
      <Box className="flex flex-wrap gap-3">
        <Button variant="contained" disabled={busy || !changes.length} onClick={save}>Save addresses ({changes.length})</Button>
        <Button variant="outlined" disabled={busy} onClick={load}>Reload / discard edits</Button>
      </Box>
      <Typography className="!text-[#94a3b8]">{busy ? "Loading / saving..." : `${visible.length} signals`}</Typography>
      <Box className="max-h-[500px] overflow-auto flex flex-col gap-3">
        {visible.map((row) => (
          <Box key={row.path} className="flex flex-wrap items-center gap-3 border-b border-[#475569] !pb-3">
            <Box className="flex-1 min-w-[220px]">
              <Typography className="!text-[#f8fafc]">{row.label}</Typography>
              <Typography className="!text-[#94a3b8] !text-xs break-all">{row.path}</Typography>
              <Typography className="!text-[#94a3b8] !text-xs">{row.source_type} · {row.register_count} register(s)</Typography>
            </Box>
            <TextField label="Address" type="number" disabled={busy} sx={{ ...fieldSx, width: 170 }} inputProps={{ step: 1, "aria-label": `Address for ${row.path}` }} value={drafts[row.path] ?? String(row.address)} onChange={(event) => setDrafts((current) => ({ ...current, [row.path]: event.target.value }))} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
