import { describe, expect, it } from 'vitest'
import {
  applyMove,
  BOARD_POSITIONS,
  createInitialBoard,
  findMove,
  getValidMoves,
  keyOf,
} from './solitaire'

describe('solitaire rules', () => {
  it('creates the 37-hole European board with an empty center', () => {
    const board = createInitialBoard()
    expect(BOARD_POSITIONS).toHaveLength(37)
    expect(board).toHaveLength(36)
    expect(board.has('0,0')).toBe(false)
  })

  it('allows an opening jump into the center', () => {
    const board = createInitialBoard()
    const move = findMove(board, { row: 0, col: -2 }, { row: 0, col: 0 })
    expect(move).not.toBeNull()
  })

  it('removes the jumped marble and moves the selected marble', () => {
    const board = createInitialBoard()
    const move = findMove(board, { row: 0, col: -2 }, { row: 0, col: 0 })!
    const next = applyMove(board, move)
    expect(next.has(keyOf(move.from))).toBe(false)
    expect(next.has(keyOf(move.over))).toBe(false)
    expect(next.has(keyOf(move.to))).toBe(true)
    expect(next).toHaveLength(35)
  })

  it('offers four opening moves', () => {
    expect(getValidMoves(createInitialBoard())).toHaveLength(4)
  })

  it('detects a blocked board with several marbles', () => {
    const blocked = new Set(['-3,-1', '3,1'])
    expect(getValidMoves(blocked)).toHaveLength(0)
  })
})
