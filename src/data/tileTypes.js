export const TILE_TYPES = {
  snow: { name: 'Nieve', asset: '/assets/tiles/snow.webp', fallback: '❄️' },
  forest: { name: 'Bosque', asset: '/assets/tiles/forest.webp', fallback: '🌲' },
  mountain: { name: 'Montaña', asset: '/assets/tiles/mountain.webp', fallback: '⛰️' },
  lake: { name: 'Lago', asset: '/assets/tiles/lake.webp', fallback: '💧' },
  gold: { name: 'Cristal dorado', asset: '/assets/tiles/gold.webp', fallback: '💎' },
  rock: { name: 'Depósito rocoso', asset: '/assets/tiles/rock.webp', fallback: '🪨' },
  dirt: { name: 'Tierra', asset: '/assets/tiles/dirt.webp', fallback: '🟫' },
  farm: { name: 'Granja', asset: '/assets/tiles/farm.webp', fallback: '🌾' },
  ruins: { name: 'Ruinas', asset: '/assets/tiles/ruins.webp', fallback: '🏛️' },
  camp: { name: 'Campamento enemigo', asset: '/assets/tiles/camp.webp', fallback: '⛺' },
}

export function generateMap(size = 24) {
  const keys = Object.keys(TILE_TYPES)
  return Array.from({ length: size * size }, (_, index) => {
    const x = index % size
    const y = Math.floor(index / size)
    const roll = (x * 17 + y * 31 + x * y * 7) % 100

    let type = 'snow'
    if (roll < 12) type = 'forest'
    else if (roll < 19) type = 'mountain'
    else if (roll < 24) type = 'lake'
    else if (roll < 27) type = 'rock'
    else if (roll < 29) type = 'dirt'
    else if (roll === 44) type = 'gold'
    else if (roll === 55) type = 'ruins'
    else if (roll === 66) type = 'farm'
    else if (roll === 77) type = 'camp'

    return { id: `${x}-${y}`, x, y, type: keys.includes(type) ? type : 'snow' }
  })
}
