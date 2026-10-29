# Pen and stylus

Pen input is a first class citizen. Touch is for panning and zooming. Mouse
is for desktop. The whiteboard reads them all through the Pointer Events API.

## Reading the pen

```ts
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'pen') return;
  ink.begin({
    x: e.clientX,
    y: e.clientY,
    pressure: e.pressure, // 0 to 1
    tiltX: e.tiltX, // -90 to 90
    tiltY: e.tiltY,
    twist: e.twist, // 0 to 359
  });
});
```

## Palm rejection

Whenever a pen pointer is active, ignore touch pointers for the next 200 ms.
`@ops-dashboard/whiteboard` exports `shouldRejectAsPalm` for this. The window resets
on every pen sample so a resting palm stays rejected.

## Side button as eraser

Most Samsung S-Pens fire `button === 5` when the side button is held during a
stroke. The canvas does not handle this itself: tldraw's editor already
switches to its eraser tool when a pointer goes down with button 5 and restores
the previous tool on pointer up. `PEN_BUTTON_ERASER` is exported with the same
value for code outside the canvas, but `OpsCanvas` does not read it, so do not
add a second handler there.

## Hover preview

The S-Pen reports `pointermove` while hovering above the screen with
`pressure === 0`. Render a small cursor at the pen tip so the user knows
where the next stroke will begin.

## Gestures alongside pen

Two finger pan and pinch zoom must keep working while a pen stroke is in
flight. Track touches and pen pointers separately.

## Lefty mode

Settings has a `leftyMode` toggle, and `normalizeSettings` stores it, but
nothing reads it yet. The intent is that a true value mirrors the whiteboard
toolbar to the right edge so a right handed palm is no longer in the way of a
left handed pen. The canvas wrapper is tldraw's own UI, so applying this means
overriding that toolbar's placement. Until that lands, flipping the toggle
changes nothing on screen.
