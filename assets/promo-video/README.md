# Shortcuts for Gmail promo video

Use this Remotion project to edit and export the extension's 40-second product
overview. The video uses English titles, animated Gmail illustrations, and an
original electronic soundtrack with keyboard clicks. It has no voiceover.

The main composition, `ShortcutsForGmail`, exports at 1920 × 1080, 30 frames per
second, as an H.264 MP4 with AAC audio.

## Preview and edit

From this directory, install the locked dependencies and start Remotion Studio:

```sh
npm ci
npm run dev
```

Select **ShortcutsForGmail** to preview the full video. The **Scenes** folder
contains each scene as an individual composition. Edit the corresponding file
in `src/scenes/` to change its titles, timing, or demonstration.

The project requires a Node.js version supported by `package.json`. Remotion
downloads a rendering browser when needed.

## Export

Run the render command:

```sh
npm run render
```

The script regenerates the soundtrack and writes
`out/shortcuts-for-gmail-promo.mp4`. Confirm that the exported video plays for
40 seconds and includes all six scenes.

To use an installed Chrome browser on macOS, pass its executable path:

```sh
npm run render -- --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

To export a poster from the closing scene, run:

```sh
npm run poster
```

The poster is written to `out/poster.png`. The `out/` directory and generated
`public/soundtrack.wav` are excluded from Git.

## Scenes

Times include the 0.4-second crossfades between scenes.

| Start | Scene | Demonstration |
| --- | --- | --- |
| 0:00.0 | Intro | Less clicking. More doing. |
| 0:04.6 | Snooze | Open Snooze, then press `T` for tomorrow. |
| 0:12.2 | Search | `;` searches the current sender; `'` searches the subject. |
| 0:19.8 | Navigate | `gu` opens unread mail, `gg` jumps to the first email, and `]]` advances a page. |
| 0:26.4 | Setup | Enable Gmail's keyboard shortcuts and select **Save Changes**. |
| 0:33.0 | Outro | Product name and closing message. |

Change scene lengths and transitions in `src/Promo.tsx`. Keep the main
composition's duration in `src/Root.tsx` and the generated soundtrack's duration
in `scripts/generate-audio.mjs` consistent with the resulting timeline.

## Assets and product accuracy

The icon is copied from the extension's `icons/icon128.png`. The ivory, charcoal,
and red artwork follows the existing store listing assets. All inbox content is
fictional, and the Gmail interfaces are simplified React illustrations rather
than live screen recordings. Shortcut behavior follows the extension's source
and README. The setup reminder follows
[Gmail's keyboard shortcut instructions](https://support.google.com/mail/answer/6594?hl=en).

`scripts/generate-audio.mjs` synthesizes the music and effects without samples or
external audio services. Regenerate the same track with `npm run soundtrack`.

The extension package script does not include this video project. Remotion has
its own [licensing terms](https://www.remotion.dev/license).
