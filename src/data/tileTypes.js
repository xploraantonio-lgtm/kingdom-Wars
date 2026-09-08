export const TILE_TYPES = {
  base: {
    name: 'Terreno nevado',
    tileNumber: 1,
    role: 'base',
    fallback: '❄️',
    assets: ['/assets/tiles/tile1.png', '/assets/tiles/tile1.webp', '/assets/tiles/1.png', '/assets/tiles/1.webp'],
  },
  wood: {
    name: 'Bosque de madera',
    tileNumber: 2,
    role: 'resource',
    resource: 'wood',
    fallback: '🌲',
    assets: ['/assets/tiles/tile2.png', '/assets/tiles/tile2.webp', '/assets/tiles/2.png', '/assets/tiles/2.webp'],
  },
  stoneA: {
    name: 'Cantera',
    tileNumber: 3,
    role: 'resource',
    resource: 'stone',
    fallback: '🪨',
    assets: ['/assets/tiles/tile3.png', '/assets/tiles/tile3.webp', '/assets/tiles/3.png', '/assets/tiles/3.webp'],
  },
  decorativeA: {
    name: 'Terreno decorativo',
    tileNumber: 4,
    role: 'decorative',
    fallback: '🏔️',
    assets: ['/assets/tiles/tile4.png', '/assets/tiles/tile4.webp', '/assets/tiles/4.png', '/assets/tiles/4.webp'],
  },
  stoneB: {
    name: 'Yacimiento de piedra',
    tileNumber: 5,
    role: 'resource',
    resource: 'stone',
    fallback: '⛏️',
    assets: ['/assets/tiles/tile5.png', '/assets/tiles/tile5.webp', '/assets/tiles/5.png', '/assets/tiles/5.webp'],
  },
  gems: {
    name: 'Gemas doradas',
    tileNumber: 6,
    role: 'event',
    resource: 'gems',
    fallback: '💎',
    assets: ['/assets/tiles/tile6.png', '/assets/tiles/tile6.webp', '/assets/tiles/6.png', '/assets/tiles/6.webp'],
  },
  decorativeB: {
    name: 'Terreno decorativo',
    tileNumber: 7,
    role: 'decorative',
    fallback: '💧',
    assets: ['/assets/tiles/tile7.png', '/assets/tiles/tile7.webp', '/assets/tiles/7.png', '/assets/tiles/7.webp'],
  },
  food: {
    name: 'Zona de comida',
    tileNumber: 8,
    role: 'resource',
    resource: 'food',
    fallback: '🌾',
    assets: ['/assets/tiles/tile8.png', '/assets/tiles/tile8.webp', '/assets/tiles/8.png', '/assets/tiles/8.webp'],
  },
  enemy: {
    name: 'Campamento enemigo',
    tileNumber: 9,
    role: 'enemy',
    fallback: '⚔️',
    assets: ['/assets/tiles/tile9.png', '/assets/tiles/tile9.webp', '/assets/tiles/9.png', '/assets/tiles/9.webp'],
  },
  mission: {
    name: 'Misión',
    tileNumber: 10,
    role: 'mission',
    fallback: '📜',
    assets: ['/assets/tiles/tile10.png', '/assets/tiles/tile10.webp', '/assets/tiles/10.png', '/assets/tiles/10.webp'],
  },
}

function hash(x, y, salt = 0) {
  let value = Math.imul(x + 11 + salt, 374761393) + Math.imul(y + 17, 668265263)
  value = (value ^ (value >>> 13)) * 1274126177
  return (value ^ (value >>> 16)) >>> 0
}

export function generateMap(size = 30) {
  return Array.from({ length: size * size }, (_, index) => {
    const x = index % size
    const y = Math.floor(index / size)
    const roll = hash(x, y) % 1000
    let type = 'base'

    // El mapa es principalmente Tile 1 para que visualmente se lea como un terreno continuo.
    // Los recursos y puntos de interés son relativamente raros y estratégicos.
    if (roll < 78) type = 'wood'             // 7.8% madera
    else if (roll < 120) type = 'stoneA'     // 4.2% piedra variante A
    else if (roll < 154) type = 'stoneB'     // 3.4% piedra variante B
    else if (roll < 192) type = 'food'       // 3.8% comida
    else if (roll < 207) type = 'enemy'      // 1.5% enemigos
    else if (roll < 216) type = 'mission'    // 0.9% misiones
    else if (roll < 246) type = 'decorativeA' // 3% decoración
    else if (roll < 272) type = 'decorativeB' // 2.6% decoración

    return { id: `${x}-${y}`, x, y, type, baseType: type }
  })
}

export function spawnGemTile(tiles) {
  const candidates = tiles.filter((tile) => tile.type === 'base')
  if (!candidates.length) return tiles

  const chosen = candidates[Math.floor(Math.random() * candidates.length)]
  return tiles.map((tile) => tile.id === chosen.id
    ? { ...tile, type: 'gems', spawnedAt: Date.now() }
    : tile)
}

export function removeOldestGemTile(tiles) {
  const gems = tiles
    .filter((tile) => tile.type === 'gems')
    .sort((a, b) => (a.spawnedAt ?? 0) - (b.spawnedAt ?? 0))

  if (!gems.length) return tiles
  const oldest = gems[0]
  return tiles.map((tile) => tile.id === oldest.id
    ? { ...tile, type: 'base', spawnedAt: undefined }
    : tile)
}
