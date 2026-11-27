import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { Keycap, RED, Reveal, Scene, clamp } from "../components";

export const Intro = () => {
  const frame = useCurrentFrame();
  return (
    <Scene section="THE INBOX, AT YOUR FINGERTIPS" duration={150}>
      <div style={{ position: "absolute", left: 100, top: 265 }}>
        <Reveal delay={4}>
          <div style={{ fontSize: 153, fontWeight: 800, letterSpacing: -8 }}>
            Less clicking.
          </div>
        </Reveal>
        <Reveal delay={18}>
          <div
            style={{
              fontSize: 153,
              fontWeight: 800,
              letterSpacing: -8,
              color: RED,
            }}
          >
            More doing.
          </div>
        </Reveal>
        <Reveal delay={34}>
          <div style={{ marginTop: 40, fontSize: 43, color: "#77736c" }}>
            Extra keyboard shortcuts. Right inside Gmail.
          </div>
        </Reveal>
        <Reveal delay={50}>
          <div
            style={{
              marginTop: 56,
              display: "flex",
              gap: 17,
              alignItems: "center",
              fontSize: 29,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            <span>SNOOZE</span>
            <span style={{ color: RED }}>·</span>
            <span>SEARCH</span>
            <span style={{ color: RED }}>·</span>
            <span>NAVIGATE</span>
          </div>
        </Reveal>
      </div>
      <Interactive.Div
        name="Hero T key"
        style={{
          position: "absolute",
          left: 1260,
          top: 383,
          opacity: interpolate(frame, [12, 30], [0, 1], clamp),
          translate: interpolate(
            frame,
            [12, 40],
            ["0px 100px", "0px 0px"],
            clamp,
          ),
          rotate: "-9deg",
        }}
      >
        <Keycap size={260} red>
          T
        </Keycap>
      </Interactive.Div>
      <Interactive.Div
        name="Sender-search key"
        style={{
          position: "absolute",
          left: 1530,
          top: 238,
          opacity: interpolate(frame, [28, 46], [0, 1], clamp),
          translate: interpolate(
            frame,
            [28, 56],
            ["0px 100px", "0px 0px"],
            clamp,
          ),
          rotate: "10deg",
        }}
      >
        <Keycap size={210}>;</Keycap>
      </Interactive.Div>
      <Interactive.Div
        name="Navigation key"
        style={{
          position: "absolute",
          left: 1545,
          top: 615,
          opacity: interpolate(frame, [40, 58], [0, 1], clamp),
          translate: interpolate(
            frame,
            [40, 68],
            ["0px 100px", "0px 0px"],
            clamp,
          ),
          rotate: "8deg",
        }}
      >
        <Keycap size={210}>g</Keycap>
      </Interactive.Div>
    </Scene>
  );
};
