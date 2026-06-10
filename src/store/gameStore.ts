import { create } from 'zustand'
import {
  BOARD_POSITIONS,
  applyMove,
  createInitialBoard,
  findMove,
  keyOf,
  positionOf,
  type Move,
  type Position,
} from '../game/solitaire'

type AnimatedMove = Move & {
  movingMarbleId: number
  capturedMarbleId: number
}

type GameSnapshot = {
  occupied: Set<string>
  marbleIds: Map<string, number>
}

const createInitialMarbleIds = () =>
  new Map(
    BOARD_POSITIONS
      .map((position, index) => [keyOf(position), index] as const)
      .filter(([key]) => key !== '0,0'),
  )

type GameState = {
  occupied: Set<string>
  marbleIds: Map<string, number>
  selected: string | null
  history: GameSnapshot[]
  moves: number
  lastMove: AnimatedMove | null
  select: (position: Position) => void
  finishAnimation: (move: AnimatedMove) => void
  undo: () => void
  reset: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  occupied: createInitialBoard(),
  marbleIds: createInitialMarbleIds(),
  selected: null,
  history: [],
  moves: 0,
  lastMove: null,

  select: (position) => {
    const state = get()
    if (state.lastMove) return
    const key = keyOf(position)

    if (state.occupied.has(key)) {
      set({ selected: state.selected === key ? null : key })
      return
    }

    if (!state.selected) return
    const move = findMove(state.occupied, positionOf(state.selected), position)
    if (!move) {
      set({ selected: null })
      return
    }

    const movingMarbleId = state.marbleIds.get(keyOf(move.from))
    const capturedMarbleId = state.marbleIds.get(keyOf(move.over))
    if (movingMarbleId === undefined || capturedMarbleId === undefined) return

    const nextMarbleIds = new Map(state.marbleIds)
    nextMarbleIds.delete(keyOf(move.from))
    nextMarbleIds.delete(keyOf(move.over))
    nextMarbleIds.set(keyOf(move.to), movingMarbleId)

    set({
      occupied: applyMove(state.occupied, move),
      marbleIds: nextMarbleIds,
      selected: null,
      history: [
        ...state.history,
        {
          occupied: new Set(state.occupied),
          marbleIds: new Map(state.marbleIds),
        },
      ],
      moves: state.moves + 1,
      lastMove: { ...move, movingMarbleId, capturedMarbleId },
    })
  },

  finishAnimation: (move) => {
    if (get().lastMove === move) set({ lastMove: null })
  },

  undo: () => {
    const state = get()
    const previous = state.history.at(-1)
    if (!previous) return

    set({
      occupied: new Set(previous.occupied),
      marbleIds: new Map(previous.marbleIds),
      selected: null,
      history: state.history.slice(0, -1),
      moves: Math.max(0, state.moves - 1),
      lastMove: null,
    })
  },

  reset: () =>
    set({
      occupied: createInitialBoard(),
      marbleIds: createInitialMarbleIds(),
      selected: null,
      history: [],
      moves: 0,
      lastMove: null,
    }),
}))
