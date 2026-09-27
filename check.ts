// Runs the reference implementation against every number in the README.
//
//   node --experimental-strip-types check.ts

import { encode, decode, type Board } from './minesweeper-board.ts'

let failures = 0
const ok = (name: string, condition: boolean) => {
  if (!condition) failures++
  console.log(`${condition ? 'ok   ' : 'FAIL '}${name}`)
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

// The example board from the README. F is a flagged mine, * an unflagged one,
// everything else an opened square.
const art = [
  'F11F1....',
  '222111121',
  '1F2111*2F',
  '112F22121',
  '..12F21..',
  '...12*21.',
  '111.12F1.',
  '1F1..111.',
  '111......'
]
const board: Board = {
  mines: art.map((row) => [...row].map((ch) => ch === 'F' || ch === '*')),
  flagged: art.map((row) => [...row].map((ch) => ch === 'F'))
}

const { b, mf } = encode(board)
console.log(`b = ${b}  mf = ${mf}  (${mf.length} chars)`)
ok('b is 0909', b === '0909')
ok('mf matches the string in the README', mf === 'kAAQogCAIAiAAHdg')

const back = decode(b, mf)
ok('round trip: mines', same(back?.mines, board.mines))
ok('round trip: flags', same(back?.flagged, board.flagged))
ok(
  '10 mines, 8 of them flagged',
  board.mines.flat().filter(Boolean).length === 10 &&
    back?.flagged.flat().filter(Boolean).length === 8
)

// A flag on a square with no mine is dropped, and the string is unchanged.
const stray: Board = {
  mines: board.mines,
  flagged: board.flagged.map((row, r) => row.map((f, c) => f || (r === 8 && c === 8)))
}
ok('a flag with no mine under it is dropped', encode(stray).mf === mf)

// Expert
const big: boolean[][] = []
const bigFlags: boolean[][] = []
let placed = 0
for (let row = 0; row < 16; row++) {
  const mineRow: boolean[] = []
  const flagRow: boolean[] = []
  for (let col = 0; col < 30; col++) {
    const mine = placed < 99 && (row * 30 + col) % 4 === 0
    mineRow.push(mine)
    flagRow.push(mine && placed % 3 !== 0)
    if (mine) placed++
  }
  big.push(mineRow)
  bigFlags.push(flagRow)
}
const expert = encode({ mines: big, flagged: bigFlags })
console.log(`expert: b = ${expert.b}  ${expert.mf.length} chars`)
ok('expert is 3016 and 97 characters', expert.b === '3016' && expert.mf.length === 97)
ok('expert round trips', same(decode(expert.b, expert.mf)?.mines, big))
ok('expert flags round trip', same(decode(expert.b, expert.mf)?.flagged, bigFlags))

// The comparison in "Relation to the existing b= / m= format"
const sixBits = Math.ceil((30 * 16) / 6)
const fiveBits = Math.ceil((30 * 16) / 5)
console.log(`expert, mines only: ${sixBits} chars at six bits, ${fiveBits} at five`)
ok('80 and 96', sixBits === 80 && fiveBits === 96)

// The size table
const two = (n: number) => String(n).padStart(2, '0')
const sizes: [string, number, number, number, number, number][] = [
  // name, width, height, mines, mf length, whole query
  ['9x9', 9, 9, 10, 16, 34],
  ['16x16', 16, 16, 40, 50, 68],
  ['30x16', 30, 16, 99, 97, 115]
]
for (const [name, width, height, mines, wantMf, wantQuery] of sizes) {
  const length = Math.ceil((width * height + mines) / 6)
  const query = `?b=${two(width)}${two(height)}&mf=${'x'.repeat(length)}&t=1234`
  ok(
    `${name}: mf ${wantMf} chars, query ${wantQuery} chars`,
    length === wantMf && query.length === wantQuery
  )
}

// The example at the top of the README
ok('the example is 33 characters', `?b=0909&mf=${mf}&t=125`.length === 33)
ok('3BV 20 in 12.5 seconds is 1.60 3BV/s', (20 / 12.5).toFixed(2) === '1.60')

// Strings arrive edited by hand. Reject them, never throw.
ok('b that is not four digits is rejected', decode('99', mf) === null)
ok('a character outside the alphabet is rejected', decode(b, `${mf}!`) === null)
ok('a length that disagrees with b is rejected', decode('0808', mf) === null)
ok('a width of zero is rejected', decode('0009', mf) === null)
ok('empty strings are rejected', decode('', '') === null)
ok(
  'nothing throws',
  (() => {
    try {
      decode('9999', 'AAAA')
      decode('0909', '----')
      return true
    } catch {
      return false
    }
  })()
)

console.log(failures === 0 ? '\nall passed' : `\n${failures} failed`)
