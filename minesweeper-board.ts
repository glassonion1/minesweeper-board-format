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
  for (let i = 0; i < bits.length; i += 6) {
    let v = 0
    for (let j = 0; j < 6; j++) v = (v << 1) | (bits[i + j] ? 1 : 0)
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

  const bits: boolean[] = []
  for (const ch of mf) {
    const v = ALPHABET.indexOf(ch)
    if (v < 0) return null
    for (let j = 5; j >= 0; j--) bits.push(((v >> j) & 1) === 1)
  }

  const cells = width * height
  if (bits.length < cells) return null
  let mineCount = 0
  for (let i = 0; i < cells; i++) if (bits[i]) mineCount++
  if (bits.length !== Math.ceil((cells + mineCount) / 6) * 6) return null

  // The flag bits run in the same order as the mines, so walking the squares
  // in order and taking the next one each time a mine turns up puts them back.
  const mines: boolean[][] = []
  const flagged: boolean[][] = []
  let next = cells
  for (let row = 0; row < height; row++) {
    const mineRow: boolean[] = []
    const flagRow: boolean[] = []
    for (let col = 0; col < width; col++) {
      const isMine = bits[row * width + col]
      mineRow.push(isMine)
      flagRow.push(isMine ? bits[next++] : false)
    }
    mines.push(mineRow)
    flagged.push(flagRow)
  }
  return { mines, flagged }
}
