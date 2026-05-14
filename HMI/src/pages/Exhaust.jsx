import { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import Cylinder_exh_temp from "../components/Cylinder_exh_temp";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const fallbackCylinderEngines = [
  {
    name: "Engine 1",
    cylinders: [
      { name: "Cyl 1", value: 410 },
      { name: "Cyl 2", value: 420 },
      { name: "Cyl 3", value: 428 },
      { name: "Cyl 4", value: 434 },
      { name: "Cyl 5", value: 442 },
      { name: "Cyl 6", value: 438 },
    ],
  },
  {
    name: "Engine 2",
    cylinders: [
      { name: "Cyl 1", value: 424 },
      { name: "Cyl 2", value: 432 },
      { name: "Cyl 3", value: 438 },
      { name: "Cyl 4", value: 444 },
      { name: "Cyl 5", value: 450 },
      { name: "Cyl 6", value: 447 },
    ],
  },
  {
    name: "Engine 3",
    cylinders: [
      { name: "Cyl 1", value: 436 },
      { name: "Cyl 2", value: 441 },
      { name: "Cyl 3", value: 446 },
      { name: "Cyl 4", value: 452 },
      { name: "Cyl 5", value: 457 },
      { name: "Cyl 6", value: 455 },
    ],
  },
  {
    name: "Engine 4",
    cylinders: [
      { name: "Cyl 1", value: 445 },
      { name: "Cyl 2", value: 450 },
      { name: "Cyl 3", value: 455 },
      { name: "Cyl 4", value: 462 },
      { name: "Cyl 5", value: 468 },
      { name: "Cyl 6", value: 464 },
    ],
  },
];

const fallbackTurbochargerEngines = [
  {
    name: "Engine 1",
    cylinders: [
      { name: "T/C inlet 1", value: 355 },
      { name: "T/C inlet 2", value: 348 },
      { name: "T/C outlet", value: 372 },
    ],
  },
  {
    name: "Engine 2",
    cylinders: [
      { name: "T/C inlet 1", value: 362 },
      { name: "T/C inlet 2", value: 356 },
      { name: "T/C outlet", value: 381 },
    ],
  },
  {
    name: "Engine 3",
    cylinders: [
      { name: "T/C inlet 1", value: 370 },
      { name: "T/C inlet 2", value: 365 },
      { name: "T/C outlet", value: 388 },
    ],
  },
  {
    name: "Engine 4",
    cylinders: [
      { name: "T/C inlet 1", value: 378 },
      { name: "T/C inlet 2", value: 371 },
      { name: "T/C outlet", value: 396 },
    ],
  },
];

const defaultSelectedEngineNames = ["Engine 1", "Engine 2", "Engine 3", "Engine 4"];

const normalizeEngineGroup = (backendEngines, fallbackEngines) => {
  if (!Array.isArray(backendEngines) || backendEngines.length === 0) {
    return fallbackEngines;
  }

  return backendEngines.map((engine, engineIndex) => ({
    name: engine.name ?? `Engine ${engineIndex + 1}`,
    cylinders: (engine.cylinders ?? []).map((point, pointIndex) => ({
      name: point.name ?? `Point ${pointIndex + 1}`,
      value: Number(point.value ?? 0),
    })),
  }));
};

const SelectEngineButtons = ({ engineNames, selectedEngineNames, onToggleEngine }) => (
  <Box className="mt-6 flex flex-wrap items-center gap-3">
    <Typography className="text-[#cbd5e1] font-medium">Select engines:</Typography>
    {engineNames.map((engineName) => {
      const isActive = selectedEngineNames.includes(engineName);

      return (
        <Box
          key={engineName}
          component="button"
          type="button"
          onClick={() => onToggleEngine(engineName)}
          className="rounded-[10px] border border-solid !px-4 !py-2 text-[14px] font-semibold transition-all duration-200"
          sx={{
            background: isActive
              ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
              : "linear-gradient(135deg, #0f172a 0%, #111827 100%)",
            borderColor: isActive ? "#60a5fa" : "#334155",
            boxShadow: isActive
              ? "0 10px 24px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)"
              : "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            color: isActive ? "#ffffff" : "#cbd5e1",
            opacity: isActive ? 1 : 0.82,
            transform: isActive ? "translateY(-1px)" : "translateY(0)",
            cursor: "pointer",
          }}
        >
          {engineName}
        </Box>
      );
    })}
  </Box>
);

const Exhaust = () => {
  const { payload, isLoading, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("exhaust");
  const modbusConnected = error ? false : payload ? true : null;
  const [selectedEngineNames, setSelectedEngineNames] = useState(defaultSelectedEngineNames);

  const cylinderExhaustEngines = useMemo(
    () =>
      normalizeEngineGroup(payload?.sections?.engines, fallbackCylinderEngines),
    [payload]
  );

  const turbochargerEngines = useMemo(
    () =>
      normalizeEngineGroup(payload?.sections?.turbocharger_temperatures?.engines, fallbackTurbochargerEngines),
    [payload]
  );

  const engineNames = cylinderExhaustEngines.map((engine) => engine.name);

  const toggleEngine = (engineName) => {
    setSelectedEngineNames((currentSelection) => {
      if (currentSelection.includes(engineName)) {
        if (currentSelection.length === 1) {
          return currentSelection;
        }

        return currentSelection.filter((name) => name !== engineName);
      }

      return [...currentSelection, engineName];
    });
  };

  const selectedCylinderExhaustEngines = cylinderExhaustEngines.filter((engine) =>
    selectedEngineNames.includes(engine.name)
  );
  const selectedTurbochargerEngines = turbochargerEngines.filter((engine) =>
    selectedEngineNames.includes(engine.name)
  );

  const cylinderFlatData = selectedCylinderExhaustEngines.flatMap((engine) => engine.cylinders);
  const hottestCylinderItem = cylinderFlatData.reduce(
    (currentMax, item) => (item.value > currentMax.value ? item : currentMax),
    cylinderFlatData[0] ?? { name: "--", value: 0 }
  );
  const cylinderAverage =
    cylinderFlatData.length > 0
      ? (cylinderFlatData.reduce((sum, item) => sum + item.value, 0) / cylinderFlatData.length).toFixed(1)
      : "--";

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="min-h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-auto flex flex-col items-start !p-4 max-w-full shrink-0">
          
            <SelectEngineButtons
              engineNames={engineNames}
              selectedEngineNames={selectedEngineNames}
              onToggleEngine={toggleEngine}
            />

            <Box className="mt-6 grid grid-cols-1 gap-4 w-full">
              {/* Box 1 */}
              <Box className="xl:row-start-1 xl:col-start-1">
                <Cylinder_exh_temp
                  chartHeight={290}
                  engines={selectedCylinderExhaustEngines}
                  title="Cylinder Exhaust Trend"
                  subtitle="Six cylinder bars inside each engine group, with a trend overlay showing Cyl 1 to Cyl 6 for that engine."
                  unit="C"
                />
              </Box>

                {/* Box 2 */}
              <Box className="rounded-[12px] bg-[#111827] border border-[#334155] p-5 xl:row-span-2 xl:col-start-2">
                <Typography className="text-[#fff] font-semibold">
                  Exhaust Summary
                </Typography>

                <Typography className="text-[#94a3b8] mt-3">
                  Engines displayed: {selectedCylinderExhaustEngines.length}
                </Typography>

                <Typography className="text-[#94a3b8] mt-2">
                  Total cylinder values: {cylinderFlatData.length}
                </Typography>

                <Typography className="text-[#94a3b8] mt-2">
                  Hottest cylinder point: {hottestCylinderItem.name} at {hottestCylinderItem.value} C
                </Typography>

                <Typography className="text-[#94a3b8] mt-2">
                  Average cylinder temperature: {cylinderAverage} C
                </Typography>
              </Box>

              {/* Box 3 */}
              <Box className="xl:row-start-2 xl:col-start-1">
                <Cylinder_exh_temp
                  chartHeight={290}
                  engines={selectedTurbochargerEngines}
                  title="Turbocharger Temperature Trend"
                  subtitle="Three turbocharger temperature bars inside each engine group, with a trend overlay showing T/C inlet 1 to outlet for that engine."
                  unit="C"
                />
              </Box>

            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={error ? "Disconnected" : payload ? "Connected" : "Connecting..."}
        pollIntervalMs={pollIntervalMs}
      />
    </Box>
  );
};

export default Exhaust;
