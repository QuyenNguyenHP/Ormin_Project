import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import EngineGauge from "../components/EngineGauge";
import { usePolledPagePayload } from "../hooks/usePolledPagePayload";

const fallbackInfoCards = [
  { title: "Network Status", value: "Connected" },
  { title: "Stations Online", value: "8 / 8" },
  { title: "Current Flow", value: "100 L/H" },
  { title: "System Mode", value: "Normal" },
  { title: "Network Status", value: "Connected" },
  { title: "Stations Online", value: "8 / 8" },
  { title: "Current Flow", value: "100 L/H" },
  { title: "System Mode", value: "Normal" },
];

const Overview = () => {
  const { payload, isLoading, error, lastUpdated, pollIntervalMs } = usePolledPagePayload("overview");
  const gauges = payload?.sections?.gauges ?? [];
  const modbusConnected = error ? false : payload ? true : null;

  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-auto flex flex-col items-start !pt-[32px] !pb-[32px] !pl-10 !pr-10 max-w-full shrink-0 mq925:h-auto">
            
            <Typography
              variant="h2"
              component="h1"
              className="!m-0 text-[32px] font-[Roboto] font-bold text-[#f8fafc]"
            >
              Overview
            </Typography>

            <Typography
              variant="body1"
              className="!mt-4 !mb-0 text-[14px] text-[#cbd5e1] max-w-[880px]"
            >
              This overview page now loads its gauge data from `/api/overview`, so the layout
              stays stable while the data source can move from mock values to live Modbus-backed
              values.
            </Typography>

            <Box className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-4 w-full">
              {isLoading ? (
                <Box className="lg:col-span-4 rounded-[12px] bg-[#111827] border border-[#334155] p-5">
                  <Typography className="text-[#fff] font-semibold">Loading overview data...</Typography>
                  <Typography className="text-[#94a3b8] mt-2">
                    Requesting gauge values from the backend and following its polling interval.
                  </Typography>
                </Box>
              ) : null}

              {!isLoading && error ? (
                <Box className="lg:col-span-4 rounded-[12px] bg-[#111827] border border-[#7f1d1d] p-5">
                  <Typography className="text-[#fecaca] font-semibold">Unable to load overview</Typography>
                  <Typography className="text-[#fca5a5] mt-2">{error}</Typography>
                </Box>
              ) : null}

              {!isLoading && !error && gauges.length === 0 ? (
                <Box className="lg:col-span-4 rounded-[12px] bg-[#111827] border border-[#334155] p-5">
                  <Typography className="text-[#fff] font-semibold">No overview data configured</Typography>
                  <Typography className="text-[#94a3b8] mt-2">
                    The backend responded successfully but did not return any gauges.
                  </Typography>
                </Box>
              ) : null}

              {!isLoading && !error
                ? gauges.map((engine) => (
                    <EngineGauge
                      key={engine.key}
                      title={engine.title}
                      subtitle={engine.subtitle}
                      max={engine.max ?? 750}
                      min={engine.min ?? 0}
                      value={engine.value}
                      unit={engine.unit}
                      color={engine.color}
                    />
                  ))
                : null}
            </Box>

           <Box className="mt-4 grid grid-cols-4 gap-4 w-full w-full"> 
            {fallbackInfoCards.map((card) => ( 
              <Box 
              key={card.title} 
              className="mt-0 grid grid-cols-2 rounded-[10px] bg-[#111827] border border-[#334155] p-5" > 
              <Typography className="text-[#fff] font-semibold">{card.title}</Typography> 
              <Typography className="text-[#94a3b8] mt-2">{card.value}</Typography>
               </Box>
               ))}
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

export default Overview;
