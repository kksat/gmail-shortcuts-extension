import { interpolate, useCurrentFrame } from "remotion";
import {
  FeatureHeading,
  Icon,
  Keycap,
  MailWindow,
  RED,
  Reveal,
  Scene,
  clamp,
} from "../components";

export const Snooze = () => {
  const frame = useCurrentFrame();
  const press = interpolate(frame, [88, 94, 103, 110], [0, 1, 1, 0], clamp);
  return (
    <Scene section="01 / SNOOZE">
      <FeatureHeading
        eyebrow="MAKE SPACE FOR WHAT MATTERS"
        description="Open the Snooze menu. Press T. Back to your day."
      >
        Snooze.
        <br />
        One key.
        <br />
        <span style={{ color: RED }}>Done.</span>
      </FeatureHeading>
      <Reveal
        delay={24}
        style={{
          position: "absolute",
          left: 103,
          top: 790,
          display: "flex",
          gap: 28,
          alignItems: "center",
        }}
      >
        <Keycap size={100} red press={press}>
          T
        </Keycap>
        <div style={{ fontSize: 38, fontWeight: 700 }}>Tomorrow</div>
      </Reveal>
      <Reveal
        delay={8}
        style={{
          position: "absolute",
          left: 835,
          top: 290,
          width: 985,
          height: 610,
        }}
      >
        <MailWindow removed={frame >= 142} selected={frame >= 142 ? -1 : 0}>
          <div
            style={{
              position: "absolute",
              top: 119,
              left: 610,
              color: RED,
              opacity: frame < 125 ? 1 : 0,
            }}
          >
            <Icon name="clock" size={32} />
          </div>
          <div
            style={{
              position: "absolute",
              right: 45,
              top: 158,
              width: 350,
              background: "white",
              borderRadius: 13,
              boxShadow: "0 10px 35px #00000030",
              opacity: interpolate(
                frame,
                [28, 40, 118, 130],
                [0, 1, 1, 0],
                clamp,
              ),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px 26px",
                fontSize: 29,
                fontWeight: 700,
                borderBottom: "1px solid #eee",
              }}
            >
              Snooze until
            </div>
            {[
              "Tomorrow",
              "Later this week",
              "Next week",
              "Pick date & time",
            ].map((label, i) => (
              <div
                key={label}
                style={{
                  padding: "17px 25px",
                  fontSize: 27,
                  background: i === 0 && frame >= 94 ? "#e8f0fe" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {label}
                {i === 0 && frame >= 94 ? (
                  <Icon name="check" color="#1a73e8" />
                ) : null}
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 19,
              background: "#202124",
              color: "white",
              padding: "16px 12px",
              borderRadius: 9,
              textAlign: "center",
              opacity: interpolate(
                frame,
                [38, 46, 115, 128],
                [0, 1, 1, 0],
                clamp,
              ),
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              Snooze: [T] Tomorrow | [W] Next week | [M] Later this week | [D]
              Pick date | [Esc] Cancel
            </div>
            <div style={{ color: "#a8c7fa", marginTop: 8, fontSize: 18 }}>
              [1] Tomorrow · [2] Later this week · [3] Next week
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 240,
              right: 65,
              background: "#137333",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
              borderRadius: 12,
              fontSize: 27,
              opacity: interpolate(frame, [135, 149], [0, 1], clamp),
              translate: interpolate(
                frame,
                [135, 151],
                ["0px 18px", "0px 0px"],
                clamp,
              ),
            }}
          >
            <Icon name="check" />
            Snoozed until tomorrow
          </div>
        </MailWindow>
      </Reveal>
    </Scene>
  );
};
