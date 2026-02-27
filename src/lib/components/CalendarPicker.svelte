<script>
  import { createEventDispatcher } from 'svelte'

  // Single date mode (default)
  export let value = null
  export let spotStart = null
  export let spotEnd = null
  export let markedDates = []

  // Range mode
  export let rangeMode = false
  export let rangeStart = null
  export let rangeEnd = null

  const dispatch = createEventDispatcher()

  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  let viewing = (() => {
    const base = rangeMode ? rangeStart : value
    if (base) return new Date(base.getFullYear(), base.getMonth(), 1)
    if (spotStart) {
      const d = new Date(spotStart + 'T12:00:00')
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })()

  $: viewing = new Date(viewing.getFullYear(), viewing.getMonth(), 1)

  function toStr(d) {
    if (!d) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function prevMonth() {
    viewing = new Date(viewing.getFullYear(), viewing.getMonth() - 1, 1)
  }

  function nextMonth() {
    viewing = new Date(viewing.getFullYear(), viewing.getMonth() + 1, 1)
  }

  $: days = (() => {
    const year = viewing.getFullYear()
    const month = viewing.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let startDow = firstDay.getDay()
    startDow = startDow === 0 ? 6 : startDow - 1

    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isInRange = (!spotStart || dateStr >= spotStart) && (!spotEnd || dateStr <= spotEnd)
      const isMarked = markedDates.includes(dateStr)
      const isSelected = !rangeMode && value && toStr(value) === dateStr
      const isToday = toStr(new Date()) === dateStr

      // range mode
      const rsStr = rangeStart ? toStr(rangeStart) : null
      const reStr = rangeEnd ? toStr(rangeEnd) : null
      const isRangeStart = rangeMode && rsStr === dateStr
      const isRangeEnd = rangeMode && reStr === dateStr
      const isInSelectedRange = rangeMode && rsStr && reStr && dateStr > rsStr && dateStr < reStr

      cells.push({ d, dateStr, isInRange, isMarked, isSelected, isToday, isRangeStart, isRangeEnd, isInSelectedRange })
    }

    return cells
  })()

  function select(cell) {
    if (!cell) return
    if (rangeMode) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // start fresh
        rangeStart = new Date(cell.dateStr + 'T12:00:00')
        rangeEnd = null
        dispatch('rangeChange', { start: rangeStart, end: null })
      } else {
        // have start, picking end
        const picked = new Date(cell.dateStr + 'T12:00:00')
        if (picked < rangeStart) {
          rangeEnd = rangeStart
          rangeStart = picked
        } else {
          rangeEnd = picked
        }
        dispatch('rangeChange', { start: rangeStart, end: rangeEnd })
      }
    } else {
      if (!cell.isInRange) return
      value = new Date(cell.dateStr + 'T12:00:00')
      dispatch('select', value)
    }
  }
</script>

<div class="calendar">
  <div class="nav">
    <button class="nav-btn" onclick={prevMonth} type="button">‹</button>
    <p class="nav-label">{MONTHS[viewing.getMonth()]} {viewing.getFullYear()}</p>
    <button class="nav-btn" onclick={nextMonth} type="button">›</button>
  </div>

  {#if rangeMode && (rangeStart || rangeEnd)}
    <p class="range-preview">
      {rangeStart ? toStr(rangeStart) : '···'}
      {#if rangeEnd} → {toStr(rangeEnd)}{:else} → pick end date{/if}
    </p>
  {/if}

  <div class="grid">
    {#each DAYS as day}
      <p class="dow">{day}</p>
    {/each}

    {#each days as cell}
      {#if cell === null}
        <div class="cell empty"></div>
      {:else}
        <button
          type="button"
          class="cell day"
          class:in-range={!rangeMode && cell.isInRange}
          class:out-range={!rangeMode && !cell.isInRange}
          class:selected={cell.isSelected || cell.isRangeStart || cell.isRangeEnd}
          class:range-fill={cell.isInSelectedRange}
          class:today={cell.isToday && !cell.isSelected && !cell.isRangeStart && !cell.isRangeEnd}
          class:marked={cell.isMarked && !cell.isSelected}
          onclick={() => select(cell)}
        >
          {cell.d}
          {#if cell.isMarked && !cell.isSelected}
            <span class="dot"></span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .calendar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    user-select: none;
  }

  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .nav-label {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: var(--text);
  }

  .nav-btn {
    background: none;
    border: none;
    color: var(--text-2);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    line-height: 1;
    transition: color 0.2s;
  }

  .nav-btn:active { color: var(--text); }

  .range-preview {
    font-size: 12px;
    color: var(--text-3);
    text-align: center;
    margin-bottom: 12px;
    font-weight: 500;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .dow {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-3);
    text-align: center;
    padding: 4px 0;
  }

  .cell {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 13px;
    position: relative;
    gap: 2px;
  }

  .cell.empty { background: none; }

  .cell.day {
    border: none;
    cursor: pointer;
    color: var(--text-3);
    background: none;
    transition: background 0.15s;
  }

  .cell.day.in-range { color: var(--text); }

  .cell.day.out-range {
    color: var(--text-3);
    opacity: 0.3;
    cursor: not-allowed;
  }

  .cell.day.today { border: 1px solid var(--border); }

  .cell.day.selected {
    background: var(--text);
    color: var(--bg);
  }

  .cell.day.range-fill {
    background: var(--surface-2);
    color: var(--text);
    border-radius: 0;
  }

  .cell.day.marked {
    color: var(--upcoming);
    font-weight: 600;
  }

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--upcoming);
    position: absolute;
    bottom: 3px;
  }

  .cell.selected .dot { background: var(--bg); }
</style>
