import { useMemo, useRef, useState } from 'react'
import { Crown, Hammer, Map, Shield, Store, Swords, ZoomIn, ZoomOut } from 'lucide-react'
import { TILE_TYPES, generateMap } from './data/tileTypes'

const MAP_SIZE = 24
const TILE_SIZE = 108

export default function App() {
  const tiles = useMemo(() => generateMap(MAP_SIZE), [])
  const [selected, setSelected] = useState(null)
  const [scale, setScale] = useState(0.72)
  const [offset, setOffset] = useState({ x: -760, y: -790 })
  const drag = useRef(null)

  function zoom(delta) {
    setScale((value) => Math.min(1.25, Math.max(0.45, Number((value + delta).toFixed(2)))))
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
    setSelected(tile)
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
            <div><span>⛏️</span><strong>850</strong><small>Hierro</small></div>
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
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          >
            {tiles.map((tile) => {
              const def = TILE_TYPES[tile.type]
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`tile ${selected?.id === tile.id ? 'selected' : ''}`}
                  onClick={() => selectTile(tile)}
                  aria-label={`${def.name}, casilla ${tile.x + 1}, ${tile.y + 1}`}
                >
                  <img
                    src={def.asset}
                    alt=""
                    draggable="false"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                      event.currentTarget.nextElementSibling.style.display = 'grid'
                    }}
                  />
                  <span className="tile-fallback">{def.fallback}</span>
                  <span className="tile-coordinate">{tile.x + 1},{tile.y + 1}</span>
                </button>
              )
            })}
          </div>

          <div className="zoom-controls">
            <button type="button" onClick={(e) => { e.stopPropagation(); zoom(0.1) }} aria-label="Acercar"><ZoomIn /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); zoom(-0.1) }} aria-label="Alejar"><ZoomOut /></button>
          </div>

          <div className="map-badge"><Map size={15} /> Mundo 01</div>
        </div>

        <section className="selection-panel">
          {selected ? (
            <>
              <div className="selection-icon">{TILE_TYPES[selected.type].fallback}</div>
              <div className="selection-copy">
                <small>CASILLA {selected.x + 1},{selected.y + 1}</small>
                <strong>{TILE_TYPES[selected.type].name}</strong>
                <span>{selected.type === 'gold' ? 'Recurso especial disputable' : 'Territorio del mundo'}</span>
              </div>
              <button type="button" className="primary-action">Ver</button>
            </>
          ) : (
            <div className="selection-empty">Toca una casilla para inspeccionarla.</div>
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
