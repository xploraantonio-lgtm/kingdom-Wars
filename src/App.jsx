import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Crown, MapPin, Search, X, ZoomIn, ZoomOut } from 'lucide-react'
import { TILE_TYPES, assignPlayerBase, assignRandomPlayerBase, generateMap, removeOldestGemTile, spawnGemTile } from './data/tileTypes'

const MAP_SIZE = 50
const TILE_SIZE = 112
const GEM_SPAWN_MS = 30_000
const MAX_ACTIVE_GEMS = 4
const CENTER_INDEX = Math.floor(MAP_SIZE / 2)
const CENTER_ID = `${CENTER_INDEX}-${CENTER_INDEX}`
const INITIAL_SCALE = 0.68
const DEMO_BASE = { worldX: 4, worldY: -3 }
const DEMO_BASE_ID = `${DEMO_BASE.worldX + CENTER_INDEX}-${CENTER_INDEX - DEMO_BASE.worldY}`
const BASE_ASSET = '/assets/ui/base.png'
const MIN_COORD = -CENTER_INDEX
const MAX_COORD = MAP_SIZE - CENTER_INDEX - 1

const MENU_ITEMS = [
  { id: 'battle', label: 'Batalla', src: '/assets/ui/battle.png' },
  { id: 'build', label: 'Construir', src: '/assets/ui/build.png' },
  { id: 'home', label: 'Inicio', src: '/assets/ui/home.png' },
  { id: 'clan', label: 'Clan', src: '/assets/ui/clan.png' },
  { id: 'market', label: 'Mercado', src: '/assets/ui/market.png' },
]

function TileImage({ def }) {
  const src = def.assets?.[0]
  if (!src) return <span className="tile-fallback visible">{def.fallback}</span>
  return <><img className="terrain-image" src={src} alt="" draggable="false" /><span className="tile-fallback">{def.fallback}</span></>
}

export default function App() {
  const initialMap = useMemo(() => {
    const generated = generateMap(MAP_SIZE)
    const demo = assignPlayerBase(generated, DEMO_BASE_ID, 'Jugador 01')
    return demo.assigned ? demo.tiles : generated
  }, [])

  const [tiles, setTiles] = useState(initialMap)
  const [selectedId, setSelectedId] = useState(DEMO_BASE_ID)
  const [popupOpen, setPopupOpen] = useState(false)
  const [scale, setScale] = useState(INITIAL_SCALE)
  const [offset, setOffset] = useState({ x: -1500, y: -1500 })
  const [nextGemIn, setNextGemIn] = useState(GEM_SPAWN_MS)
  const [notice, setNotice] = useState('Mapa 50×50. Toca recursos, bases, enemigos, gemas, misiones o escombros para ver su ficha.')
  const [playerNumber, setPlayerNumber] = useState(2)
  const [activeMenu, setActiveMenu] = useState('home')
  const [coordQuery, setCoordQuery] = useState('')
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
    return {
      x: Math.min(0, Math.max(minX, nextOffset.x)),
      y: Math.min(0, Math.max(minY, nextOffset.y)),
    }
  }

  function tileCenteredOffset(worldX, worldY, atScale = scale) {
    const viewport = viewportRef.current
    if (!viewport) return offset
    const rect = viewport.getBoundingClientRect()
    const gridX = worldX + CENTER_INDEX
    const gridY = CENTER_INDEX - worldY
    const tileCenterX = (gridX + 0.5) * TILE_SIZE * atScale
    const tileCenterY = (gridY + 0.5) * TILE_SIZE * atScale
    return clampOffset({
      x: rect.width / 2 - tileCenterX,
      y: rect.height / 2 - tileCenterY,
    }, atScale)
  }

  function focusTile(worldX, worldY, atScale = scale) {
    requestAnimationFrame(() => setOffset(tileCenteredOffset(worldX, worldY, atScale)))
  }

  useEffect(() => {
    focusTile(DEMO_BASE.worldX, DEMO_BASE.worldY, INITIAL_SCALE)
  }, [])

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
    setSelectedId(CENTER_ID)
    setPopupOpen(false)
    focusTile(0, 0, INITIAL_SCALE)
  }

  function onPointerDown(event) {
    if (event.target.closest('.map-search, .zoom-controls, .tile-popup')) return
    drag.current = {
      pointerId: event.pointerId,
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
    if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) > 8) {
      drag.current.moved = true
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch {}
    }
    if (!drag.current.moved) return
    setOffset(clampOffset({ x: drag.current.offsetX + dx, y: drag.current.offsetY + dy }))
  }

  function onPointerUp(event) {
    setOffset((current) => clampOffset(current))
    if (drag.current?.moved) {
      try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {}
    }
    window.setTimeout(() => { drag.current = null }, 0)
  }

  function isImportantTile(tile) {
    const def = TILE_TYPES[tile.type]
    return Boolean(tile.isPlayerBase || def.resource || ['enemy', 'mission'].includes(def.role) || tile.type === 'decorativeA')
  }

  function selectTile(tile) {
    if (drag.current?.moved) return
    setSelectedId(tile.id)
    if (isImportantTile(tile)) {
      setPopupOpen(true)
      setNotice(`(${tile.worldX}, ${tile.worldY}) · ${tile.isPlayerBase ? 'Base del jugador' : TILE_TYPES[tile.type].name}`)
    } else {
      setPopupOpen(false)
    }
  }

  function popupData(tile) {
    const def = TILE_TYPES[tile.type]
    const tileLabel = `Tile ${def.tileNumber}`

    if (tile.isPlayerBase) return {
      title: 'Base del jugador',
      subtitle: tile.owner,
      lines: [
        'Centro del reino',
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Terreno base: Tile 1',
        'Desde aquí se gestionarán edificios, defensa y tropas.',
      ],
      image: BASE_ASSET,
      action: 'Ver base',
    }

    if (def.resource === 'wood') return {
      title: 'Bosque de madera',
      subtitle: `${tileLabel} · Recurso: Madera`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Nodo natural de madera.',
        'Puede ser recolectado, protegido o disputado por otros jugadores.',
        'Se usará principalmente para construcciones y mejoras.',
      ],
      image: def.assets?.[0],
      action: 'Recolectar madera',
    }

    if (def.resource === 'stone') return {
      title: def.name,
      subtitle: `${tileLabel} · Recurso: Piedra`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Yacimiento de piedra del mapa.',
        'Puede ser explotado, protegido o conquistado.',
        'Se usará para fortificaciones, edificios y mejoras.',
      ],
      image: def.assets?.[0],
      action: 'Extraer piedra',
    }

    if (def.resource === 'food') return {
      title: 'Zona de comida',
      subtitle: `${tileLabel} · Recurso: Comida`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Zona productiva de alimento.',
        'Sostiene el crecimiento del reino y el mantenimiento de tropas.',
      ],
      image: def.assets?.[0],
      action: 'Recolectar comida',
    }

    if (def.resource === 'gems') return {
      title: 'Gemas doradas',
      subtitle: `${tileLabel} · Evento temporal`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Aparición especial y limitada en el mapa.',
        'Debes farmearla antes de que desaparezca y la casilla vuelva a Tile 1.',
      ],
      image: def.assets?.[0],
      action: 'Farmear gemas',
    }

    if (def.role === 'enemy') return {
      title: 'Campamento enemigo',
      subtitle: `${tileLabel} · Enemigo`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Objetivo hostil del mapa.',
        'Podrás atacarlo para obtener botín, progreso y control territorial.',
      ],
      image: def.assets?.[0],
      action: 'Atacar',
    }

    if (def.role === 'mission') return {
      title: 'Punto de misión',
      subtitle: `${tileLabel} · Misión`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Contiene un objetivo o evento del mundo.',
        'Completa sus condiciones para reclamar recompensas.',
      ],
      image: def.assets?.[0],
      action: 'Ver misión',
    }

    if (tile.type === 'decorativeA') return {
      title: 'Escombros',
      subtitle: `${tileLabel} · Punto de interés`,
      lines: [
        `Posición: (${tile.worldX}, ${tile.worldY})`,
        'Restos abandonados en el mapa.',
        'Puede convertirse en un punto de exploración, loot o una futura ubicación estratégica.',
      ],
      image: def.assets?.[0],
      action: 'Explorar',
    }

    return {
      title: def.name,
      subtitle: `${tileLabel} · Terreno`,
      lines: [`Posición: (${tile.worldX}, ${tile.worldY})`, 'Casilla del mundo.'],
      image: def.assets?.[0],
      action: 'Cerrar',
    }
  }

  function searchCoordinates(event) {
    event.preventDefault()
    const match = coordQuery.trim().match(/^\(?\s*(-?\d+)\s*[,;\s]\s*(-?\d+)\s*\)?$/)
    if (!match) {
      setNotice('Escribe coordenadas exactas como 4,-3')
      return
    }
    const worldX = Number(match[1])
    const worldY = Number(match[2])
    if (worldX < MIN_COORD || worldX > MAX_COORD || worldY < MIN_COORD || worldY > MAX_COORD) {
      setNotice(`Fuera del mapa. Rango válido: X ${MIN_COORD}…${MAX_COORD}, Y ${MIN_COORD}…${MAX_COORD}.`)
      return
    }
    const id = `${worldX + CENTER_INDEX}-${CENTER_INDEX - worldY}`
    const tile = tiles.find((item) => item.id === id)
    if (!tile) return
    setSelectedId(tile.id)
    setPopupOpen(isImportantTile(tile))
    focusTile(worldX, worldY)
    setNotice(`Coordenada encontrada: (${worldX}, ${worldY}) · ${tile.isPlayerBase ? 'Base del jugador' : TILE_TYPES[tile.type].name}`)
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
    setPopupOpen(true)
    setPlayerNumber((value) => value + 1)
    focusTile(result.target.worldX, result.target.worldY)
    setNotice(`${owner} → segmento ${result.quadrant} → (${result.target.worldX}, ${result.target.worldY}). Entorno: ${result.counts.wood} madera, ${result.counts.stone} piedra y ${result.counts.food} comida.`)
  }

  const detail = selected ? popupData(selected) : null

  return (
    <main className="game-shell">
      <section className="game-phone" aria-label="Kingdom Wars prototype">
        <header className="top-bar">
          <div className="brand-row"><div><p className="eyebrow">TEMPORADA 0 · MAPA {MAP_SIZE}×{MAP_SIZE}</p><h1>KINGDOM WARS</h1></div></div>
          <div className="resource-row resource-row-four">
            <div><span>🌲</span><strong>1.2K</strong><small>Madera</small></div>
            <div><span>🪨</span><strong>850</strong><small>Piedra</small></div>
            <div><span>🌾</span><strong>640</strong><small>Comida</small></div>
            <div className="king-resource"><Crown size={20} /><strong>120</strong><small>KING</small></div>
          </div>
        </header>

        <div ref={viewportRef} className="map-viewport" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <form className="map-search" onSubmit={searchCoordinates}>
            <MapPin size={16} />
            <input value={coordQuery} onChange={(e) => setCoordQuery(e.target.value)} placeholder="X,Y  ej. 4,-3" aria-label="Buscar coordenadas" />
            <button type="submit" aria-label="Buscar"><Search size={17} /></button>
          </form>

          <div className="map-grid" style={{ gridTemplateColumns: `repeat(${MAP_SIZE}, ${TILE_SIZE}px)`, gridAutoRows: `${TILE_SIZE}px`, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            {tiles.map((tile) => {
              const def = TILE_TYPES[tile.type]
              const important = isImportantTile(tile)
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`tile tile-${def.role} ${important ? 'tile-interactive' : ''} ${tile.type === 'gems' ? 'gem-spawn' : ''} ${tile.isPlayerBase ? 'player-base' : ''} ${selectedId === tile.id ? 'selected' : ''}`}
                  onClick={() => selectTile(tile)}
                  aria-haspopup={important ? 'dialog' : undefined}
                  aria-label={`${def.name}, coordenadas ${tile.worldX}, ${tile.worldY}${important ? ', abrir información' : ''}`}
                >
                  <TileImage def={def} />
                  <span className="axis-coordinate">{tile.worldX},{tile.worldY}</span>
                  {tile.isPlayerBase && <img className="base-layer" src={BASE_ASSET} alt="" draggable="false" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          <div className="zoom-controls">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(0.1)} aria-label="Acercar"><ZoomIn /></button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => zoom(-0.1)} aria-label="Alejar"><ZoomOut /></button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={centerOrigin} aria-label="Centrar en cero cero"><Crosshair /></button>
          </div>

          <div className="gem-status"><span className="gem-dot">◆</span><div><strong>{activeGemCount}/{MAX_ACTIVE_GEMS} gemas</strong><small>Nueva en {Math.ceil(nextGemIn / 1000)}s</small></div></div>

          {popupOpen && selected && detail && (
            <section className="tile-popup" role="dialog" aria-modal="false" aria-label="Información de la casilla">
              <button className="popup-close" type="button" onClick={() => setPopupOpen(false)} aria-label="Cerrar"><X size={20} /></button>
              <div className="popup-art"><img src={detail.image} alt="" /></div>
              <div className="popup-copy">
                <small>COORD. ({selected.worldX}, {selected.worldY}) · TILE {TILE_TYPES[selected.type].tileNumber}</small>
                <h2>{detail.title}</h2>
                <strong>{detail.subtitle}</strong>
                {detail.lines.map((line) => <p key={line}>{line}</p>)}
              </div>
              <button type="button" className="popup-action" onClick={() => setNotice(`${detail.action}: (${selected.worldX}, ${selected.worldY}) · ${detail.title}`)}>{detail.action}</button>
            </section>
          )}
        </div>

        <div className="notice-bar"><span>{notice}</span><button type="button" className="spawn-player-button" onClick={simulatePlayerJoin}>+ Jugador</button></div>

        <nav className="bottom-nav" aria-label="Navegación principal">
          {MENU_ITEMS.map((item) => (
            <button key={item.id} type="button" className={activeMenu === item.id ? 'active' : ''} onClick={() => setActiveMenu(item.id)}>
              <img className="nav-art" src={item.src} alt="" draggable="false" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  )
}
