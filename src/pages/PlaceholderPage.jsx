import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";

const PlaceholderPage = ({ title, subtitle }) => {
  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-center justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-hidden flex flex-col items-center justify-center !pt-[15px] !pb-0 !pl-10 !pr-10 max-w-full shrink-0 mq925:h-auto">
            <Typography
              variant="h2"
              component="h1"
              className="!m-0 text-[32px] font-[Inter] font-bold text-[#f8fafc]"
            >
              {title}
            </Typography>
            <Typography className="!mt-4 !mb-0 text-[14px] text-[#cbd5e1] max-w-[880px] text-center">
              {subtitle || "Nội dung sẽ được phát triển sau."}
            </Typography>
          </Box>
        </section>
      </main>
      <Footer />
    </Box>
  );
};

export default PlaceholderPage;
