import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Crown, Hammer, Map, Shield, Store, Swords, ZoomIn, ZoomOut } from 'lucide-react'
import { TILE_TYPES, assignRandomPlayerBase, generateMap, removeOldestGemTile, spawnGemTile } from './data/tileTypes'

const MAP_SIZE = 25
const TILE_SIZE = 112
const GEM_SPAWN_MS = 30_000
const MAX_ACTIVE_GEMS = 4
const CENTER_INDEX = Math.floor(MAP_SIZE / 2)
const CENTER_ID = `${CENTER_INDEX}-${CENTER_INDEX}`
const INITIAL_SCALE = 0.68

function TileImage({ def }) {
  const src = def.assets?.[0]
  if (!src) return <span className="tile-fallback visible">{def.fallback}</span>
  return <><img src={src} alt="" draggable="false" /><span className="tile-fallback">{def.fallback}</span></>
}

export default function App() {
  const initialMap = useMemo(() => generateMap(MAP_SIZE), [])
  const [tiles, setTiles] = useState(initialMap)
  const [selectedId, setSelectedId] = useState(CENTER_ID)
  const [scale, setScale] = useState(INITIAL_SCALE)
  const [offset, setOffset] = useState({ x: -735, y: -660 })
  const [nextGemIn, setNextGemIn] = useState(GEM_SPAWN_MS)
  const [notice, setNotice] = useState('Alta de jugador: ubicación aleatoria balanceada entre los 4 segmentos del mapa.')
  const [playerNumber, setPlayerNumber] = useState(1)
  const drag = useRef(null)
  const viewportRef = useRef(null)

  const selected = selectedId ? tiles.find((tile) => tile.id === selectedId) : null
  const activeGemCount = tiles.filter((tile) => tile.type === 'gems').length

  function clampOffset(nextOffset, atScale = scale) {
    const viewport = viewportRef.current
    if (!viewport) return nextOffset
    const rect = viewport.getBoundingClientRect()
    const worldWidth = MAP_SIZE * TILE_SIZE * atScale
    const worldHeight = MAP_SIZE * TILE_SIZE * atScale
    const minX = Math.min(0, rect.width - worldWidth)
    const minY = Math.min(0, rect.height - worldHeight)
    return { x: Math.min(0, Math.max(minX, nextOffset.x)), y: Math.min(0, Math.max(minY, nextOffset.y)) }
  }

  function centeredOffset(atScale = scale) {
    const viewport = viewportRef.current
    if (!viewport) return offset
    const rect = viewport.getBoundingClientRect()
    const centerOfOriginTile = (CENTER_INDEX + 0.5) * TILE_SIZE * atScale
    return clampOffset({ x: rect.width / 2 - centerOfOriginTile, y: rect.height / 2 - centerOfOriginTile }, atScale)
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNextGemIn((remaining) => {
        if (remaining <= 1000) {
          setTiles((current) => {
            const gemCount = current.filter((tile) => tile.type === 'gems').length
            const pruned = gemCount >= MAX_ACTIVE_GEMS ? removeOldestGemTile(current) : current
            return spawnGemTile(pruned)
          })
          return GEM_SPAWN_MS
        }
        return remaining - 1000
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const recenter = () => setOffset((current) => clampOffset(current, scale))
    recenter()
    window.addEventListener('resize', recenter)
    return () => window.removeEventListener('resize', recenter)
  }, [scale])

  function zoom(delta) {
    const nextScale = Math.min(1.3, Math.max(0.42, Number((scale + delta).toFixed(2))))
    if (nextScale === scale) return
    const viewport = viewportRef.current
    if (!viewport) return setScale(nextScale)
    const rect = viewport.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const ratio = nextScale / scale
    const nextOffset = { x: cx - (cx - offset.x) * ratio, y: cy - (cy - offset.y) * ratio }
    setScale(nextScale)
    setOffset(clampOffset(nextOffset, nextScale))
  }

  function centerOrigin() {
    setScale(INITIAL_SCALE)
    requestAnimationFrame(() => {
      setOffset(centeredOffset(INITIAL_SCALE))
      setSelectedId(CENTER_ID)
    })
  }

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, offsetX: offset.x, offsetY: offset.y, moved: false }
  }

  function onPointerMove(event) {
    if (!drag.current) return
    const dx = event.clientX - drag.current.pointerX
    const dy = event.clientY - drag.current.pointerY
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.current.moved = true
    setOffset(clampOffset({ x: drag.current.offsetX + dx, y: drag.current.offsetY + dy }))
  }

  function onPointerUp() {
    setOffset((current) => clampOffset(current))
    window.setTimeout(() => { drag.current = null }, 0)
  }

  function selectTile(tile) {
    if (drag.current?.moved) return
    setSelectedId(tile.id)
  }

  function tileDescription(tile) {
    const def = TILE_TYPES[tile.type]
    if (tile.isPlayerBase) return `${tile.owner} · Base del reino`
    if (def.resource === 'wood') return 'Recurso: madera'
    if (def.resource === 'stone') return 'Recurso: piedra'
    if (def.resource === 'food') return 'Recurso: comida'
    if (def.resource === 'gems') return 'Evento temporal: farmea gemas'
    if (def.role === 'enemy') return 'Campamento enemigo'
    if (def.role === 'mission') return 'Punto de misión'
    return 'Terreno del mundo'
  }

  function primaryLabel(tile) {
    if (tile.isPlayerBase) return 'Base'
    if (tile.type === 'gems') return 'Farmear'
    if (tile.type === 'enemy') return 'Atacar'
    if (tile.type === 'mission') return 'Misión'
    return 'Ver'
  }

  function simulatePlayerJoin() {
    const owner = `Jugador ${String(playerNumber).padStart(2, '0')}`
    const result = assignRandomPlayerBase(tiles, owner)
    if (!result.assigned) {
      setNotice(result.reason)
      return
    }
    setTiles(result.tiles)
    setSelectedId(result.target.id)
    setPlayerNumber((value) => value + 1)
    setNotice(`${owner} asignado al segmento ${result.quadrant} en (${result.target.worldX}, ${result.target.worldY}). La casilla original pasó a Tile 1 y recibió ${result.counts.wood} madera, ${result.counts.stone} piedra y ${result.counts.food} comida a 2–3 casillas.`)
  }

  return (
    <main className="game-shell">
      <section className="game-phone" aria-label="Kingdom Wars prototype">
        <header className="top-bar">
          <div className="brand-row"><div><p className="eyebrow">TEMPORADA 0 · MAPA 25×25</p><h1>KINGDOM WARS</h1></div><div className="king-balance"><Crown size={18} /> 120 KING</div></div>
          <div className="resource-row"><div><span>🌲</span><strong>1.2K</strong><small>Madera</small></div><div><span>🪨</span><strong>850</strong><small>Piedra</small></div><div><span>🌾</span><strong>640</strong><small>Comida</small></div></div>
        </header>

        <div ref={viewportRef} className="map-viewport" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="map-grid" style={{ gridTemplateColumns: `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`, gridAutoRows: `${TILE_SIZE}px`, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            {tiles.map((tile) => {
              const def = TILE_TYPES[tile.type]
              const onXAxis = tile.worldY === 0
              const onYAxis = tile.worldX === 0
              const isOrigin = onXAxis && onYAxis
              return (
                <button key={tile.id} type="button" className={`tile tile-${def.role} ${tile.type === 'gems' ? 'gem-spawn' : ''} ${tile.isPlayerBase ? 'player-base' : ''} ${onXAxis ? 'axis-x' : ''} ${onYAxis ? 'axis-y' : ''} ${isOrigin ? 'origin' : ''} ${selectedId === tile.id ? 'selected' : ''}`} onClick={() => selectTile(tile)} aria-label={`${def.name}, coordenadas ${tile.worldX}, ${tile.worldY}`}>
                  <TileImage def={def} />
                  {(onXAxis || onYAxis) && <span className="axis-coordinate">{tile.worldX},{tile.worldY}</span>}
                  {tile.isPlayerBase && <span className="base-marker" aria-hidden="true">🏰</span>}
                </button>
              )
            })}
          </div>
          <div className="zoom-controls"><button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(0.1)} aria-label="Acercar"><ZoomIn /></button><button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(-0.1)} aria-label="Alejar"><ZoomOut /></button><button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={centerOrigin} aria-label="Centrar en cero cero"><Crosshair /></button></div>
          <div className="map-badge"><Map size={15} /> X: −12…12 · Y: −12…12</div>
          <div className="gem-status"><span className="gem-dot">◆</span><div><strong>{activeGemCount}/{MAX_ACTIVE_GEMS} gemas</strong><small>Nueva en {Math.ceil(nextGemIn / 1000)}s</small></div></div>
        </div>

        <div className="notice-bar"><span>{notice}</span><button type="button" className="spawn-player-button" onClick={simulatePlayerJoin}>+ Jugador</button></div>

        <section className="selection-panel">
          {selected ? <><div className="selection-icon">{selected.isPlayerBase ? '🏰' : TILE_TYPES[selected.type].fallback}</div><div className="selection-copy"><small>COORD. ({selected.worldX}, {selected.worldY}) · TILE {TILE_TYPES[selected.type].tileNumber}</small><strong>{selected.isPlayerBase ? 'Base del jugador' : TILE_TYPES[selected.type].name}</strong><span>{tileDescription(selected)}</span></div><button type="button" className="primary-action" disabled={selected.isPlayerBase}>{primaryLabel(selected)}</button></> : <div className="selection-empty">Arrastra para explorar. Toca una casilla para inspeccionarla.</div>}
        </section>

        <nav className="bottom-nav" aria-label="Navegación principal"><button type="button"><Swords /><span>Batalla</span></button><button type="button"><Hammer /><span>Construir</span></button><button type="button" className="active"><Crown /><span>Reino</span></button><button type="button"><Shield /><span>Clan</span></button><button type="button"><Store /><span>Mercado</span></button></nav>
      </section>
    </main>
  )
}
