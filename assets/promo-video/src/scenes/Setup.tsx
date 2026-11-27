import { interpolate, useCurrentFrame } from "remotion";
import { Icon, RED, Reveal, Scene, clamp } from "../components";

export const Setup = () => {
  const frame = useCurrentFrame();
  const enabled = frame >= 68;
  const saved = frame >= 133;
  return (
    <Scene section="ONE QUICK SETUP" duration={210}>
      <Reveal delay={4} style={{ position: "absolute", left: 100, top: 205 }}>
        <div style={{ fontSize: 102, letterSpacing: -5, fontWeight: 800 }}>
          First, enable Gmail shortcuts.
        </div>
      </Reveal>
      <Reveal
        delay={14}
        style={{
          position: "absolute",
          left: 105,
          top: 335,
          fontSize: 38,
          color: "#77736c",
        }}
      >
        Settings → See all settings → General
      </Reveal>
      <Reveal
        delay={20}
        style={{
          position: "absolute",
          left: 200,
          top: 442,
          width: 1520,
          height: 391,
          borderRadius: 24,
          background: "white",
          boxShadow: "0 25px 60px #3d2b1a12",
          padding: "36px 52px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 44,
            fontSize: 26,
            color: "#6a6a6a",
            borderBottom: "1px solid #e3e3e3",
            paddingBottom: 21,
          }}
        >
          <span style={{ fontWeight: 700, color: "#1a73e8" }}>General</span>
          <span>Labels</span>
          <span>Inbox</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 33,
            alignItems: "flex-start",
            gap: 95,
          }}
        >
          <div style={{ fontSize: 33, fontWeight: 700, paddingTop: 10 }}>
            Keyboard shortcuts:
          </div>
          <div
            style={{
              fontSize: 31,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {["Keyboard shortcuts off", "Keyboard shortcuts on"].map(
              (label, i) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "7px 18px",
                    borderRadius: 12,
                    background: enabled && i === 1 ? "#e8f0fe" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 29,
                      height: 29,
                      borderRadius: "50%",
                      border: `3px solid ${(enabled ? 1 : 0) === i ? "#1a73e8" : "#9b9b9b"}`,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {(enabled ? 1 : 0) === i ? (
                      <div
                        style={{
                          width: 15,
                          height: 15,
                          background: "#1a73e8",
                          borderRadius: "50%",
                        }}
                      />
                    ) : null}
                  </div>
                  {label}
                </div>
              ),
            )}
          </div>
          <div
            style={{
              marginLeft: "auto",
              marginTop: 28,
              width: 255,
              padding: "19px 20px",
              borderRadius: 10,
              background: RED,
              color: "white",
              fontSize: 29,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "center",
              scale: interpolate(
                frame,
                [121, 126, 133, 140],
                [1, 0.95, 0.95, 1],
                clamp,
              ),
            }}
          >
            Save Changes
          </div>
        </div>
      </Reveal>
      <Reveal
        delay={35}
        style={{
          position: "absolute",
          left: 200,
          right: 200,
          top: 895,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        {["Open Gmail settings", "Turn shortcuts on", "Save Changes"].map(
          (label, i) => (
            <div
              key={label}
              style={{ display: "flex", gap: 17, alignItems: "center" }}
            >
              <div
                style={{
                  width: 47,
                  height: 47,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  background: saved && i === 2 ? "#137333" : RED,
                  color: "white",
                  fontSize: 27,
                }}
              >
                {saved && i === 2 ? <Icon name="check" /> : i + 1}
              </div>
              {label}
            </div>
          ),
        )}
      </Reveal>
    </Scene>
  );
};
