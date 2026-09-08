import { useEffect, useMemo, useRef, useState } from 'react'
import { Crown, Hammer, Map, Shield, Store, Swords, ZoomIn, ZoomOut } from 'lucide-react'
import { TILE_TYPES, generateMap, removeOldestGemTile, spawnGemTile } from './data/tileTypes'

const MAP_SIZE = 30
const TILE_SIZE = 112
const GEM_SPAWN_MS = 30_000
const MAX_ACTIVE_GEMS = 4

function TileImage({ def }) {
  const [candidate, setCandidate] = useState(0)
  const [failed, setFailed] = useState(false)
  const src = def.assets?.[candidate]

  if (failed || !src) {
    return <span className="tile-fallback visible">{def.fallback}</span>
  }

  return (
    <>
      <img
        src={src}
        alt=""
        draggable="false"
        onError={() => {
          if (candidate < def.assets.length - 1) setCandidate((value) => value + 1)
          else setFailed(true)
        }}
      />
      <span className="tile-fallback">{def.fallback}</span>
    </>
  )
}

export default function App() {
  const initialMap = useMemo(() => generateMap(MAP_SIZE), [])
  const [tiles, setTiles] = useState(initialMap)
  const [selectedId, setSelectedId] = useState(null)
  const [scale, setScale] = useState(0.68)
  const [offset, setOffset] = useState({ x: -1120, y: -1180 })
  const [nextGemIn, setNextGemIn] = useState(GEM_SPAWN_MS)
  const drag = useRef(null)

  const selected = selectedId ? tiles.find((tile) => tile.id === selectedId) : null
  const activeGemCount = tiles.filter((tile) => tile.type === 'gems').length

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

  function zoom(delta) {
    setScale((value) => Math.min(1.3, Math.max(0.42, Number((value + delta).toFixed(2)))))
  }

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
      moved: false,
    }
  }

  function onPointerMove(event) {
    if (!drag.current) return
    const dx = event.clientX - drag.current.pointerX
    const dy = event.clientY - drag.current.pointerY
    if (Math.abs(dx) + Math.abs(dy) > 8) drag.current.moved = true
    setOffset({ x: drag.current.offsetX + dx, y: drag.current.offsetY + dy })
  }

  function onPointerUp() {
    window.setTimeout(() => {
      drag.current = null
    }, 0)
  }

  function selectTile(tile) {
    if (drag.current?.moved) return
    setSelectedId(tile.id)
  }

  function tileDescription(tile) {
    const def = TILE_TYPES[tile.type]
    if (def.resource === 'wood') return 'Recurso: madera'
    if (def.resource === 'stone') return 'Recurso: piedra'
    if (def.resource === 'food') return 'Recurso: comida'
    if (def.resource === 'gems') return 'Evento temporal: farmea gemas'
    if (def.role === 'enemy') return 'Campamento enemigo'
    if (def.role === 'mission') return 'Punto de misión'
    return 'Terreno del mundo'
  }

  return (
    <main className="game-shell">
      <section className="game-phone" aria-label="Kingdom Wars prototype">
        <header className="top-bar">
          <div className="brand-row">
            <div>
              <p className="eyebrow">TEMPORADA 0</p>
              <h1>KINGDOM WARS</h1>
            </div>
            <div className="king-balance"><Crown size={18} /> 120 KING</div>
          </div>
          <div className="resource-row">
            <div><span>🌲</span><strong>1.2K</strong><small>Madera</small></div>
            <div><span>🪨</span><strong>850</strong><small>Piedra</small></div>
            <div><span>🌾</span><strong>640</strong><small>Comida</small></div>
          </div>
        </header>

        <div
          className="map-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="map-grid"
            style={{
              gridTemplateColumns: `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`,
              gridAutoRows: `${TILE_SIZE}px`,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          >
            {tiles.map((tile) => {
              const def = TILE_TYPES[tile.type]
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`tile tile-${def.role} ${tile.type === 'gems' ? 'gem-spawn' : ''} ${selectedId === tile.id ? 'selected' : ''}`}
                  onClick={() => selectTile(tile)}
                  aria-label={`${def.name}, casilla ${tile.x + 1}, ${tile.y + 1}`}
                >
                  <TileImage def={def} />
                </button>
              )
            })}
          </div>

          <div className="zoom-controls">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(0.1)} aria-label="Acercar"><ZoomIn /></button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(-0.1)} aria-label="Alejar"><ZoomOut /></button>
          </div>

          <div className="map-badge"><Map size={15} /> Mundo 01</div>
          <div className="gem-status">
            <span className="gem-dot">◆</span>
            <div><strong>{activeGemCount}/{MAX_ACTIVE_GEMS} gemas</strong><small>Nueva en {Math.ceil(nextGemIn / 1000)}s</small></div>
          </div>
        </div>

        <section className="selection-panel">
          {selected ? (
            <>
              <div className="selection-icon">{TILE_TYPES[selected.type].fallback}</div>
              <div className="selection-copy">
                <small>CASILLA {selected.x + 1},{selected.y + 1} · TILE {TILE_TYPES[selected.type].tileNumber}</small>
                <strong>{TILE_TYPES[selected.type].name}</strong>
                <span>{tileDescription(selected)}</span>
              </div>
              <button type="button" className="primary-action">
                {selected.type === 'gems' ? 'Farmear' : selected.type === 'enemy' ? 'Atacar' : selected.type === 'mission' ? 'Misión' : 'Ver'}
              </button>
            </>
          ) : (
            <div className="selection-empty">Arrastra para explorar. Toca una casilla para inspeccionarla.</div>
          )}
        </section>

        <nav className="bottom-nav" aria-label="Navegación principal">
          <button type="button"><Swords /><span>Batalla</span></button>
          <button type="button"><Hammer /><span>Construir</span></button>
          <button type="button" className="active"><Crown /><span>Reino</span></button>
          <button type="button"><Shield /><span>Clan</span></button>
          <button type="button"><Store /><span>Mercado</span></button>
        </nav>
      </section>
    </main>
  )
}
