import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  initAudio, playGameOver, playJump,
  playSelect, playWin, toggleMute,
} from './audio'
import { getValidMoves } from './game/solitaire'
import { GameScene } from './scene/GameScene'
import { useGameStore } from './store/gameStore'
import './App.css'

function ScorePop({ moves }: { moves: number }) {
  if (!moves) return null
  return <span key={moves} className="score-pop">+100</span>
}

function Stars({ count }: { count: number }) {
  return (
    <div className="star-row" aria-label={`${count} étoile${count !== 1 ? 's' : ''} sur 3`}>
      {[0, 1, 2].map(i => (
        <span key={i} className={`star ${i < count ? 'star-on' : 'star-off'}`}
          style={{ animationDelay: `${i * 0.14}s` }}>★</span>
      ))}
    </div>
  )
}

function App() {
  const occupied = useGameStore((s) => s.occupied)
  const marbles = occupied.size
  const moves = useGameStore((s) => s.moves)
  const history = useGameStore((s) => s.history)
  const selected = useGameStore((s) => s.selected)
  const lastMove = useGameStore((s) => s.lastMove)
  const reset = useGameStore((s) => s.reset)
  const undo = useGameStore((s) => s.undo)
  const won = marbles === 1
  const gameOver = !won && getValidMoves(occupied).length === 0
  const progress = ((36 - marbles) / 35) * 100
  const score = moves * 100

  const [muted, setMuted] = useState(false)
  const prevSelected = useRef<string | null>(null)
  const wonFired = useRef(false)
  const gameOverFired = useRef(false)

  const handleFirstInteraction = useCallback(() => { initAudio() }, [])

  useEffect(() => {
    if (selected && selected !== prevSelected.current) playSelect()
    prevSelected.current = selected
  }, [selected])

  useEffect(() => {
    if (!lastMove) return
    const audioProgress = Math.min(1, moves / 35)
    playJump(audioProgress)
  }, [lastMove, moves])

  useEffect(() => {
    if (won && !wonFired.current) {
      wonFired.current = true; gameOverFired.current = false; playWin()
    } else if (gameOver && !gameOverFired.current) {
      gameOverFired.current = true; wonFired.current = false; playGameOver()
    } else if (!won && !gameOver) {
      wonFired.current = false; gameOverFired.current = false
    }
  }, [won, gameOver])

  const handleMute = () => { setMuted(toggleMute()) }

  const stars = won ? (moves <= 20 ? 3 : moves <= 28 ? 2 : 1) : 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          <div>
            <p className="eyebrow">Arcade puzzle</p>
            <h1>Orbital</h1>
          </div>
        </div>

        <div className="score-card">
          <div className="score-text">
            <span className="score-label">Score</span>
            <strong className="score-value">{score.toString().padStart(4, '0')}</strong>
            <ScorePop moves={moves} />
          </div>
          <div className="score-badge" aria-hidden="true">
            <span>★</span>
          </div>
        </div>
      </header>

      <section className="game-frame" aria-label="Plateau de solitaire"
        onPointerDown={handleFirstInteraction}>
        <div className="frame-glow" />
        <Canvas shadows dpr={[1, 1.75]}
          camera={{ position: [0, 10.8, 5.2], fov: 42 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 0.92
          }}>
          <Suspense fallback={null}>
            <GameScene />
          </Suspense>
        </Canvas>

        {/* Mission card — top left overlay */}
        <aside className="mission-card">
          <div className="mission-heading">
            <span className="level-badge">01</span>
            <div>
              <span className="label">Mission</span>
              <strong>Dernière orbite</strong>
            </div>
          </div>
          <p>Terminez avec une seule orbe au centre.</p>
          <div className="progress-meta">
            <span>Progression</span>
            <strong>{36 - marbles} / 35</strong>
          </div>
          <div className="progress-track" aria-label={`Progression ${Math.round(progress)} %`}>
            <i style={{ width: `${progress}%` }} />
          </div>
        </aside>

        {/* Stats — top right overlay */}
        <div className="live-stats" aria-label="Statistiques de la partie">
          <div className="stat-item">
            <span className="stat-orb-dot" aria-hidden="true" />
            <strong>{marbles}</strong>
            <span>orbes</span>
          </div>
          <div className="stat-sep" aria-hidden="true" />
          <div className="stat-item">
            <span className="stat-move-dot" aria-hidden="true" />
            <strong>{moves}</strong>
            <span>saut{moves !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Win / game over panel */}
        {(won || gameOver) && (
          <div className={`result-panel ${won ? 'is-win' : ''}`} role="status">
            <span className="result-burst" aria-hidden="true" />
            <p>{won ? 'Mission accomplie' : 'Orbites bloquées'}</p>
            <h2>{won ? (occupied.has('0,0') ? 'Centre parfait !' : 'Victoire !') : 'Fin de partie'}</h2>
            <Stars count={stars} />
            <strong className="final-score">{score.toString().padStart(4, '0')} pts</strong>
            <span className="result-detail">
              {won ? `${moves} sauts pour nettoyer le plateau.` : `${marbles} orbes sont encore en jeu.`}
            </span>
            <div className="result-actions">
              {gameOver && <button className="result-undo" onClick={undo}>↶ Revenir</button>}
              <button onClick={reset}>Nouvelle mission</button>
            </div>
          </div>
        )}
      </section>

      {/* Footer — gear + mute | instruction | annuler + recommencer */}
      <footer className="controls">
        <div className="controls-left">
          <button className={`button-mute ${muted ? 'is-muted' : ''}`}
            onClick={handleMute} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
            <span className="mute-icon" aria-hidden="true" />
            {muted ? 'Son coupé' : 'Son activé'}
          </button>
        </div>

        <div className="instruction-bar">
          <span className="instruction-dot" aria-hidden="true" />
          {selected
            ? <>Choisissez une <em>destination</em> lumineuse</>
            : <>Touchez une <em>orbe</em> capable de <em>sauter</em></>
          }
        </div>

        <div className="controls-right">
          <button className="button button-secondary" onClick={undo} disabled={!history.length}>
            <span aria-hidden="true">↶</span> Annuler
          </button>
          <button className="button button-primary" onClick={reset}>
            <span aria-hidden="true">↺</span> Recommencer
          </button>
        </div>
      </footer>
    </main>
  )
}

export default App
