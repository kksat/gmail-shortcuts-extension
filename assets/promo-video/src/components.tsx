import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const RED = "#ea4335";
export const INK = "#202124";
export const PAPER = "#f7f6f2";
export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const Reveal = ({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Reveal"
      style={{
        ...style,
        opacity: interpolate(frame, [delay, delay + 18], [0, 1], clamp),
        translate: interpolate(
          frame,
          [delay, delay + 24],
          ["0px 38px", "0px 0px"],
          { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) },
        ),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

export const Scene = ({
  children,
  section,
  dark = false,
  duration = 240,
}: {
  children: ReactNode;
  section: string;
  dark?: boolean;
  duration?: number;
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: dark ? INK : PAPER,
        color: dark ? PAPER : INK,
        fontFamily: "Arial, Helvetica, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          right: -350,
          top: -450,
          border: `1px solid ${dark ? "#38393c" : "#e8e4dd"}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 100,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <CanvasImage
          src={staticFile("icon128.png")}
          style={{ width: 58, height: 58 }}
        />
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
          Shortcuts for Gmail
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 82,
          fontSize: 23,
          fontWeight: 700,
          letterSpacing: 3,
          color: dark ? "#b8b9bc" : "#76736e",
        }}
      >
        {section}
      </div>
      {children}
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          bottom: 53,
          height: 2,
          background: dark ? "#454649" : "#dedbd5",
        }}
      >
        <div
          style={{
            width: `${interpolate(frame, [0, duration - 1], [0, 100], clamp)}%`,
            height: 2,
            background: RED,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const Keycap = ({
  children,
  size = 120,
  red = false,
  press = 0,
  rotate = 0,
}: {
  children: ReactNode;
  size?: number;
  red?: boolean;
  press?: number;
  rotate?: number;
}) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
      borderRadius: size * 0.19,
      background: red
        ? "linear-gradient(145deg, #ff6654, #e53c2e)"
        : "linear-gradient(145deg, #fffefa, #eae5d9)",
      border: `2px solid ${red ? "#f77365" : "#fffdf6"}`,
      color: red ? "#fff" : INK,
      boxShadow: `inset 0 4px 4px #ffffff40, inset 0 -${12 - press * 7}px 0 ${red ? "#c33327" : "#d6d0c3"}, 0 ${16 - press * 10}px ${25 - press * 8}px #00000022`,
      fontSize: size * 0.54,
      fontWeight: 700,
      fontFamily: "Arial, sans-serif",
      paddingBottom: 12 - press * 8,
      translate: `0px ${press * 10}px`,
      rotate: `${rotate}deg`,
    }}
  >
    {children}
  </div>
);

export const Icon = ({
  name,
  size = 28,
  color = "currentColor",
}: {
  name: "search" | "clock" | "arrow" | "check" | "star" | "inbox";
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {name === "search" ? (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ) : null}
    {name === "clock" ? (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ) : null}
    {name === "arrow" ? <path d="M4 12h16m-6-6 6 6-6 6" /> : null}
    {name === "check" ? <path d="m5 12 4 4L19 6" /> : null}
    {name === "star" ? (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
    ) : null}
    {name === "inbox" ? <path d="M4 4h16v16H4zM4 13h5l1 3h4l1-3h5" /> : null}
  </svg>
);

const defaultMessages = [
  { sender: "Alex Morgan", subject: "Project update", time: "10:42" },
  { sender: "Studio Team", subject: "Weekly notes", time: "10:18" },
  { sender: "Jordan Lee", subject: "Friday review", time: "9:56" },
  { sender: "Design Weekly", subject: "A little inspiration", time: "9:12" },
  { sender: "Taylor Reed", subject: "Team sync agenda", time: "8:45" },
];

export const MailWindow = ({
  query = "Search mail",
  selected = 0,
  removed = false,
  children,
  messages = defaultMessages,
  page = "1–25 of 128",
  unread = false,
}: {
  query?: string;
  selected?: number;
  removed?: boolean;
  children?: ReactNode;
  messages?: typeof defaultMessages;
  page?: string;
  unread?: boolean;
}) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      background: "#fff",
      color: INK,
      borderRadius: 25,
      border: "1px solid #e3e1dc",
      boxShadow: "0 28px 70px #3d2b1a15, 0 8px 16px #00000005",
      overflow: "hidden",
      position: "relative",
    }}
  >
    <div
      style={{
        height: 94,
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 24,
        borderBottom: "1px solid #eceae6",
      }}
    >
      <div
        style={{ fontSize: 25, width: 150, color: "#6f706f", fontWeight: 700 }}
      >
        Gmail
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 17,
          height: 58,
          padding: "0 22px",
          flex: 1,
          minWidth: 0,
          borderRadius: 30,
          background: "#eef2f6",
          fontSize: 29,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <Icon name="search" />
        {query}
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 94,
        bottom: 0,
        width: 180,
        padding: "24px 15px",
        background: "#faf9f6",
      }}
    >
      <div
        style={{
          background: "#fce2de",
          borderRadius: 15,
          padding: "18px 17px",
          fontSize: 23,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Compose
      </div>
      {["Inbox", "Starred", "Snoozed", "Sent", "Spam"].map((label, i) => (
        <div
          key={label}
          style={{
            margin: "3px -3px",
            padding: "14px 14px",
            fontSize: 23,
            borderRadius: 28,
            fontWeight: i === 0 ? 700 : 400,
            background: i === 0 ? "#fce2de" : "transparent",
          }}
        >
          {label}
        </div>
      ))}
    </div>
    <div style={{ marginLeft: 180 }}>
      <div
        style={{
          height: 65,
          borderBottom: "1px solid #e9e9e9",
          padding: "0 24px",
          display: "flex",
          gap: 27,
          alignItems: "center",
          color: "#666",
          fontSize: 27,
        }}
      >
        <span>□</span>
        <span>↻</span>
        <span>⋮</span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 20,
            fontSize: 19,
            alignItems: "center",
          }}
        >
          {page}
          <span style={{ fontSize: 31 }}>‹</span>
          <span style={{ fontSize: 31 }}>›</span>
        </div>
      </div>
      {messages
        .filter((_, i) => !(removed && i === 0))
        .map((message, i) => (
          <div
            key={`${message.sender}-${i}`}
            style={{
              height: 72,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 20px",
              borderBottom: "1px solid #e8e9eb",
              background: selected === i ? "#eaf2ff" : "white",
              outline: selected === i ? "2px solid #1a73e8" : "none",
              outlineOffset: -2,
              fontSize: 24,
            }}
          >
            <div
              style={{
                width: 17,
                height: 17,
                border: "1.5px solid #9c9c9c",
                flexShrink: 0,
              }}
            />
            {unread ? (
              <div
                style={{
                  width: 9,
                  height: 9,
                  background: "#1a73e8",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
            ) : (
              <Icon name="star" size={21} color="#999" />
            )}
            <div
              style={{
                width: 165,
                flexShrink: 0,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {message.sender}
            </div>
            <div
              style={{
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {message.subject}
            </div>
            <div style={{ color: "#6a6d71", fontSize: 17 }}>{message.time}</div>
          </div>
        ))}
    </div>
    {children}
  </div>
);

export const FeatureHeading = ({
  eyebrow,
  children,
  description,
}: {
  eyebrow: string;
  children: ReactNode;
  description?: ReactNode;
}) => (
  <div style={{ position: "absolute", left: 100, top: 230, width: 710 }}>
    <Reveal>
      <div
        style={{
          color: RED,
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: 4,
          marginBottom: 30,
        }}
      >
        {eyebrow}
      </div>
    </Reveal>
    <Reveal delay={5}>
      <div
        style={{
          fontWeight: 800,
          fontSize: 105,
          letterSpacing: -5,
          lineHeight: 1.04,
        }}
      >
        {children}
      </div>
    </Reveal>
    {description ? (
      <Reveal delay={15}>
        <div
          style={{
            fontSize: 36,
            lineHeight: 1.4,
            marginTop: 33,
            color: "#75716b",
            maxWidth: 660,
          }}
        >
          {description}
        </div>
      </Reveal>
    ) : null}
  </div>
);
