# Keyboard shortcuts

Press `?` outside a text field to open the in-app shortcut reference.

## Global

- `?` open the shortcut reference
- `Cmd/Ctrl K` open the command palette
- `Q` focus task capture, or open task capture when no composer is visible
- `g then a` open the "Add a task" dialog
- `f` open focus mode
- `Esc` close the active overlay

## Navigation

- `g then h` Today
- `g then t` Tasks
- `g then p` Projects
- `g then c` Calendar
- `g then k` Board
- `g then i` Inbox
- `g then l` Power Dialer
- `g then n` Notepad
- `g then s` Settings

## Task list

- `/` focus task search

## Capture syntax

- `#tag` add a tag
- `!` set priority 1 (Low)
- `!!` set priority 2 (Med)
- `!!!` set priority 3 (Urgent)
- `tomorrow 3pm` add a natural-language schedule
- `tomorrow 3pm-4pm` schedule a time block with an end time
- `Cmd/Ctrl Enter` save from supported capture forms

The first date phrase is scheduled and removed from the title, along with a
word that only introduced it (`at`, `on`, `by`, `for`, `@`, `before`, `until`,
`due`). These stay in the title and do not schedule anything:

- a length of time with no direction: `Read 30 minutes`, `Fast 3 days`
  (`in 2 days`, `within 2 days`, and `2 weeks from now` still schedule)
- a past phrase: `Recap yesterday meeting`, `Review last week notes`
- a bare month name (`Lunch with April`) and `24/7`
- `sun`, `sat`, and `wed` on their own (`Buy sun cream`); use the full weekday
  name or `this sat` / `next sun`
- anything inside quotation marks: `Read "Tomorrow and Tomorrow"`

## Whiteboard

These come from tldraw, not from the app's own hotkey table, so the in-app `?`
overlay does not list them.

- `v` select tool
- `d` draw (also `b` or `x`)
- `e` eraser
- `r` rectangle
- `o` ellipse
- `Cmd Z` and `Cmd Shift Z` undo and redo
