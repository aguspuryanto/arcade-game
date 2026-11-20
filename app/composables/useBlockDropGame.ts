// app/composables/useBlockDropGame.ts — logika game balok jatuh
import type {
  ActivePiece, BlockDropAction, BlockDropStatus, BlockDropView, Board, PieceType, Rotation,
} from '~/types/blockDrop'
import { BD, PIECE_SHAPES, PIECE_TYPES } from '~/types/blockDrop'

const GAME_ID = 'block-drop'
const TOTAL_ROWS = BD.ROWS + BD.HIDDEN_ROWS

// ---------- Data bentuk & rotasi (dihitung sekali) ----------
function rotateMatrixCW(m: number[][]): number[][] {
  const n = m.length
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => m[n - 1 - c]![r]!))
}

function cellsOf(m: number[][]): [number, number][] {
  const cells: [number, number][] = []
  m.forEach((row, y) => row.forEach((v, x) => { if (v) cells.push([x, y]) }))
  return cells
}

const ROTATIONS = Object.fromEntries(
  PIECE_TYPES.map((type) => {
    const states: [number, number][][] = []
    let m = PIECE_SHAPES[type]
    for (let r = 0; r < 4; r++) {
      states.push(cellsOf(m))
      m = rotateMatrixCW(m)
    }
    return [type, states]
  }),
) as Record<PieceType, [number, number][][]>

// Wall kick (sistem rotasi standar). Nilai y di sini sudah dibalik: positif = turun.
type KickTable = Record<string, [number, number][]>
const KICKS_JLSTZ: KickTable = {
  '01': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '10': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '12': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '21': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '23': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '32': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '30': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '03': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
}
const KICKS_I: KickTable = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
}

export function pieceCells(type: PieceType, rotation: Rotation = 0) {
  return ROTATIONS[type][rotation]!
}

const emptyBoard = (): Board => Array.from({ length: TOTAL_ROWS }, () => Array<null>(BD.COLS).fill(null))

function shuffledBag(): PieceType[] {
  const bag = [...PIECE_TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}

/** Waktu (ms) satu baris jatuh pada level tertentu. */
function gravityMs(level: number) {
  return Math.max(16, Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000)
}

export function useBlockDropGame(render: (view: BlockDropView) => void) {
  // ---------- State UI (reaktif) ----------
  const status = ref<BlockDropStatus>('ready')
  const score = ref(0)
  const lines = ref(0)
  const level = ref(1)
  const highScore = ref(0)
  const isNewRecord = ref(false)
  const holdType = ref<PieceType | null>(null)
  const canHold = ref(true)
  const nextTypes = ref<PieceType[]>([])

  // ---------- State per frame (non-reaktif) ----------
  let board = emptyBoard()
  let piece: ActivePiece | null = null
  let queue: PieceType[] = []
  let clearing: { rows: number[], t: number } | null = null
  let gravityAcc = 0
  let lockTimer = 0
  let lockResets = 0
  let lowestY = 0

  // Input yang ditahan
  let leftDown = false
  let rightDown = false
  let heldDir: -1 | 0 | 1 = 0
  let dasTimer = 0
  let arrAcc = 0
  let softDropping = false

  let rafId: number | null = null
  let lastTime = 0

  // ---------- Util ----------
  function collides(type: PieceType, rotation: Rotation, x: number, y: number) {
    for (const [cx, cy] of ROTATIONS[type][rotation]!) {
      const bx = x + cx
      const by = y + cy
      if (bx < 0 || bx >= BD.COLS || by >= TOTAL_ROWS) return true
      if (by >= 0 && board[by]![bx]) return true
    }
    return false
  }

  const isGrounded = () => !!piece && collides(piece.type, piece.rotation, piece.x, piece.y + 1)

  function ghostY() {
    if (!piece) return 0
    let y = piece.y
    while (!collides(piece.type, piece.rotation, piece.x, y + 1)) y++
    return y
  }

  function refillQueue() {
    while (queue.length < BD.PREVIEW_COUNT + 1) queue.push(...shuffledBag())
    nextTypes.value = queue.slice(0, BD.PREVIEW_COUNT)
  }

  /** Setelah geser/putar berhasil saat menempel di dasar, tunda penguncian (terbatas). */
  function resetLockIfGrounded() {
    if (isGrounded() && lockResets < BD.MAX_LOCK_RESETS) {
      lockTimer = 0
      lockResets++
    }
  }

  // ---------- Siklus balok ----------
  function spawn(type?: PieceType) {
    const t = type ?? queue.shift()!
    refillQueue()
    piece = { type: t, rotation: 0, x: t === 'O' ? 4 : 3, y: BD.HIDDEN_ROWS - 1 }
    gravityAcc = 0
    lockTimer = 0
    lockResets = 0
    lowestY = piece.y
    if (collides(piece.type, piece.rotation, piece.x, piece.y)) gameOver()
  }

  function lockPiece() {
    if (!piece) return
    let allHidden = true
    for (const [cx, cy] of pieceCells(piece.type, piece.rotation)) {
      const by = piece.y + cy
      if (by >= 0) board[by]![piece.x + cx] = piece.type
      if (by >= BD.HIDDEN_ROWS) allHidden = false
    }
    piece = null
    canHold.value = true

    // Seluruh balok terkunci di atas layar = kalah
    if (allHidden) return gameOver()

    const full = board.flatMap((row, i) => (row.every(Boolean) ? [i] : []))
    if (full.length) {
      score.value += BD.LINE_SCORES[full.length]! * level.value
      lines.value += full.length
      level.value = 1 + Math.floor(lines.value / BD.LINES_PER_LEVEL)
      clearing = { rows: full, t: 0 }
    } else {
      spawn()
    }
  }

  function finishClear() {
    if (!clearing) return
    const removed = new Set(clearing.rows)
    const kept = board.filter((_, i) => !removed.has(i))
    board = [...emptyBoard().slice(0, removed.size), ...kept]
    clearing = null
    spawn()
  }

  function gameOver() {
    status.value = 'over'
    submitScore(GAME_ID, score.value)
    piece = null
    leftDown = rightDown = softDropping = false
    heldDir = 0
    if (score.value > highScore.value) {
      highScore.value = score.value
      isNewRecord.value = true
      saveHighScore(GAME_ID, score.value)
    }
  }

  // ---------- Gerakan ----------
  function shift(dx: number): boolean {
    if (!piece || collides(piece.type, piece.rotation, piece.x + dx, piece.y)) return false
    piece.x += dx
    resetLockIfGrounded()
    return true
  }

  function rotate(dir: 1 | -1) {
    if (!piece || piece.type === 'O') return
    const from = piece.rotation
    const to = ((from + dir + 4) % 4) as Rotation
    const kicks = (piece.type === 'I' ? KICKS_I : KICKS_JLSTZ)[`${from}${to}`]!
    for (const [kx, ky] of kicks) {
      if (!collides(piece.type, to, piece.x + kx, piece.y + ky)) {
        piece.x += kx
        piece.y += ky
        piece.rotation = to
        resetLockIfGrounded()
        return
      }
    }
  }

  function hardDrop() {
    if (!piece) return
    const target = ghostY()
    score.value += (target - piece.y) * BD.HARD_DROP_POINT
    piece.y = target
    lockPiece()
  }

  function hold() {
    if (!piece || !canHold.value) return
    const current = piece.type
    if (holdType.value) spawn(holdType.value)
    else spawn()
    holdType.value = current
    canHold.value = false
  }

  // ---------- Loop ----------
  function update(dt: number) {
    if (clearing) {
      clearing.t += dt
      if (clearing.t >= BD.CLEAR_ANIM_MS) finishClear()
      return
    }
    if (!piece) return

    // Geser berulang saat kiri/kanan ditahan
    if (heldDir !== 0) {
      dasTimer += dt
      if (dasTimer >= BD.DAS_MS) {
        arrAcc += dt
        while (arrAcc >= BD.ARR_MS) {
          arrAcc -= BD.ARR_MS
          if (!shift(heldDir)) {
            arrAcc = 0
            break
          }
        }
      }
    }

    // Gravitasi
    const normal = gravityMs(level.value)
    const interval = softDropping ? Math.min(BD.SOFT_DROP_MS, normal) : normal
    gravityAcc += dt
    while (gravityAcc >= interval && piece) {
      gravityAcc -= interval
      if (collides(piece.type, piece.rotation, piece.x, piece.y + 1)) {
        gravityAcc = 0
        break
      }
      piece.y++
      if (softDropping) score.value += BD.SOFT_DROP_POINT
      if (piece.y > lowestY) {
        lowestY = piece.y
        lockResets = 0
      }
      lockTimer = 0
    }

    // Penguncian
    if (piece && isGrounded()) {
      lockTimer += dt
      if (lockTimer >= BD.LOCK_DELAY_MS) lockPiece()
    }
  }

  function frame(now: number) {
    const dt = lastTime ? Math.min(now - lastTime, 100) : 0
    lastTime = now
    if (status.value === 'playing') update(dt)

    render({
      board,
      piece,
      ghostY: ghostY(),
      clearingRows: clearing?.rows ?? [],
      clearProgress: clearing ? clearing.t / BD.CLEAR_ANIM_MS : 0,
    })
    rafId = requestAnimationFrame(frame)
  }

  // ---------- Kontrol publik ----------
  function start() {
    board = emptyBoard()
    queue = []
    clearing = null
    score.value = 0
    lines.value = 0
    level.value = 1
    isNewRecord.value = false
    holdType.value = null
    canHold.value = true
    leftDown = rightDown = softDropping = false
    heldDir = 0
    refillQueue()
    status.value = 'playing'
    spawn()
  }

  function togglePause() {
    if (status.value === 'playing') {
      status.value = 'paused'
      releaseAll()
    } else if (status.value === 'paused') {
      status.value = 'playing'
    }
  }

  function press(action: BlockDropAction) {
    if (status.value !== 'playing') return
    switch (action) {
      case 'left':
      case 'right': {
        const dir = action === 'left' ? -1 : 1
        if (dir === -1) leftDown = true
        else rightDown = true
        heldDir = dir
        dasTimer = 0
        arrAcc = 0
        shift(dir)
        break
      }
      case 'softDrop':
        softDropping = true
        gravityAcc = Math.max(gravityAcc, BD.SOFT_DROP_MS) // turun langsung
        break
      case 'rotateCW': rotate(1); break
      case 'rotateCCW': rotate(-1); break
      case 'hardDrop': hardDrop(); break
      case 'hold': hold(); break
    }
  }

  function release(action: BlockDropAction) {
    if (action === 'left' || action === 'right') {
      if (action === 'left') leftDown = false
      else rightDown = false
      // Jika tombol arah lain masih ditahan, lanjutkan ke arah itu
      const next = leftDown ? -1 : rightDown ? 1 : 0
      if (next !== heldDir) {
        heldDir = next
        dasTimer = 0
        arrAcc = 0
      }
    } else if (action === 'softDrop') {
      softDropping = false
    }
  }

  function releaseAll() {
    leftDown = rightDown = softDropping = false
    heldDir = 0
  }

  // ---------- Keyboard ----------
  const KEYS: Record<string, BlockDropAction> = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowDown: 'softDrop',
    KeyS: 'softDrop',
    ArrowUp: 'rotateCW',
    KeyX: 'rotateCW',
    KeyW: 'rotateCW',
    KeyZ: 'rotateCCW',
    ControlLeft: 'rotateCCW',
    Space: 'hardDrop',
    KeyC: 'hold',
    ShiftLeft: 'hold',
    ShiftRight: 'hold',
  }

  function onKeydown(e: KeyboardEvent) {
    const action = KEYS[e.code]
    if (action || e.code === 'Enter') e.preventDefault()
    if (e.repeat) return // pengulangan diatur sendiri (DAS/ARR)

    if (status.value === 'ready' || status.value === 'over') {
      if (e.code === 'Enter' || e.code === 'Space') start()
      return
    }
    if (e.code === 'KeyP' || e.code === 'Escape') return togglePause()
    if (action) press(action)
  }

  function onKeyup(e: KeyboardEvent) {
    const action = KEYS[e.code]
    if (action) release(action)
  }

  function onVisibilityChange() {
    if (document.hidden && status.value === 'playing') togglePause()
  }

  onMounted(() => {
    highScore.value = readHighScore(GAME_ID)
    refillQueue()
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
    window.addEventListener('blur', releaseAll)
    document.addEventListener('visibilitychange', onVisibilityChange)
    rafId = requestAnimationFrame(frame)
  })

  onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
    window.removeEventListener('blur', releaseAll)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    status: readonly(status),
    score: readonly(score),
    lines: readonly(lines),
    level: readonly(level),
    highScore: readonly(highScore),
    isNewRecord: readonly(isNewRecord),
    holdType: readonly(holdType),
    canHold: readonly(canHold),
    nextTypes: readonly(nextTypes),
    start,
    togglePause,
    press,
    release,
  }
}
