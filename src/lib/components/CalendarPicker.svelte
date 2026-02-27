<script>
  import { createEventDispatcher } from 'svelte'

  export let value = null        // Date | null — dia seleccionado
  export let spotStart = null    // string "YYYY-MM-DD"
  export let spotEnd = null      // string "YYYY-MM-DD"
  export let markedDates = []    // array de strings "YYYY-MM-DD"

  const dispatch = createEventDispatcher()

  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  let viewing = value
    ? new Date(value.getFullYear(), value.getMonth(), 1)
    : spotStart
      ? new Date(spotStart + 'T12:00:00').setDate(1) && new Date(new Date(spotStart + 'T12:00:00').getFullYear(), new Date(spotStart + 'T12:00:00').getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  // normalize to first of month
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

    // Monday = 0, so shift Sunday (0) to 6
    let startDow = firstDay.getDay()
    startDow = startDow === 0 ? 6 : startDow - 1

    const cells = []

    // empty cells before first day
    for (let i = 0; i < startDow; i++) {
      cells.push(null)
    }

    // actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isInRange = (!spotStart || dateStr >= spotStart) && (!spotEnd || dateStr <= spotEnd)
      const isMarked = markedDates.includes(dateStr)
      const isSelected = value && toStr(value) === dateStr
      const isToday = toStr(new Date()) === dateStr

      cells.push({ d, dateStr, isInRange, isMarked, isSelected, isToday })
    }

    return cells
  })()

  function select(cell) {
    if (!cell || !cell.isInRange) return
    value = new Date(cell.dateStr + 'T12:00:00')
    dispatch('select', value)
  }
</script>

<div class="calendar">
  <div class="nav">
    <button class="nav-btn" onclick={prevMonth} type="button">‹</button>
    <p class="nav-label">{MONTHS[viewing.getMonth()]} {viewing.getFullYear()}</p>
    <button class="nav-btn" onclick={nextMonth} type="button">›</button>
  </div>

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
          class:in-range={cell.isInRange}
          class:out-range={!cell.isInRange}
          class:selected={cell.isSelected}
          class:today={cell.isToday && !cell.isSelected}
          class:marked={cell.isMarked && !cell.isSelected}
          onclick={() => select(cell)}
          disabled={!cell.isInRange}
        >
          {cell.d}
          {#if cell.isMarked}
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

  .nav-btn:active {
    color: var(--text);
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

  .cell.empty {
    background: none;
  }

  .cell.day {
    border: none;
    cursor: pointer;
    color: var(--text-3);
    background: none;
    transition: background 0.15s;
  }

  .cell.day.in-range {
    color: var(--text);
    cursor: pointer;
  }

  .cell.day.in-range:active {
    background: var(--surface-2);
  }

  .cell.day.out-range {
    color: var(--text-3);
    opacity: 0.3;
    cursor: not-allowed;
  }

  .cell.day.today {
    border: 1px solid var(--border);
  }

  .cell.day.selected {
    background: var(--text);
    color: var(--bg);
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

  .cell.selected .dot {
    background: var(--bg);
  }
</style>