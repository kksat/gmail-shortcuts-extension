import { Composition, Folder } from "remotion";
import { Promo } from "./Promo";
import { Intro } from "./scenes/Intro";
import { Snooze } from "./scenes/Snooze";
import { Search } from "./scenes/Search";
import { Navigate } from "./scenes/Navigate";
import { Setup } from "./scenes/Setup";
import { Outro } from "./scenes/Outro";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ShortcutsForGmail"
        component={Promo}
        durationInFrames={1200}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={Intro}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Snooze"
          component={Snooze}
          durationInFrames={240}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Search"
          component={Search}
          durationInFrames={240}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Navigate"
          component={Navigate}
          durationInFrames={210}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Setup"
          component={Setup}
          durationInFrames={210}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Outro"
          component={Outro}
          durationInFrames={210}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
