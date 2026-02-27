<script>
  import { toasts } from '$lib/toast.js'
  import { fly } from 'svelte/transition'
</script>

<div class="toast-container">
  {#each $toasts as t (t.id)}
    <div
      class="toast toast-{t.type}"
      in:fly={{ y: 16, duration: 200 }}
      out:fly={{ y: 16, duration: 150 }}
    >
      {#if t.type === 'confirm'}
        <p class="toast-message">{t.message}</p>
          <div class="toast-actions">
          <button class="toast-btn toast-btn-cancel" on:click={t.onCancel}>Cancel</button>
          <button class="toast-btn toast-btn-confirm" on:click={t.onConfirm}>Delete</button>
        </div>
      {:else}
        {t.message}
      {/if}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 96px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 48px);
    max-width: 382px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 200;
    pointer-events: none;
  }

  .toast {
    padding: 14px 18px;
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    border: 1px solid var(--border);
    pointer-events: none;
  }

  .toast-confirm {
    pointer-events: all;
  }

  .toast-success {
    background: var(--surface);
    color: var(--text);
  }

  .toast-error {
    background: var(--surface);
    color: var(--error);
    border-color: var(--error);
  }

  .toast-confirm {
    background: var(--surface);
    color: var(--text);
    border-color: var(--border);
    text-align: left;
  }

  .toast-message {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 12px;
  }

  .toast-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .toast-btn {
    border: none;
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    padding: 9px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .toast-btn:active { opacity: 0.7; }

  .toast-btn-cancel {
    background: var(--surface-2);
    color: var(--text-2);
  }

  .toast-btn-confirm {
    background: var(--error);
    color: #fff;
  }
</style>