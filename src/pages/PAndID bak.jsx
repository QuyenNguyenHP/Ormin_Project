import { Box } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";

const PAndID = () => {
  return (
    <Box className="h-[1080px] relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header />
      <main className="self-stretch h-[955px] overflow-hidden shrink-0 flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="h-[948px] w-[1696px] overflow-hidden shrink-0 flex items-start !p-4 box-border gap-4 max-w-full text-center text-xs text-[#ff0909] font-[Roboto] mq925:h-auto">
          <Box className="h-[916px] flex-1 rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border overflow-hidden flex flex-col items-start !pt-[15px] !pb-0 !pl-4 !pr-4 max-w-full shrink-0 mq925:h-auto">
            <Box className="w-[1630px] h-[917px] flex flex-col items-end !pt-[45.8px] !pb-[29.8px] !pl-[58px] !pr-[70px] box-border gap-[8.5px] bg-[url('/public/Monitor-items@3x.png')] bg-cover bg-no-repeat bg-[top] max-w-full shrink-0 mq450:!pt-5 mq450:box-border mq925:h-auto mq925:!pt-[30px] mq925:!pb-5 mq925:box-border mq1350:!pl-[29px] mq1350:!pr-[35px] mq1350:box-border">
              <img
                className="w-[1630px] relative max-h-full object-cover hidden shrink-0"
                alt=""
                src="/P-ID-1630-1@2x.png"
              />
              <section className="flex items-start justify-end !pt-0 !pb-[49.3px] !pl-0.5 !pr-0.5 box-border max-w-full shrink-0 text-center text-xs text-[#ff0909] font-[Roboto]">
                <Box className="flex flex-col items-end gap-[0.8px] max-w-full">
                  <Box className="flex items-start !pt-0 !pb-[29.4px] !pl-0 !pr-0">
                    <div className="h-3.5 w-[73.9px] relative inline-block z-[1]">
                      100 L/H
                    </div>
                  </Box>
                  <Box className="w-[1313.3px] flex items-start justify-between gap-5 max-w-full mq925:flex-wrap mq925:justify-center">
                    <Box className="flex flex-col items-start !pt-[11.9px] !pb-0 !pl-0 !pr-0">
                      <img
                        className="w-[43.3px] relative max-h-full z-[1]"
                        loading="lazy"
                        alt=""
                        src="/pump-1.svg"
                      />
                    </Box>
                    <Box className="h-[34.9px] w-[454.3px] relative max-w-full">
                      <Box className="absolute top-[21.3px] left-[0px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px] z-[1]" />
                      <Box className="absolute top-[0px] left-[0px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px] z-[1]" />
                    </Box>
                    <Box className="w-[146px] flex flex-col items-start">
                      <div className="w-[73.9px] h-3.5 relative inline-block shrink-0 z-[1]">
                        100 L/H
                      </div>
                    </Box>
                    <Box className="flex flex-col items-start !pt-[6.8px] !pb-0 !pl-0 !pr-0">
                      <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                        100 L/H
                      </div>
                    </Box>
                  </Box>
                  <Box className="w-[1315px] flex items-start max-w-full">
                    <Box className="h-[49.2px] w-[970.4px] relative max-w-full mq925:h-auto mq925:min-h-[49.2px]">
                      <Box className="absolute top-[0px] left-[243.6px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px] z-[1]" />
                      <Box className="absolute top-[12.7px] left-[0px] w-full flex items-start justify-between gap-5 max-w-full mq925:flex-wrap mq925:gap-5">
                        <Box className="flex flex-col items-start !pt-[5.1px] !pb-0 !pl-0 !pr-0">
                          <Box className="flex items-start gap-[9.3px] mq450:flex-wrap">
                            <Box className="flex flex-col items-start !pt-0 !pb-0 !pl-0 !pr-[13px]">
                              <img
                                className="w-[45px] relative max-h-full z-[1]"
                                loading="lazy"
                                alt=""
                                src="/pump-1.svg"
                              />
                            </Box>
                            <Box className="flex flex-col items-start !pt-[8.5px] !pb-0 !pl-0 !pr-0">
                              <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                                99 L/H
                              </div>
                            </Box>
                            <Box className="flex flex-col items-start !pt-[4.3px] !pb-0 !pl-0 !pr-[33px]">
                              <img
                                className="w-[46.3px] h-[20.4px] relative z-[1]"
                                loading="lazy"
                                alt=""
                                src="/TSH-D-O-service-tank.svg"
                              />
                            </Box>
                            <Box className="flex flex-col items-start !pt-[4.3px] !pb-0 !pl-0 !pr-0">
                              <Box className="w-[26.3px] h-[19.5px] relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                            </Box>
                          </Box>
                        </Box>
                        <div className="h-3.5 w-[73.9px] relative inline-block z-[1]">
                          100 L/H
                        </div>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </section>
              <section className="flex flex-col items-end gap-[21.6px] max-w-full shrink-0 text-center text-xs text-[#ff0909] font-[Roboto]">
                <Box className="flex flex-col items-end gap-[8.5px] max-w-full">
                  <Box className="w-[984px] flex items-start justify-between gap-5 max-w-full mq925:flex-wrap mq925:gap-5">
                    <Box className="w-[635.9px] flex items-start justify-center gap-[78.2px] max-w-full mq450:gap-5 mq925:gap-[39px] mq925:flex-wrap">
                      <Box className="flex flex-col items-start !pt-[27.2px] !pb-0 !pl-0 !pr-0">
                        <Box className="flex items-end gap-[8.9px]">
                          <img
                            className="h-[20.4px] w-[46.3px] relative z-[1]"
                            loading="lazy"
                            alt=""
                            src="/TSH-D-O-service-tank.svg"
                          />
                          <Box className="flex flex-col items-start justify-end !pt-0 !pb-[31.4px] !pl-0 !pr-[11px]">
                            <Box className="w-[13.6px] h-[13.6px] relative bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                          </Box>
                          <Box className="h-[58.5px] w-[26.3px] relative">
                            <Box className="absolute top-[0px] left-[0px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px] z-[1]" />
                            <Box className="absolute top-[39px] left-[0px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px] z-[1]" />
                          </Box>
                        </Box>
                      </Box>
                      <Box className="flex flex-col items-start !pt-[14.4px] !pb-0 !pl-0 !pr-[31px]">
                        <Box className="flex flex-col items-end gap-[18.7px]">
                          <img
                            className="w-[43.3px] relative max-h-full z-[1]"
                            loading="lazy"
                            alt=""
                            src="/pump-1.svg"
                          />
                          <img
                            className="w-[45px] relative max-h-full z-[1]"
                            loading="lazy"
                            alt=""
                            src="/pump-1.svg"
                          />
                        </Box>
                      </Box>
                      <Box className="flex flex-col items-end !pt-0 !pb-0 !pl-0 !pr-[90px] gap-[18.6px]">
                        <img
                          className="w-[43.3px] relative max-h-full z-[1]"
                          loading="lazy"
                          alt=""
                          src="/pump-1.svg"
                        />
                        <img
                          className="w-[45px] relative max-h-full z-[1]"
                          loading="lazy"
                          alt=""
                          src="/pump-1.svg"
                        />
                      </Box>
                      <Box className="flex flex-col items-start !pt-[46.7px] !pb-0 !pl-0 !pr-0">
                        <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                          100 L/H
                        </div>
                      </Box>
                    </Box>
                    <Box className="flex flex-col items-start gap-[36.9px]">
                      <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                        100 L/H
                      </div>
                      <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                        100 L/H
                      </div>
                    </Box>
                  </Box>
                  <Box className="flex items-start justify-end !pt-0 !pb-0 !pl-[348px] !pr-[348px] mq450:!pl-5 mq450:!pr-5 mq450:box-border mq925:!pl-[174px] mq925:!pr-[174px] mq925:box-border">
                    <div className="h-3.5 w-[73.9px] relative inline-block z-[1]">
                      100 L/H
                    </div>
                  </Box>
                </Box>
                <Box className="flex items-start justify-end !pt-0 !pb-0 !pl-0 !pr-0.5 box-border max-w-full">
                  <Box className="w-[1314.2px] flex items-start justify-between gap-5 max-w-full mq925:flex-wrap mq925:gap-5">
                    <Box className="flex items-start gap-[22.1px] mq450:flex-wrap">
                      <Box className="flex flex-col items-start !pt-[12.8px] !pb-0 !pl-0 !pr-0">
                        <Box className="flex flex-col items-end gap-[18.6px]">
                          <img
                            className="w-[43.3px] relative max-h-full z-[1]"
                            loading="lazy"
                            alt=""
                            src="/pump-1.svg"
                          />
                          <img
                            className="w-[45px] relative max-h-full z-[1]"
                            loading="lazy"
                            alt=""
                            src="/pump-1.svg"
                          />
                        </Box>
                      </Box>
                      <Box className="flex items-start relative isolate">
                        <img
                          className="h-[20.4px] w-[46.3px] absolute !!m-[0 important] right-[20.8px] bottom-[7.6px] z-[1]"
                          loading="lazy"
                          alt=""
                          src="/TSH-D-O-service-tank.svg"
                        />
                        <Box className="w-[149.4px] flex flex-col items-start !pt-[68px] !pb-0 !pl-0 !pr-0 box-border">
                          <div className="w-[73.9px] h-[24.6px] relative inline-block shrink-0 z-[1]">
                            100 L/H
                          </div>
                        </Box>
                      </Box>
                      <Box className="flex flex-col items-start gap-[7.9px]">
                        <Box className="w-[26.3px] flex items-start !pt-0 !pb-0 !pl-[3px] !pr-[9px] box-border">
                          <Box className="h-[13.6px] w-[13.6px] relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                        </Box>
                        <Box className="w-[26.3px] flex items-start !pt-0 !pb-0 !pl-[3px] !pr-[9px] box-border">
                          <Box className="h-[13.6px] w-[13.6px] relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                        </Box>
                        <Box className="w-[26.3px] flex items-start !pt-0 !pb-0 !pl-[3px] !pr-[9px] box-border">
                          <Box className="h-[13.6px] w-[13.6px] relative bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                        </Box>
                        <Box className="w-[26.3px] h-[19.5px] relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                      </Box>
                    </Box>
                    <Box className="flex flex-col items-start !pt-[52.7px] !pb-0 !pl-0 !pr-0">
                      <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                        100 L/H
                      </div>
                    </Box>
                  </Box>
                </Box>
              </section>
              <section className="flex flex-col items-start !pt-0 !pb-[29.7px] !pl-0 !pr-0 box-border gap-[5px] max-w-full shrink-0 text-center text-xs text-[#ff0909] font-[Roboto]">
                <Box className="flex items-start !pt-0 !pb-8 !pl-[1079px] !pr-px box-border max-w-full mq450:!pl-5 mq450:box-border mq925:!pl-[269px] mq925:box-border mq1350:!pl-[539px] mq1350:box-border">
                  <Box className="flex flex-col items-end gap-[75.1px] max-w-full shrink-0 mq450:gap-[38px]">
                    <Box className="flex flex-col items-start gap-[38.6px] max-w-full mq450:gap-[19px]">
                      <Box className="w-[420.2px] flex items-start justify-between gap-5 max-w-full mq450:flex-wrap mq450:gap-5">
                        <div className="h-3.5 w-[73.9px] relative inline-block z-[1]">
                          100 L/H
                        </div>
                        <Box className="flex flex-col items-start !pt-[2.6px] !pb-0 !pl-0 !pr-0">
                          <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                            100 L/H
                          </div>
                        </Box>
                      </Box>
                      <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                        100 L/H
                      </div>
                    </Box>
                    <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                      100 L/H
                    </div>
                  </Box>
                </Box>
                <Box className="w-[1152.2px] flex items-start !pt-0 !pb-0 !pl-px !pr-px box-border max-w-full">
                  <Box className="w-[1498.4px] flex items-start gap-[106.9px] max-w-[131%] shrink-0 mq450:gap-[27px] mq925:gap-[53px] mq1825:flex-wrap">
                    <Box className="h-[40.8px] w-[43.3px] flex flex-col items-start !pt-[10.2px] !pb-0 !pl-0 !pr-0 box-border shrink-0">
                      <img
                        className="w-[43.3px] relative max-h-full z-[1]"
                        loading="lazy"
                        alt=""
                        src="/pump-1.svg"
                      />
                    </Box>
                    <Box className="w-[818.5px] flex flex-col items-start !pt-[20.3px] !pb-0 !pl-0 !pr-0 box-border max-w-full">
                      <Box className="w-[13.6px] h-[13.6px] relative bg-[rgba(255,249,249,0)] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                    </Box>
                    <Box className="w-[242px] flex flex-col items-start">
                      <div className="w-[73.9px] h-3.5 relative inline-block shrink-0 z-[1]">
                        100 L/H
                      </div>
                    </Box>
                    <div className="h-[24.6px] w-[73.9px] relative inline-block z-[1]">
                      100 L/H
                    </div>
                  </Box>
                </Box>
                <Box className="w-[1151.2px] flex items-start justify-between gap-5 max-w-full mq1350:flex-wrap mq1350:gap-5">
                  <Box className="w-[347.2px] flex flex-col items-start !pt-[13.6px] !pb-0 !pl-0 !pr-0 box-border max-w-full">
                    <img
                      className="w-[45px] relative max-h-full z-[1]"
                      loading="lazy"
                      alt=""
                      src="/pump-1.svg"
                    />
                  </Box>
                  <Box className="h-[20.4px] w-7 relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                  <Box className="h-[20.4px] w-7 relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                  <Box className="w-[263.2px] flex flex-col items-start !pt-[1.7px] !pb-0 !pl-0 !pr-0 box-border">
                    <Box className="w-7 h-[20.4px] relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border z-[1]" />
                  </Box>
                  <Box className="flex flex-col items-start !pt-[7.7px] !pb-0 !pl-0 !pr-0">
                    <div className="w-[73.9px] h-3.5 relative inline-block z-[1]">
                      100 L/H
                    </div>
                  </Box>
                </Box>
              </section>
              <Box className="flex items-start justify-end !pt-0 !pb-0 !pl-[345px] !pr-[345px] shrink-0 mq925:!pl-[86px] mq925:!pr-[86px] mq925:box-border mq1350:!pl-[172px] mq1350:!pr-[172px] mq1350:box-border">
                <Box className="flex flex-col items-start gap-[10.2px]">
                  <Box className="flex items-start !pt-0 !pb-0 !pl-px !pr-px">
                    <img
                      className="w-[43.3px] relative max-h-full shrink-0 z-[1]"
                      loading="lazy"
                      alt=""
                      src="/pump-1.svg"
                    />
                  </Box>
                  <Box className="w-[291.7px] flex items-end justify-between gap-5 shrink-0">
                    <Box className="flex flex-col items-start !pt-0 !pb-0 !pl-0 !pr-2">
                      <img
                        className="w-[45px] relative max-h-full z-[1]"
                        loading="lazy"
                        alt=""
                        src="/pump-1.svg"
                      />
                    </Box>
                    <Box className="flex flex-col items-start justify-end !pt-0 !pb-[5.1px] !pl-0 !pr-0">
                      <Box className="flex items-end gap-[24.6px]">
                        <Box className="flex flex-col items-start justify-end !pt-0 !pb-[2.6px] !pl-0 !pr-0">
                          <Box className="w-[26.3px] h-[19.5px] relative bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border shrink-0 z-[1]" />
                        </Box>
                        <Box className="h-[34.8px] w-[13.6px] relative shrink-0">
                          <Box className="absolute top-[0px] left-[0px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px] z-[1]" />
                          <Box className="absolute top-[21.2px] left-[0px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px] z-[1]" />
                        </Box>
                      </Box>
                    </Box>
                    <Box className="flex flex-col items-start justify-end !pt-0 !pb-[7.7px] !pl-0 !pr-0">
                      <img
                        className="w-[46.3px] h-[20.4px] relative z-[1]"
                        loading="lazy"
                        alt=""
                        src="/TSH-D-O-service-tank.svg"
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box className="h-[841.3px] w-[1501px] relative hidden shrink-0">
            <Box className="absolute top-[801.4px] left-[1032.3px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[822.6px] left-[1032.3px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[814.2px] left-[981.4px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px]" />
            <img
              className="absolute top-[813.3px] left-[1109.6px] w-[46.3px] h-[20.4px]"
              alt=""
              src="/TSH-D-O-service-tank.svg"
            />
            <img
              className="absolute w-[3%] top-[calc(50%_-_315.35px)] right-[84.78%] left-[12.22%] max-w-full overflow-hidden h-[31.4px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[2.88%] top-[calc(50%_-_364.65px)] right-[84.78%] left-[12.33%] max-w-full overflow-hidden h-[30.6px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[2.88%] top-[calc(50%_-_73.45px)] right-[84.73%] left-[12.39%] max-w-full overflow-hidden h-[30.6px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[3%] top-[calc(50%_-_24.15px)] right-[84.73%] left-[12.27%] max-w-full overflow-hidden h-[31.4px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[2.88%] top-[calc(50%_-_210.95px)] right-[49.66%] left-[47.46%] max-w-full overflow-hidden h-[30.6px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[3%] top-[calc(50%_-_161.75px)] right-[49.66%] left-[47.34%] max-w-full overflow-hidden h-[31.4px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[2.88%] top-[calc(50%_-_225.35px)] right-[39.37%] left-[57.75%] max-w-full overflow-hidden h-[30.6px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[3%] top-[calc(50%_-_176.15px)] right-[39.37%] left-[57.63%] max-w-full overflow-hidden h-[31.4px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[2.88%] top-[calc(50%_+_340.05px)] right-[39.43%] left-[57.69%] max-w-full overflow-hidden h-[30.6px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[3%] top-[calc(50%_+_389.25px)] right-[39.43%] left-[57.57%] max-w-full overflow-hidden h-[31.4px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[2.88%] top-[calc(50%_+_221.15px)] right-[97%] left-[0.11%] max-w-full overflow-hidden h-[30.6px]"
              alt=""
              src="/pump-1.svg"
            />
            <img
              className="absolute w-[3%] top-[calc(50%_+_270.45px)] right-[97%] left-[0%] max-w-full overflow-hidden h-[31.4px]"
              alt=""
              src="/pump-1.svg"
            />
            <Box className="absolute top-[109.5px] left-[423.6px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px]" />
            <Box className="absolute top-[87.4px] left-[427px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[66.2px] left-[427px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[45px] left-[427px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <img
              className="absolute top-[109.5px] left-[334.5px] w-[46.3px] h-[20.4px]"
              alt=""
              src="/TSH-D-O-service-tank.svg"
            />
            <Box className="absolute top-[399px] left-[422.8px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px]" />
            <img
              className="absolute top-[399px] left-[333.6px] w-[46.3px] h-[20.4px]"
              alt=""
              src="/TSH-D-O-service-tank.svg"
            />
            <Box className="absolute top-[376.9px] left-[426.2px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[355.7px] left-[426.2px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[334.5px] left-[426.2px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[678.3px] left-[580.7px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-7 h-[20.4px]" />
            <Box className="absolute top-[677.5px] left-[449.9px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-7 h-[20.4px]" />
            <Box className="absolute top-[679.2px] left-[711.4px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-7 h-[20.4px]" />
            <Box className="absolute top-[652px] left-[152px] bg-[rgba(255,249,249,0)] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <Box className="absolute top-[222.4px] left-[606.2px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px]" />
            <Box className="absolute top-[261.5px] left-[606.2px] bg-[#fff] border-[#99a1af] border-solid border-[2px] box-border w-[26.3px] h-[19.5px]" />
            <img
              className="absolute top-[261.5px] left-[517px] w-[46.3px] h-[20.4px]"
              alt=""
              src="/TSH-D-O-service-tank.svg"
            />
            <Box className="absolute top-[236.9px] left-[572.2px] bg-[#fff9f9] border-[#99a1af] border-solid border-[2px] box-border w-[13.6px] h-[13.6px]" />
            <div className="absolute top-[631.6px] left-[1426.3px]">
              100 L/H
            </div>
            <div className="absolute top-[580.7px] left-[1426.3px]">
              100 L/H
            </div>
            <div className="absolute top-[438.9px] left-[1426.3px]">
              100 L/H
            </div>
            <div className="absolute top-[387.1px] left-[1424.6px]">
              100 L/H
            </div>
            <div className="absolute top-[245.3px] left-[1427.1px]">
              100 L/H
            </div>
            <div className="absolute top-[194.4px] left-[1426.3px]">
              100 L/H
            </div>
            <div className="absolute top-[50.9px] left-[1424.6px]">100 L/H</div>
            <div className="absolute top-[0px] left-[1423.7px]">100 L/H</div>
            <div className="absolute top-[685.1px] left-[1077.3px]">
              100 L/H
            </div>
            <div className="absolute top-[631.6px] left-[1077.3px]">
              100 L/H
            </div>
            <div className="absolute top-[491.5px] left-[1079.9px]">
              100 L/H
            </div>
            <div className="absolute top-[436.4px] left-[1079.9px]">
              100 L/H
            </div>
            <div className="absolute top-[298.8px] left-[1079px]">100 L/H</div>
            <div className="absolute top-[242px] left-[1079px]">100 L/H</div>
            <div className="absolute top-[100.2px] left-[1079.9px]">
              100 L/H
            </div>
            <div className="absolute top-[44.1px] left-[1079.9px]">100 L/H</div>
            <div className="absolute top-[402.4px] left-[251.3px]">100 L/H</div>
            <div className="absolute top-[113.8px] left-[251.3px]">100 L/H</div>
          </Box>
        </section>
      </main>
      <Footer />
    </Box>
  );
};

export default PAndID;
