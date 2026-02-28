<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { ChevronLeft, Users } from 'lucide-svelte'
  import { getStatus } from '$lib/utils.js'

  let loading = true
  let currentUser = null
  let userProfile = null
  let artists = []
  let myCity = null

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user

    const { data: profile } = await supabase
      .from('users')
      .select('base_currency, instagram, community_visible')
      .eq('id', user.id)
      .single()

    userProfile = profile

    if (!profile?.community_visible) {
      loading = false
      return
    }

    // Find user's current active spot city
    const { data: mySpots } = await supabase
      .from('spots')
      .select('city, city_normalized, start_date, end_date')
      .eq('user_id', user.id)

    const activeSpot = mySpots?.find(s => getStatus(s) === 'active')
    const upcomingSpot = mySpots?.find(s => getStatus(s) === 'upcoming')
    const referenceSpot = activeSpot || upcomingSpot
    myCity = referenceSpot?.city_normalized || referenceSpot?.city || null

    if (!myCity) {
      loading = false
      return
    }

    const today = new Date().toISOString().split('T')[0]

    // Find other artists visible in the same city
    const { data: spots } = await supabase
      .from('spots')
      .select(`
        id, city, city_normalized, studio_name, start_date, end_date,
        user_id,
        users!inner ( id, instagram, community_visible )
      `)
      .or(`city_normalized.ilike.${myCity},city.ilike.${myCity}`)
      .lte('start_date', today)
      .gte('end_date', today)
      .neq('user_id', user.id)
      .eq('users.community_visible', true)

    artists = (spots || []).map(s => ({
      instagram: s.users?.instagram || null,
      studio: s.studio_name,
      city: s.city,
      start_date: s.start_date,
      end_date: s.end_date,
    }))

    loading = false
  })

  function formatShort(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
</script>

<div class="page">
  <div class="top-header">
    <a href="/profile" class="back">
      <ChevronLeft size={20} strokeWidth={1.5} />
    </a>
    <h1>Artists nearby</h1>
  </div>

  {#if loading}
    <div class="loading" transition:fade>···</div>

  {:else if !userProfile?.community_visible}
    <div class="empty-state" transition:fade>
      <div class="empty-icon"><Users size={28} strokeWidth={1} /></div>
      <p class="empty-title">Join the community</p>
      <p class="empty-sub">
        Enable artist visibility in your profile to see other Movink artists doing guest spots in the same city as you — and let them find you too.
      </p>
      <a href="/profile" class="btn-primary">Go to profile</a>
    </div>

  {:else if !myCity}
    <div class="empty-state" transition:fade>
      <div class="empty-icon"><Users size={28} strokeWidth={1} /></div>
      <p class="empty-title">No active spot</p>
      <p class="empty-sub">
        Add an upcoming or active guest spot to see which artists are in the same city as you.
      </p>
      <a href="/spots/new" class="btn-primary">Add a spot</a>
    </div>

  {:else if artists.length === 0}
    <div class="empty-state" transition:fade>
      <div class="empty-icon"><Users size={28} strokeWidth={1} /></div>
      <p class="empty-title">Just you in {myCity}</p>
      <p class="empty-sub">
        No other Movink artists are doing a guest spot in {myCity} right now. Check back closer to your dates.
      </p>
    </div>

  {:else}
    <p class="city-label">Artists in {myCity} right now</p>
    <div class="list" transition:fade>
      {#each artists as artist}
        <div class="artist-card">
          <div class="artist-avatar">
            {(artist.instagram || '?')[0].toUpperCase()}
          </div>
          <div class="artist-info">
            <p class="artist-handle">
              {#if artist.instagram}
                <a href={"https://instagram.com/" + artist.instagram}
                   target="_blank"
                   rel="noopener noreferrer"
                   class="ig-link">
                  @{artist.instagram}
                </a>
              {:else}
                <span class="artist-anon">Anonymous artist</span>
              {/if}
            </p>
            <p class="artist-studio">{artist.studio}</p>
            <p class="artist-dates">{formatShort(artist.start_date)} → {formatShort(artist.end_date)}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 56px 24px 100px; }

  .top-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }

  .back {
    color: var(--text-2);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    flex: 1;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    font-size: 24px;
    color: var(--text-3);
    letter-spacing: 4px;
  }

  .city-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 12px;
  }

  .list { display: flex; flex-direction: column; gap: 10px; }

  .artist-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .artist-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    flex-shrink: 0;
  }

  .artist-info { display: flex; flex-direction: column; gap: 3px; }

  .artist-handle { font-size: 15px; font-weight: 600; }

  .ig-link {
    color: var(--text);
    text-decoration: none;
    transition: color 0.2s;
  }
  .ig-link:active { color: var(--text-2); }

  .artist-anon { color: var(--text-3); font-weight: 400; }

  .artist-studio { font-size: 13px; color: var(--text-2); }
  .artist-dates { font-size: 12px; color: var(--text-3); }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 60px 20px;
    gap: 12px;
  }

  .empty-icon { color: var(--text-3); margin-bottom: 4px; }

  .empty-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .empty-sub {
    font-size: 14px;
    color: var(--text-2);
    line-height: 1.7;
    max-width: 280px;
  }

  .btn-primary {
    display: inline-block;
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    padding: 13px 28px;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.2s;
    text-decoration: none;
  }

  .btn-primary:active { opacity: 0.8; }
</style>