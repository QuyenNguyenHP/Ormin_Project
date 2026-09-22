import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, LinearProgress, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";

const addressError = (row, value) => {
  const start = { holding_register: 40001, discrete_input: 10001 }[row.source_type];
  const count = row.source_type === "holding_register" ? Number(row.register_count) : 1;
  const end = start + 65536 - count;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return "Enter a whole number.";
  if (start === undefined) return "Unsupported signal source.";
  if (Number(value) < start || Number(value) > end) return `Use ${start}–${end}.`;
  return "";
};

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
    const invalid = changes.find((row) => addressError(row, drafts[row.path]));
    if (invalid) {
      setError(`${invalid.label} (${invalid.page}): ${addressError(invalid, drafts[invalid.path])} No changes were saved.`);
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
  const pagesFor = (row) => row.pages ?? [row.page];
  const visible = rows.filter((row) => (!page || pagesFor(row).includes(page)) && `${row.label} ${row.key} ${row.path} ${row.address} ${pagesFor(row).join(" ")} ${(row.usages ?? []).map((usage) => `${usage.label} ${usage.key} ${usage.path}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <Box sx={{ minWidth: 0, border: "1px solid #364153", borderRadius: 2, overflow: "hidden", bgcolor: "#182231" }}>
      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ color: "#f8fafc", fontSize: 18, fontWeight: 600 }}>Signal addresses</Typography>
          <Chip size="small" label={`${rows.length} signals`} sx={{ bgcolor: "#263449", color: "#cbd5e1", fontSize: 12 }} />
          {changes.length > 0 && <Chip size="small" label={`${changes.length} unsaved`} sx={{ bgcolor: "#3c3323", color: "#fcd34d", fontSize: 12 }} />}
        </Box>
        <Typography sx={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>Each signal is defined once. Saving its address updates all pages listed under Used by. Visible Modbus addresses start at <Box component="span" sx={{ color: "#cbd5e1" }}>40001</Box> for holding registers and <Box component="span" sx={{ color: "#cbd5e1" }}>10001</Box> for discrete inputs.</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "180px minmax(0, 1fr)" }, gap: 1.5 }}>
          <TextField select size="small" label="Page" value={page} onChange={(event) => setPage(event.target.value)} sx={fieldSx}>
            <MenuItem value="">All pages</MenuItem>
            {[...new Set(rows.flatMap(pagesFor))].sort().map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Search signal / address" value={search} onChange={(event) => setSearch(event.target.value)} sx={fieldSx} />
        </Box>
      </Box>
      <Box sx={{ height: 3, bgcolor: "#364153" }}>{busy && <LinearProgress aria-label="Loading or saving addresses" sx={{ height: 3 }} />}</Box>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small" aria-label="Signal address mappings" sx={{ minWidth: 560, tableLayout: "fixed", "& .MuiTableCell-root": { borderColor: "#364153", px: 2, py: 1.25, color: "#cbd5e1" }, "& .MuiTableCell-head": { bgcolor: "#263449", color: "#94a3b8", fontSize: 12, fontWeight: 600 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Signal / ID</TableCell>
              <TableCell sx={{ width: 140 }}>Used by / source</TableCell>
              <TableCell sx={{ width: 132 }}>Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => {
              const changed = drafts[row.path] !== undefined && drafts[row.path] !== String(row.address);
              const validationError = changed ? addressError(row, drafts[row.path]) : "";
              return (
                <TableRow key={row.path} sx={{ bgcolor: changed ? "#233348" : "transparent", "&:hover": { bgcolor: "#263449" } }}>
                  <TableCell sx={{ borderLeft: changed ? "3px solid #51a2ff" : "3px solid transparent" }}>
                    <Typography sx={{ color: "#f8fafc", fontSize: 13, fontWeight: 500, overflowWrap: "anywhere" }}>{row.label}</Typography>
                    <Tooltip title={(row.usages ?? []).map((usage) => usage.path).join(" · ") || row.path} placement="top-start" arrow>
                      <Typography tabIndex={0} sx={{ mt: 0.5, color: "#94a3b8", fontSize: 11, fontFamily: "monospace", overflowWrap: "anywhere" }}>{row.path}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, overflowWrap: "anywhere" }}>{pagesFor(row).join(", ") || "Not used"}</Typography>
                    {pagesFor(row).length > 1 && <Typography sx={{ fontSize: 11, color: "#93c5fd", mt: 0.5 }}>Shared signal</Typography>}
                    <Typography sx={{ color: "#94a3b8", fontSize: 11, mt: 0.5, overflowWrap: "anywhere" }}>{row.source_type} · {row.register_count} reg.</Typography>
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth size="small" type="number" disabled={busy} error={Boolean(validationError)} helperText={validationError} sx={{ ...fieldSx, "& .MuiInputBase-input": { px: 1.25, py: 1, fontSize: 13, fontFamily: "monospace" }, "& .MuiOutlinedInput-root.Mui-error fieldset": { borderColor: "#f87171" }, "& .MuiFormHelperText-root.Mui-error": { color: "#fca5a5", mx: 0 } }} inputProps={{ min: row.source_type === "holding_register" ? 40001 : 10001, step: 1, "aria-label": `Address for ${row.path}` }} value={drafts[row.path] ?? String(row.address)} onChange={(event) => { setDrafts((current) => ({ ...current, [row.path]: event.target.value })); setError(""); setMessage(""); }} />
                    {changed && <Typography sx={{ color: "#93c5fd", fontSize: 11, mt: 0.5 }}>Was {row.address}</Typography>}
                  </TableCell>
                </TableRow>
              );
            })}
            {!visible.length && <TableRow><TableCell colSpan={3} sx={{ textAlign: "center", height: 140 }}>
              <Typography sx={{ fontSize: 14, color: "#94a3b8" }}>{busy ? "Loading signals..." : error ? "Unable to load signals. Try reloading." : rows.length ? "No signals match your filters." : "No signal addresses available."}</Typography>
              {!busy && (search || page) && <Button size="small" onClick={() => { setSearch(""); setPage(""); }} sx={{ mt: 1, color: "#93c5fd", textTransform: "none" }}>Clear filters</Button>}
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      {(error || message) && <Box sx={{ px: 2, pt: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success" role="status">{message}</Alert>}
      </Box>}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, p: 2, borderTop: "1px solid #364153" }}>
        <Typography role="status" sx={{ color: "#94a3b8", fontSize: 12 }}>{busy ? "Loading / saving..." : `${visible.length} of ${rows.length} signals`}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button size="small" variant="outlined" disabled={busy} onClick={load} sx={{ color: "#cbd5e1", borderColor: "#475569", textTransform: "none", "&.Mui-disabled": { color: "#64748b", borderColor: "#364153" } }}>Reload / discard edits</Button>
          <Button size="small" variant="contained" disabled={busy || !changes.length} onClick={save} sx={{ bgcolor: "#155dfc", textTransform: "none", "&.Mui-disabled": { color: "#94a3b8", bgcolor: "#263449" } }}>Save addresses ({changes.length})</Button>
        </Box>
      </Box>
    </Box>
  );
}
