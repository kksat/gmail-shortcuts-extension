import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, staticFile } from "remotion";
import { Intro } from "./scenes/Intro";
import { Snooze } from "./scenes/Snooze";
import { Search } from "./scenes/Search";
import { Navigate } from "./scenes/Navigate";
import { Setup } from "./scenes/Setup";
import { Outro } from "./scenes/Outro";

export const Promo = () => (
  <AbsoluteFill style={{ background: "#f7f6f2" }}>
    <Audio src={staticFile("soundtrack.wav")} />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={150} name="Less clicking">
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence durationInFrames={240} name="One-key snooze">
        <Snooze />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence
        durationInFrames={240}
        name="Sender and subject search"
      >
        <Search />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence
        durationInFrames={210}
        name="Keyboard navigation"
      >
        <Navigate />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence
        durationInFrames={210}
        name="Enable Gmail shortcuts"
      >
        <Setup />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />
      <TransitionSeries.Sequence durationInFrames={210} name="Make it yours">
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
