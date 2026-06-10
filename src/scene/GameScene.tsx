import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { BOARD_POSITIONS, getValidMoves, keyOf, type Position } from '../game/solitaire'
import { useGameStore } from '../store/gameStore'

const SPACING = 0.82
const seededUnit = (value: number) => {
  const x = Math.sin(value * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

// Saturated candy palette, dark enough to retain shape under the highlights.
const MARBLE_COLORS = [
  '#39c9e4', '#df5da1', '#a96bd8', '#eb6c64', '#83c653', '#b5c44f',
  '#dfb83d', '#4bc6aa', '#a77add', '#ed8152', '#55aee8', '#e65391',
  '#8975d3', '#dfbd43', '#64c985', '#c26cdc', '#42cbd5', '#e77c61',
]

const marbleColor = (marbleId: number) =>
  MARBLE_COLORS[(marbleId * 7 + 30) % MARBLE_COLORS.length]

const worldPosition = ({ row, col }: Position): [number, number, number] => [
  col * SPACING,
  0.38,
  row * SPACING,
]

function Marble({
  position,
  marbleId,
  selected,
  movable,
  onSelect,
}: {
  position: Position
  marbleId: number
  selected: boolean
  movable: boolean
  onSelect: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const color = marbleColor(marbleId)
  const basePosition = worldPosition(position)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const active = selected || hovered
    const targetScale = selected ? 1.14 : hovered ? 1.08 : 1
    ref.current.scale.setScalar(
      THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.14),
    )
    ref.current.position.y = basePosition[1] +
      (active ? Math.sin(clock.elapsedTime * 4 + marbleId) * 0.03 + 0.04 : 0)
    ref.current.rotation.y += active ? 0.016 : 0.002
  })

  return (
    <group>
      {(selected || hovered) && (
        <SelectionHalo position={position} color={selected ? '#c090ff' : color} selected={selected} />
      )}
      <mesh
        ref={ref}
        position={worldPosition(position)}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        onPointerEnter={() => {
          setHovered(movable)
          document.body.style.cursor = movable ? 'pointer' : 'default'
        }}
        onPointerLeave={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[0.29, 48, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.1 : hovered ? 0.05 : 0.008}
          roughness={0.14}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.075}
          envMapIntensity={0.5}
          ior={1.5}
          sheen={0.18}
          sheenColor={color}
          sheenRoughness={0.4}
        />
      </mesh>
    </group>
  )
}

function SelectionHalo({ position, color, selected }: {
  position: Position; color: string; selected: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    ringRef.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4.5) * 0.04)
    if (glowRef.current) glowRef.current.rotation.z = clock.elapsedTime * 0.5
  })

  return (
    <group position={[position.col * SPACING, 0.174, position.row * SPACING]}>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.33, 0.48, 48]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.16 : 0.08}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[0.36, 0.385, 48]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.92 : 0.58}
          depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  )
}

function MoveAnimation({
  move, onComplete,
}: {
  move: NonNullable<ReturnType<typeof useGameStore.getState>['lastMove']>
  onComplete: () => void
}) {
  const movingRef = useRef<THREE.Mesh>(null)
  const capturedRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)
  const completed = useRef(false)
  const origin = useMemo(() => new THREE.Vector3(...worldPosition(move.from)), [move])
  const destination = useMemo(() => new THREE.Vector3(...worldPosition(move.to)), [move])

  useFrame((_, delta) => {
    if (!movingRef.current || !capturedRef.current || completed.current) return
    elapsed.current += delta
    const t = THREE.MathUtils.clamp(elapsed.current / 0.40, 0, 1)
    const travel = t * t * (3 - 2 * t)
    movingRef.current.position.lerpVectors(origin, destination, travel)
    movingRef.current.position.y += Math.sin(t * Math.PI) * 0.6
    movingRef.current.rotation.x = t * Math.PI * 1.2
    movingRef.current.rotation.z = t * Math.PI * 0.35
    const capture = THREE.MathUtils.smoothstep(t, 0.44, 0.84)
    capturedRef.current.position.y = 0.38 - capture * 0.55
    capturedRef.current.scale.setScalar(1 - capture * 0.25)
    if (t >= 1) { completed.current = true; onComplete() }
  })

  return (
    <>
      <mesh ref={capturedRef} position={worldPosition(move.over)} castShadow>
        <sphereGeometry args={[0.29, 48, 32]} />
        <meshPhysicalMaterial color={marbleColor(move.capturedMarbleId)}
          emissive={marbleColor(move.capturedMarbleId)} emissiveIntensity={0.015}
          roughness={0.12} metalness={0} clearcoat={1} clearcoatRoughness={0.06}
          envMapIntensity={0.5} />
      </mesh>
      <mesh ref={movingRef} position={worldPosition(move.from)} castShadow>
        <sphereGeometry args={[0.29, 48, 32]} />
        <meshPhysicalMaterial color={marbleColor(move.movingMarbleId)}
          emissive={marbleColor(move.movingMarbleId)} emissiveIntensity={0.06}
          roughness={0.12} metalness={0} clearcoat={1} clearcoatRoughness={0.06}
          envMapIntensity={0.5} />
      </mesh>
    </>
  )
}

const PARTICLE_COUNT = 20

function CaptureExplosion({ position, color, onDone }: {
  position: Position; color: string; onDone: () => void
}) {
  const elapsed = useRef(0)
  const pointsRef = useRef<THREE.Points>(null)
  const [ox, oy, oz] = worldPosition(position)

  const { geo, velArr } = useMemo(() => {
    const posArr = new Float32Array(PARTICLE_COUNT * 3)
    const velArr: [number, number, number][] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArr[i * 3] = ox; posArr[i * 3 + 1] = oy; posArr[i * 3 + 2] = oz
      const seed = i + (position.row + 4) * 31 + (position.col + 4) * 67
      const a = (i / PARTICLE_COUNT) * Math.PI * 2 + seededUnit(seed) * 0.6
      const r = 0.5 + seededUnit(seed + 1) * 1.5
      velArr.push([Math.cos(a) * r, 1.0 + seededUnit(seed + 2) * 2.4, Math.sin(a) * r])
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    return { geo: g, velArr }
  }, [ox, oy, oz, position.col, position.row])

  useEffect(() => () => geo.dispose(), [geo])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    elapsed.current += delta
    const t = elapsed.current
    const attr = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [vx, vy, vz] = velArr[i]
      arr[i * 3] = ox + vx * t
      arr[i * 3 + 1] = oy + vy * t - 5.5 * t * t
      arr[i * 3 + 2] = oz + vz * t
    }
    attr.needsUpdate = true
    ;(pointsRef.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - t / 0.60)
    if (t > 0.60) onDone()
  })

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial color={color} size={0.10} transparent opacity={1}
        depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

function Hole({ position, available, onSelect }: {
  position: Position; available: boolean; onSelect: () => void
}) {
  const targetRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!targetRef.current || !available) return
    targetRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 7) * 0.07)
  })

  return (
    <group position={[position.col * SPACING, 0.115, position.row * SPACING]}>
      <mesh receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        onPointerEnter={() => { if (available) document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { document.body.style.cursor = 'default' }}>
        <cylinderGeometry args={[0.285, 0.25, 0.09, 48, 1, false]} />
        <meshStandardMaterial
          color="#050817"
          emissive={available ? '#160b48' : '#030616'}
          emissiveIntensity={available ? 0.34 : 0.04}
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.283, 0.014, 8, 48]} />
        <meshPhysicalMaterial
          color="#353078"
          emissive={available ? '#6940c8' : '#211958'}
          emissiveIntensity={available ? 0.3 : 0.09}
          roughness={0.35}
          metalness={0.28}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[0, -0.047, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.246, 40]} />
        <meshBasicMaterial color="#01030d" />
      </mesh>
      <mesh position={[0, -0.054, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.245, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.58} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {available && (
        <group ref={targetRef} position={[0, 0.057, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.296, 0.316, 48]} />
            <meshBasicMaterial color="#8050ff" transparent opacity={0.8}
              depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <circleGeometry args={[0.055, 24]} />
            <meshBasicMaterial color="#c0a0ff" transparent opacity={0.9} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}

type Explosion = { id: number; position: Position; color: string }

function SurfaceAtmosphere() {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh position={[0, 0.122, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3.34, 96]} />
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vec2 p = vUv - 0.5;
            float radius = length(p) * 2.0;
            float vignette = smoothstep(1.0, 0.18, radius);
            float ring = sin(radius * 34.0 - uTime * 0.32) * 0.5 + 0.5;
            ring *= smoothstep(0.9, 0.25, radius);
            float sweep = max(0.0, dot(normalize(p + vec2(0.001)), normalize(vec2(cos(uTime * 0.08), sin(uTime * 0.08)))));
            vec3 color = vec3(0.20, 0.18, 0.62) * vignette;
            float alpha = 0.025 + ring * 0.018 + pow(sweep, 14.0) * 0.035;
            gl_FragColor = vec4(color, alpha * smoothstep(1.0, 0.78, radius));
          }
        `}
      />
    </mesh>
  )
}

function Board() {
  const occupied = useGameStore((s) => s.occupied)
  const marbleIds = useGameStore((s) => s.marbleIds)
  const selected = useGameStore((s) => s.selected)
  const lastMove = useGameStore((s) => s.lastMove)
  const select = useGameStore((s) => s.select)
  const finishAnimation = useGameStore((s) => s.finishAnimation)

  const selectedPosition = selected
    ? BOARD_POSITIONS.find((p) => keyOf(p) === selected)
    : undefined
  const validTargets = new Set(
    selectedPosition ? getValidMoves(occupied, selectedPosition).map((m) => keyOf(m.to)) : [],
  )
  const movableSources = new Set(getValidMoves(occupied).map((m) => keyOf(m.from)))

  const [explosions, setExplosions] = useState<Explosion[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    if (!lastMove) return
    setExplosions(prev => [...prev, {
      id: nextId.current++,
      position: lastMove.over,
      color: marbleColor(lastMove.capturedMarbleId),
    }])
  }, [lastMove])

  return (
    <group rotation={[0, -0.025, 0]} position={[0, 0, 0.18]}>
      {/* Base disc — deep navy with slight blue glow */}
      <mesh position={[0, -0.14, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.70, 3.78, 0.28, 128]} />
        <meshStandardMaterial color="#090c22" emissive="#101660"
          emissiveIntensity={0.11} roughness={0.22} metalness={0.64} />
      </mesh>

      {/* Play surface — true deep navy (not black) */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[3.50, 3.52, 0.13, 128]} />
        <meshStandardMaterial color="#10175a" emissive="#161c68"
          emissiveIntensity={0.035} roughness={0.3} metalness={0.22} />
      </mesh>
      <SurfaceAtmosphere />

      {/* ── Rim system ── */}

      {/* Dark structural rim */}
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.61, 0.105, 20, 128]} />
        <meshPhysicalMaterial
          color="#17144f"
          emissive="#302078"
          emissiveIntensity={0.1}
          roughness={0.2}
          metalness={0.62}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={0.55}
        />
      </mesh>

      {/* Translucent glass band */}
      <mesh position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.56, 0.072, 18, 128]} />
        <meshPhysicalMaterial
          color="#8d64e8"
          emissive="#6f42dc"
          emissiveIntensity={0.16}
          roughness={0.08}
          metalness={0.08}
          transmission={0.38}
          thickness={0.35}
          transparent
          opacity={0.68}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      {/* Bright inner rim line — the sharp highlight ring */}
      <mesh position={[0, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.46, 0.009, 8, 128]} />
        <meshBasicMaterial color="#e0caff" transparent opacity={0.72} />
      </mesh>

      {/* Soft glow bloom behind the bright ring */}
      <mesh position={[0, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.46, 0.032, 8, 128]} />
        <meshBasicMaterial color="#9060f0" transparent opacity={0.1}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Inner glow ring 1 */}
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.31, 0.008, 8, 128]} />
        <meshBasicMaterial color="#9858e8" transparent opacity={0.28} />
      </mesh>

      {/* Inner glow ring 2 */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.19, 0.006, 8, 128]} />
        <meshBasicMaterial color="#6840c0" transparent opacity={0.16} />
      </mesh>

      {BOARD_POSITIONS.map((position) => {
        const key = keyOf(position)
        const hasMarble = occupied.has(key)
        const marbleId = marbleIds.get(key)
        const isAnimatedDestination = lastMove && keyOf(lastMove.to) === key
        return (
          <group key={key}>
            <Hole position={position} available={validTargets.has(key)} onSelect={() => select(position)} />
            {hasMarble && marbleId !== undefined && !isAnimatedDestination && (
              <Marble position={position} marbleId={marbleId}
                selected={selected === key} movable={movableSources.has(key)}
                onSelect={() => select(position)} />
            )}
          </group>
        )
      })}

      {lastMove && (
        <MoveAnimation
          key={`${keyOf(lastMove.from)}-${keyOf(lastMove.to)}-${occupied.size}`}
          move={lastMove}
          onComplete={() => finishAnimation(lastMove)}
        />
      )}

      {explosions.map(exp => (
        <CaptureExplosion key={exp.id} position={exp.position} color={exp.color}
          onDone={() => setExplosions(prev => prev.filter(e => e.id !== exp.id))} />
      ))}
    </group>
  )
}

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const aspect = size.width / size.height
    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
    const limitingFov = Math.min(verticalFov, horizontalFov)

    // Fit the rim while reserving more vertical space on short landscape screens.
    const boardRadius = 3.95
    const compactMargin = THREE.MathUtils.clamp((820 - size.width) / 420, 0, 1)
    const shortLandscape = aspect > 1
      ? THREE.MathUtils.clamp((820 - size.height) / 420, 0, 1)
      : 0
    const fitMargin = 1.08 + compactMargin * 0.04 + shortLandscape * 0.22
    const distance = (boardRadius * fitMargin) / Math.sin(limitingFov / 2)

    const viewDirection = new THREE.Vector3(0, 0.9, 0.435).normalize()
    const targetZ = THREE.MathUtils.lerp(0.35, 0.05, compactMargin)
    const compactLandscape = aspect > 1 && size.width < 1100
    const targetX = compactLandscape
      ? -THREE.MathUtils.lerp(0.7, 1.35, shortLandscape)
      : 0
    const target = new THREE.Vector3(targetX, 0, targetZ)

    camera.position.copy(target).addScaledVector(viewDirection, distance)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])
  return null
}

function BackgroundStars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(150 * 3)
    for (let i = 0; i < 150; i++) {
      positions[i * 3] = (seededUnit(i * 3) - 0.5) * 24
      positions[i * 3 + 1] = seededUnit(i * 3 + 1) * 3 + 1.5
      positions[i * 3 + 2] = (seededUnit(i * 3 + 2) - 0.5) * 16
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return result
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#668cff"
        size={0.018}
        transparent
        opacity={0.34}
        depthWrite={false}
      />
    </points>
  )
}

export function GameScene() {
  return (
    <>
      <color attach="background" args={['#0b1236']} />

      <ambientLight intensity={0.13} color="#8b96c7" />
      <hemisphereLight args={['#aab8e8', '#120f35', 0.5]} />

      {/* Warm key and cool fill preserve volume instead of lighting every face evenly. */}
      <directionalLight
        castShadow
        position={[-3.5, 12, 5.5]}
        intensity={2.35}
        color="#ffe6cf"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[5, 8, -4]} intensity={0.48} color="#e8b8ff" />
      <directionalLight position={[-6, 5, -2]} intensity={0.78} color="#80dcff" />

      {/* Rim streak light — narrow spot from behind, creates the glow highlight on rim */}
      <spotLight
        position={[1, 7, -7]}
        intensity={28}
        angle={0.20}
        penumbra={0.5}
        color="#c890ff"
        castShadow={false}
      />

      {/* Fill + colour lights */}
      <pointLight position={[-5, 3, 3]} intensity={2.1} distance={11} color="#315ad8" />
      <pointLight position={[4, 2.5, 4]} intensity={1.45} distance={10} color="#7434b8" />
      <pointLight position={[0, 4.5, 1.5]} intensity={0.9} distance={7} color="#ffd3aa" />

      <BackgroundStars />
      <CameraRig />
      <Board />

    </>
  )
}
