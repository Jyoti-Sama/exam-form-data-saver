# Exam Form Data Saver

A side-panel extension for Edge that holds the details you keep retyping into
exam application forms — board marks, roll numbers, percentages, semester CGPA —
and puts any of them into the form in one click.

## Install it in Edge

1. Unzip this folder somewhere permanent, like `D:\\exam-form-data-saver`. Edge reads the
extension from this folder every time it starts, so don't delete it.
2. Open `edge://extensions`.
3. Turn on **Developer mode** (switch at the bottom left).
4. Click **Load unpacked** and pick the `exam-form-data-saver` folder — the one that has
`manifest.json` directly inside it.
5. Click the puzzle-piece icon in the toolbar and pin exam-form-data-saver so the button
stays visible.

Click the toolbar button, or press **Ctrl+Shift+Y**, and the panel opens on the
right side of the window, next to the form you're filling. It stays open while
you move between tabs.

## Using it

**Put your details in.** Press **Edit**, type into the boxes, press **Done**.
There's no save button — it writes as you type. You can rename sections, add
your own details, and delete the ones you don't need.

**Copy.** Click any value and it goes to the clipboard. Paste with Ctrl+V.

**Fill.** Click inside the box on the form first, then press **Fill** next to
the value. It drops straight in, and the box flashes green. This works on
dropdowns too, as long as one of the options matches what you saved.

**Search.** Type into the search box at the top — it looks through section
names, detail names, and values, so "roll" or "2019" narrows things fast.

**Semester marks.** Open that section, enter SGPA for each semester, and it
works out your overall CGPA. Credits are optional; add them and it weights the
average properly instead of taking a plain mean. The two percentage conversions
below are the common ones, but confirm which rule your university uses before
putting it on a form. **Save CGPA as a detail** pushes the result up into your
B.Tech section.

**Back up.** Press **Back up** to download a JSON file of everything, and
**Restore** to read one back. Worth doing once you've typed everything in,
because clearing Edge's extension data would otherwise wipe it.

## Locking the panel

Scroll to the bottom and press **Set a PIN**. From then on, opening the panel
shows a lock screen first — type the PIN and it opens as normal. Press
**Lock** in the top-right any time to lock it immediately without closing the
panel.

The PIN itself is never stored. What's saved is a PBKDF2 hash (150,000
rounds, random salt) — the same approach a password manager uses — so
reading the raw storage file doesn't hand someone your PIN. If you forget it,
**Forgot PIN?** on the lock screen clears the PIN and gets you back in
without touching your saved details; set a new one afterward. This is by
design and by necessity — there's no server to verify your identity against,
so anyone at your unlocked laptop could reset it too. The PIN protects
against a glance at your screen or a moment of someone else's hands on your
laptop; it doesn't turn this into a vault.

## Where your details live

In the extension's own local storage, on this computer. Nothing is sent
anywhere — the extension makes no network requests at all. It isn't encrypted,
though, so treat it like a notes file: fine for marks and roll numbers, and
worth thinking twice about for anything you'd not leave in a text file.

## Files

|File|What it does|
|-|-|
|`manifest.json`|Extension setup and permissions|
|`background.js`|Makes the toolbar button open the side panel|
|`sidepanel.html/.css/.js`|The panel itself|
|`content.js`|Runs on the page, remembers the box you clicked, fills it|



