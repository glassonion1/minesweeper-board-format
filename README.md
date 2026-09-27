# A finished Minesweeper game in a query string

Three parameters reproduce a game you cleared — the board as you left it, and
the record you set on it — with no server and nothing to look up.

```
?b=0909&mf=kAAQogCAIAiAAHdg&t=125
```

A 9×9 board, 10 mines, 8 of them flagged, cleared in 12.5 seconds — 33
characters. On expert (30×16, 99 mines) it is 115.

## What goes in

One rule decides it: **if a reader can work it out, it doesn't travel.**

| | | |
|---|---|---|
| the mines | `b`, `mf` | nothing else implies them |
| the flags | `mf` | you chose them; the layout doesn't |
| the time | `t` | the board can't know it |
| the mine count | — | count the set bits |
| 3BV | — | count it from the mine layout |
| 3BV/s | — | 3BV divided by the time |

Three things happened that can't be derived. Everything else is arithmetic on
those three, so sending it would only be a second chance to disagree.

## Parameters

### `b` — the dimensions

Width and height as two decimal digits each, zero padded.

```
b=0909    9 wide, 9 tall
b=1616    16 wide, 16 tall
b=3016    30 wide, 16 tall
```

Always four digits. The mine count is not stored; it is the number of set bits
in the first `width × height` bits of `mf`.

### `mf` — the mines and the flags

One bit stream, packed six bits to a character.

```
[ width × height bits ]  is this square a mine?     row-major, left to right
[ N bits              ]  was this mine flagged?     in the same row-major order
```

`N` is the number of mines. The stream is padded with zero bits to a multiple
of six; a reader should accept the length and ignore the padding's value.

The alphabet is base64url:

```
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_
```

Six bits per character, most significant bit first. `-` and `_` are unreserved
in RFC 3986, so nothing has to be percent-encoded.

### `t` — the time

Tenths of a second, as a positive integer with no leading zeros. `t=125` is
12.5 seconds.

Tenths because whole seconds put too many results on the same number, and
because nobody's clock is honest to the millisecond. A reader with no use for
a time may ignore it; one that has a time should put it here rather than
inventing a parameter of its own.

Optional, but only in the sense that a board without a time is still a board.

## Why the flags are one bit per mine

This is the only part that needs an argument.

The obvious way to record flags is a second bitmap, one bit per square: 480
bits on expert. You don't need it, because of what winning means.

> A won board has every non-mine square opened.

A flag sits on an unopened square. So a flag on a non-mine square means an
unopened non-mine square, which means the board is not won. **On a won board,
every flag is on a mine.** The mines are already in the stream, so the flags
only have to say, for each mine, yes or no.

On expert that is 99 bits instead of 480.

The rule holds only for a *won* board, which is why this format is for cleared
games and says so. A lost board can have flags anywhere and needs the full
bitmap.

## Why flags are worth carrying

The existing `b`/`m` format exists so a calculator can analyse a layout, and
for that the mines are the whole story: 3BV and ZiNi are properties of where
the mines sit, and no flag you place changes either of them. Nothing is missing
from it.

This is for a different job — reproducing a finished game rather than a layout.
There, how you used flags is part of what happened. Playing with none at all
("NF") is a recognised style, kept separately from flagged play in the world
rankings. A cleared board with no flags on it says NF at a glance; one covered
in flags says the opposite. That is the part a layout alone can't show.

## Size

| Board | Squares | Mines | `mf` | whole query |
|---|---|---|---|---|
| 9×9 | 81 | 10 | 16 characters | 34 |
| 16×16 | 256 | 40 | 50 characters | 68 |
| 30×16 | 480 | 99 | 97 characters | 115 |

`mf` is `ceil((width × height + mines) / 6)` characters. The whole query adds
`?b=WWHH&mf=` and `&t=`, counted above with a four-digit time.

## Reading a string

Return nothing and show a fresh board if any of these fail. These values travel
in URLs and get edited by hand, so a reader should never throw.

1. `b` matches `^\d{4}$`, and width and height are both at least 1.
2. Every character of `mf` is in the alphabet.
3. Count the set bits in the first `width × height` bits — that is `N`.
4. The bit length is exactly `ceil((width × height + N) / 6) × 6`.

Check the length before allocating anything, so that `b=9999` with a short
`mf` costs nothing.

A parameter you don't recognise is not an error. Ignore it and show the game.

## Relation to the existing `b=` / `m=` format

minesweeper.online passes boards to the ZiNi calculators
([llamasweeper](https://llamasweeper.com/#/game/zini-explorer),
[Minesweeper-ZiNi-Calculator](https://pttacgfans.github.io/Minesweeper-ZiNi-Calculator/))
as `?b=WWHH&m=…`, where `m` packs one bit per square, five squares to a base-32
character (`0-9a-v`), row-major, most significant bit first, zero padded. `b` is
the same four digits used here, so a reader that already handles one handles the
other. That format also accepts `b=1`, `b=2` and `b=3` as presets for the three
standard board sizes; this one does not — `b` is always the dimensions.

Two differences:

- `m` carries mines only. `mf` carries mines and flags.
- `m` is five bits per character. `mf` is six.

On expert: `m` is 96 characters. The same mines at six bits per character are
80. Adding the flags brings it to 97 — one character more than today, for the
whole cleared board.

The name is `mf` rather than `m` because the contents differ; the same name
should not mean two things.

## Out of scope

- **The order of play.** This is the finished position, not a replay. If you
  need to verify a record, replay formats (`.avf`, `.mvf`, `.rmv`, `.evf`)
  exist for that and carry click timings and checksums.
- **Lost boards.** The flag rule above does not hold. A separate parameter with
  a full bitmap would.
- **Who played it.** A name, a site, a date: your own parameters. The three
  here describe the game, not the player.

## Reference implementation

[`minesweeper-board.ts`](minesweeper-board.ts) — encode and decode, no
dependencies, 62 lines including the types and the validation.

[`check.ts`](check.ts) runs it against every number on this page.

```
node --experimental-strip-types check.ts
```

## Licence

MIT. The format itself is nobody's to own — implement it however you like.
