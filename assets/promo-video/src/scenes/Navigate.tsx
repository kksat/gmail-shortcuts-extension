import { interpolate, useCurrentFrame } from "remotion";
import { Keycap, MailWindow, Reveal, Scene, clamp } from "../components";

export const Navigate = () => {
  const frame = useCurrentFrame();
  const stage = frame < 90 ? 0 : frame < 152 ? 1 : 2;
  const starts = [28, 90, 152];
  return (
    <Scene section="03 / NAVIGATE" dark duration={210}>
      <div style={{ position: "absolute", left: 100, top: 229, width: 700 }}>
        <Reveal>
          <div
            style={{
              color: "#ff8274",
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 33,
            }}
          >
            KEEP YOUR HANDS ON THE KEYS
          </div>
        </Reveal>
        <Reveal delay={5}>
          <div
            style={{
              fontSize: 103,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: -5,
            }}
          >
            Your inbox.
            <br />
            At keyboard
            <br />
            <span style={{ color: "#ff8274" }}>speed.</span>
          </div>
        </Reveal>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            marginTop: 54,
          }}
        >
          {[
            ["g", "u", "Unread mail"],
            ["g", "g", "First email"],
            ["]", "]", "Next page"],
          ].map(([a, b, label], i) => (
            <Reveal
              key={label}
              delay={16 + i * 6}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: stage === i ? 1 : 0.45,
              }}
            >
              <Keycap
                size={75}
                red={stage === i}
                press={interpolate(
                  frame,
                  [starts[i], starts[i] + 5, starts[i] + 11, starts[i] + 17],
                  [0, 1, 1, 0],
                  clamp,
                )}
              >
                {a}
              </Keycap>
              <Keycap size={75} red={stage === i}>
                {b}
              </Keycap>
              <div style={{ fontSize: 32, marginLeft: 10, fontWeight: 700 }}>
                {label}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Reveal
        delay={8}
        style={{
          position: "absolute",
          left: 835,
          top: 291,
          width: 985,
          height: 610,
        }}
      >
        <MailWindow
          query={frame < 37 ? "Search mail" : "is:unread"}
          unread
          selected={frame >= 95 ? 0 : 2}
          page={frame >= 157 ? "26–50 of 128" : "1–25 of 128"}
          messages={
            frame >= 157
              ? [
                  {
                    sender: "Project Team",
                    subject: "Next steps",
                    time: "Monday",
                  },
                  {
                    sender: "Taylor Reed",
                    subject: "A quick question",
                    time: "Monday",
                  },
                  {
                    sender: "Jordan Lee",
                    subject: "Notes for the week",
                    time: "Sunday",
                  },
                  {
                    sender: "Studio Team",
                    subject: "Looking ahead",
                    time: "Sunday",
                  },
                ]
              : undefined
          }
        />
      </Reveal>
      <div
        style={{
          position: "absolute",
          right: 100,
          bottom: 104,
          color: "#aeb0b3",
          fontSize: 26,
        }}
      >
        Shortcuts pause while you type.
      </div>
    </Scene>
  );
};
