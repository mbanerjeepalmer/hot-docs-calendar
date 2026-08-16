<script lang="ts">
	import { buildGoogleCalendarUrl } from '$lib/googleCalendar.js';
	import { formatDayHeading, formatTime } from '$lib/screenings.js';
	import { lists, removeFrom, move, LIST_NAMES, LIST_LABELS, type ListName } from '$lib/savedList.svelte.js';
	import type { Screening } from '$lib/types.js';

	let { data } = $props();

	const byId = $derived(new Map(data.screenings.map((s) => [s.id, s] as const)));

	function resolve(ids: string[]): Screening[] {
		return ids.map((id) => byId.get(id)).filter((s): s is Screening => Boolean(s));
	}
</script>

<svelte:head>
	<title>My List — Sarajevo Film Festival 2026</title>
	<meta name="description" content="Films you're planning to see at Sarajevo Film Festival 2026, ranked and organized." />
</svelte:head>

<div class="min-h-screen overflow-x-hidden bg-white">
	<header class="border-b border-black/10">
		<div
			class="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em]"
		>
			<a href="/" class="hover:text-accent-dark">← Sarajevo Film Festival · SFF</a>
			<span class="hidden sm:inline">Aug 14 – 21, 2026</span>
		</div>
	</header>

	<section class="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
		<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">My list</p>
		<h1 class="mt-5 font-display text-5xl font-bold leading-[0.92] tracking-tight sm:text-7xl">
			Have tickets, shortlist, longlist.
		</h1>
		<p class="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
			Saved on this device only. Reorder within a list with the arrows, or move a screening
			between lists from the schedule page.
		</p>
	</section>

	<main class="mx-auto max-w-6xl px-6 pb-24">
		<div class="grid gap-10 lg:grid-cols-3">
			{#each LIST_NAMES as name}
				{@const items = resolve(lists[name])}
				<section data-testid={`list-column-${name}`}>
					<header class="flex items-baseline justify-between border-b border-black pb-3">
						<h2 class="font-display text-2xl font-bold uppercase tracking-tight">{LIST_LABELS[name]}</h2>
						<span class="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500"
							>{items.length}</span
						>
					</header>

					{#if items.length === 0}
						<p class="mt-6 text-sm text-neutral-500">Nothing here yet.</p>
					{:else}
						<ul class="mt-4 divide-y divide-black/10">
							{#each items as s, i (s.id)}
								<li class="flex gap-3 py-4" data-testid="list-item">
									{#if s.image}
										<img src={s.image} alt="" loading="lazy" class="h-20 w-14 shrink-0 rounded object-cover" />
									{/if}
									<div class="min-w-0 flex-1">
										<h3 class="font-display text-base font-semibold leading-snug tracking-tight" data-testid="list-item-title">
											{s.title}
										</h3>
										<p class="mt-1 text-xs text-neutral-600">
											{formatDayHeading(s.start.slice(0, 10))} · {formatTime(s.start)} · {s.venue}
										</p>
										<div class="mt-2 flex flex-wrap items-center gap-2">
											<a
												class="inline-flex min-h-8 items-center rounded-md bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white hover:bg-accent"
												href={buildGoogleCalendarUrl(s)}
												target="_blank"
												rel="noopener noreferrer"
												aria-label={`Add ${s.title} to Google Calendar`}
											>
												+ Calendar
											</a>
											<button
												type="button"
												class="inline-flex min-h-8 items-center justify-center rounded-md border border-black/15 px-2 text-xs disabled:opacity-30"
												onclick={() => move(name, i, -1)}
												disabled={i === 0}
												aria-label={`Move ${s.title} up in ${LIST_LABELS[name]}`}
											>
												↑
											</button>
											<button
												type="button"
												class="inline-flex min-h-8 items-center justify-center rounded-md border border-black/15 px-2 text-xs disabled:opacity-30"
												onclick={() => move(name, i, 1)}
												disabled={i === items.length - 1}
												aria-label={`Move ${s.title} down in ${LIST_LABELS[name]}`}
											>
												↓
											</button>
											<button
												type="button"
												class="inline-flex min-h-8 items-center justify-center rounded-md border border-black/15 px-2 text-xs text-neutral-500 hover:border-accent hover:text-accent-dark"
												onclick={() => removeFrom(s.id)}
												aria-label={`Remove ${s.title} from ${LIST_LABELS[name]}`}
											>
												Remove
											</button>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/each}
		</div>
	</main>
</div>
