import { Keycap, RED, Reveal, Scene } from "../components";

export const Outro = () => (
  <Scene section="SNOOZE · SEARCH · NAVIGATE" duration={210}>
    <div style={{ position: "absolute", left: 100, top: 245 }}>
      <Reveal delay={4}>
        <div
          style={{
            fontSize: 143,
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: -7,
          }}
        >
          Less clicking.
          <br />
          <span style={{ color: RED }}>More doing.</span>
        </div>
      </Reveal>
      <Reveal delay={22}>
        <div style={{ marginTop: 42, fontSize: 39, color: "#77736c" }}>
          Make your inbox feel like second nature.
        </div>
      </Reveal>
      <Reveal delay={40}>
        <div
          style={{
            marginTop: 54,
            background: RED,
            color: "white",
            borderRadius: 16,
            padding: "25px 34px",
            display: "inline-block",
            fontSize: 35,
            fontWeight: 700,
          }}
        >
          Shortcuts for Gmail
        </div>
      </Reveal>
      <Reveal delay={50}>
        <div style={{ fontSize: 28, color: "#77736c", marginTop: 23 }}>
          A Chrome extension for your everyday inbox.
        </div>
      </Reveal>
    </div>
    <Reveal
      delay={12}
      style={{ position: "absolute", left: 1260, top: 392, rotate: "-9deg" }}
    >
      <Keycap size={260} red>
        T
      </Keycap>
    </Reveal>
    <Reveal
      delay={22}
      style={{ position: "absolute", left: 1530, top: 242, rotate: "10deg" }}
    >
      <Keycap size={210}>;</Keycap>
    </Reveal>
    <Reveal
      delay={30}
      style={{ position: "absolute", left: 1545, top: 623, rotate: "8deg" }}
    >
      <Keycap size={210}>g</Keycap>
    </Reveal>
    <div
      style={{
        position: "absolute",
        bottom: 82,
        left: 100,
        color: "#77736c",
        fontSize: 21,
      }}
    >
      Independent extension. Not affiliated with or endorsed by Google.
    </div>
  </Scene>
);
