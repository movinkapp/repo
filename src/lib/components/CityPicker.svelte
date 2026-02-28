<script>
  export let value = ''
  export let country = ''
  export let lat = null
  export let lon = null
  export let placeholder = 'City'
  export let id = 'city-picker'

  let query = value || ''
  let suggestions = []
  let loading = false
  let debounceTimer = null
  let showDropdown = false

  $: if (value && value !== query) {
    query = value
  }

  async function search(q) {
    if (q.length < 2) { suggestions = []; showDropdown = false; return }
    loading = true
    try {
      const res = await fetch(`/api/photon?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      suggestions = data.features.map(f => ({
        city: f.properties.name,
        country: f.properties.country || '',
        country_code: (f.properties.countrycode || '').toUpperCase(),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }))
      showDropdown = suggestions.length > 0
    } catch (e) {
      console.error('[CityPicker] fetch error:', e)
      suggestions = []
    } finally {
      loading = false
    }
  }

  function onInput(e) {
    query = e.target.value
    // clear selected value when user types/clears input
    value = ''
    if (!query || query.trim() === '') {
      country = ''
      lat = null
      lon = null
      suggestions = []
      showDropdown = false
      clearTimeout(debounceTimer)
      return
    }
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(query), 280)
  }

  function select(s) {
    value = s.city
    country = s.country
    lat = s.lat
    lon = s.lon
    query = s.city
    suggestions = []
    showDropdown = false
  }

  function onBlur() {
    setTimeout(() => { showDropdown = false }, 150)
  }
</script>

<div class="city-picker">
  <input
    {id}
    type="text"
    {placeholder}
    value={query}
    oninput={onInput}
    onblur={onBlur}
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
  />
  {#if showDropdown}
    <div class="suggestions">
      {#each suggestions as s}
        <button type="button" class="suggestion" onmousedown={() => select(s)}>
          <span class="s-city">{s.city}</span>
          <span class="s-country">{s.country}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .city-picker {
    position: relative;
    width: 100%;
  }

  input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 15px;
    padding: 12px 14px;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--text-2);
    outline: none;
  }

  input::placeholder { color: var(--text-3); }

  .suggestions {
    position: absolute;
    top: calc(100% + 4px);
    left: 0; right: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    z-index: 50;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }

  .suggestion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    font-family: var(--font-body);
    text-align: left;
    transition: background 0.15s;
    gap: 8px;
  }

  .suggestion:last-child { border-bottom: none; }
  .suggestion:active { background: var(--surface-2); }

  .s-city {
    font-size: 14px;
    color: var(--text);
    font-weight: 500;
  }

  .s-country {
    font-size: 12px;
    color: var(--text-3);
    text-align: right;
    flex-shrink: 0;
  }
</style>