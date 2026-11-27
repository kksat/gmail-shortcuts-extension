import { interpolate, useCurrentFrame } from "remotion";
import {
  FeatureHeading,
  Keycap,
  MailWindow,
  RED,
  Reveal,
  Scene,
  clamp,
} from "../components";

export const Search = () => {
  const frame = useCurrentFrame();
  const subject = frame >= 120;
  const local = subject ? frame - 120 : frame;
  const target = subject ? 'subject:"Project update"' : "from:alex@example.com";
  const query = target.slice(0, Math.max(0, Math.floor((local - 30) * 1.3)));
  const press = interpolate(local, [20, 26, 34, 42], [0, 1, 1, 0], clamp);
  return (
    <Scene section="02 / SEARCH">
      <FeatureHeading
        eyebrow="LESS HUNTING. MORE FINDING."
        description={
          subject
            ? "Find every email with this subject."
            : "Find every email from this sender."
        }
      >
        Find the
        <br />
        conversation.
        <br />
        <span style={{ color: RED }}>Faster.</span>
      </FeatureHeading>
      <div
        style={{
          position: "absolute",
          left: 103,
          top: 805,
          display: "flex",
          gap: 27,
          alignItems: "center",
        }}
      >
        <Keycap size={100} red={!subject} press={!subject ? press : 0}>
          ;
        </Keycap>
        <Keycap size={100} red={subject} press={subject ? press : 0}>
          &apos;
        </Keycap>
        <div style={{ fontSize: 29, color: "#77736c", maxWidth: 330 }}>
          {subject ? "Search by subject" : "Search by sender"}
        </div>
      </div>
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
        <MailWindow
          query={local < 30 ? "Search mail" : query || " "}
          selected={local < 30 ? 0 : -1}
          messages={
            local < 30
              ? undefined
              : local < 65
                ? []
                : subject
                  ? [
                      {
                        sender: "Alex Morgan",
                        subject: "Project update",
                        time: "10:42",
                      },
                      {
                        sender: "Jordan Lee",
                        subject: "Project update",
                        time: "Yesterday",
                      },
                      {
                        sender: "Studio Team",
                        subject: "Project update",
                        time: "Monday",
                      },
                    ]
                  : [
                      {
                        sender: "Alex Morgan",
                        subject: "Project update",
                        time: "10:42",
                      },
                      {
                        sender: "Alex Morgan",
                        subject: "Friday review",
                        time: "Yesterday",
                      },
                      {
                        sender: "Alex Morgan",
                        subject: "Next steps",
                        time: "Monday",
                      },
                    ]
          }
        >
          <div
            style={{
              position: "absolute",
              left: 213,
              bottom: 40,
              fontSize: 24,
              color: "#77736c",
            }}
          >
            Works from your email list or an open conversation.
          </div>
        </MailWindow>
      </Reveal>
    </Scene>
  );
};
