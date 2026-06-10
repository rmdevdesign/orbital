export type Position = {
  row: number
  col: number
}

export type Move = {
  from: Position
  over: Position
  to: Position
}

export const keyOf = ({ row, col }: Position) => `${row},${col}`

export const positionOf = (key: string): Position => {
  const [row, col] = key.split(',').map(Number)
  return { row, col }
}

export const BOARD_POSITIONS: Position[] = Array.from({ length: 7 }, (_, rowIndex) => {
  const row = rowIndex - 3
  return Array.from({ length: 7 }, (_, colIndex) => {
    const col = colIndex - 3
    return { row, col }
  }).filter(({ row: r, col: c }) =>
    Math.abs(r) <= 1 ||
    Math.abs(c) <= 1 ||
    (Math.abs(r) === 2 && Math.abs(c) === 2),
  )
}).flat()

export const BOARD_KEYS = new Set(BOARD_POSITIONS.map(keyOf))

export const createInitialBoard = () =>
  new Set(BOARD_POSITIONS.map(keyOf).filter((key) => key !== '0,0'))

export const findMove = (
  occupied: Set<string>,
  from: Position,
  to: Position,
): Move | null => {
  const rowDelta = to.row - from.row
  const colDelta = to.col - from.col
  const isStraightJump =
    (Math.abs(rowDelta) === 2 && colDelta === 0) ||
    (Math.abs(colDelta) === 2 && rowDelta === 0)

  if (!isStraightJump || !BOARD_KEYS.has(keyOf(to))) return null
  if (!occupied.has(keyOf(from)) || occupied.has(keyOf(to))) return null

  const over = {
    row: from.row + rowDelta / 2,
    col: from.col + colDelta / 2,
  }

  return occupied.has(keyOf(over)) ? { from, over, to } : null
}

export const applyMove = (occupied: Set<string>, move: Move) => {
  const next = new Set(occupied)
  next.delete(keyOf(move.from))
  next.delete(keyOf(move.over))
  next.add(keyOf(move.to))
  return next
}

export const getValidMoves = (occupied: Set<string>, from?: Position) => {
  const sources = from ? [from] : [...occupied].map(positionOf)
  const directions = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ]

  return sources.flatMap((source) =>
    directions
      .map(([row, col]) =>
        findMove(occupied, source, {
          row: source.row + row,
          col: source.col + col,
        }),
      )
      .filter((move): move is Move => move !== null),
  )
}
