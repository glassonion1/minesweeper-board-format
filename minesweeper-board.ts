// A finished Minesweeper game in a query string.
//
//   ?b=0909&mf=kAAQogCAIAiAAHdg&t=125
//
// b is the dimensions, mf the mines and the flags, t the time. This file
// handles b and mf; t is a plain integer and needs no help. See README.md.
//
// No dependencies. MIT licensed — see LICENSE.

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

// Part of the format, not a setting. The alphabet has 64 characters and 2^6
// is 64, so six bits fit exactly into one of them. Six is also the ceiling:
// seven would want 128 characters and RFC 3986 leaves only 66 that need no
// escaping. Change this and you have a different format, not a tuned one.
const BITS_PER_CHAR = 6

/**
 * Two grids of the same shape. `mines[row][col]` is whether a mine is there,
 * `flagged[row][col]` whether a flag was on it when the game ended.
 *
 * A flag on a square with no mine is dropped. On a won board there are none:
 * a flag sits on an unopened square, and an unopened square with no mine
 * means you haven't won.
 */
export type Board = {
  mines: boolean[][]
  flagged: boolean[][]
}

export type Params = {
  /** width and height, two decimal digits each */
  b: string
  /** the board, packed */
  mf: string
}

export function encode(board: Board): Params {
  const mines = board.mines.flat()
  const flagged = board.flagged.flat()
  // The mines, then the flags of the mined squares in the same order.
  const bits = [...mines, ...flagged.filter((_, i) => mines[i])]

  // Six bits to a character. Reading past the end of bits gives undefined,
  // which packs as a zero — that is the padding rule, so there is no
  // special case for the last group.
  let mf = ''
  for (let i = 0; i < bits.length; i += BITS_PER_CHAR) {
    let v = 0
    for (let j = 0; j < BITS_PER_CHAR; j++) v = (v << 1) | (bits[i + j] ? 1 : 0)
    mf += ALPHABET[v]
  }
  const width = String(board.mines[0].length).padStart(2, '0')
  const height = String(board.mines.length).padStart(2, '0')
  return { b: width + height, mf }
}

/** returns null if the string cannot be read. Never throws. */
export function decode(b: string, mf: string): Board | null {
  if (!/^\d{4}$/.test(b)) return null
  const width = Number(b.slice(0, 2))
  const height = Number(b.slice(2, 4))
  if (width < 1 || height < 1) return null

  if ([...mf].some((ch) => !ALPHABET.includes(ch))) return null
  const bits = [...mf].flatMap((ch) => {
    const v = ALPHABET.indexOf(ch)
    // Its six binary digits, highest first — the order encode packed them in.
    return [...v.toString(2).padStart(BITS_PER_CHAR, '0')].map((d) => d === '1')
  })

  const squares = width * height
  if (bits.length < squares) return null
  const mines = bits.slice(0, squares)
  const mineCount = mines.filter(Boolean).length
  const expected =
    Math.ceil((squares + mineCount) / BITS_PER_CHAR) * BITS_PER_CHAR
  if (bits.length !== expected) return null

  // The flags are in the same order as the mines, so hand one out each time a
  // mine turns up. This is the inverse of the filter in encode.
  const flagBits = bits.slice(squares, squares + mineCount)
  let next = 0
  const flagged = mines.map((isMine) => (isMine ? flagBits[next++] : false))

  const grid = (flat: boolean[]) =>
    Array.from({ length: height }, (_, row) =>
      flat.slice(row * width, (row + 1) * width)
    )
  return { mines: grid(mines), flagged: grid(flagged) }
}
