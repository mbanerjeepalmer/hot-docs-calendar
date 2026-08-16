<script lang="ts">
	import { buildGoogleCalendarUrl } from '$lib/googleCalendar.js';
	import { formatDayHeading, formatTime, synopsis, runtime } from '$lib/screenings.js';
	import { ReactionsState, type Reaction, type ReactionKind } from '$lib/reactions.svelte.js';

	let { data } = $props();
	const film = $derived(data.film);
	const screenings = $derived(data.screenings);

	const reactions = new ReactionsState();
	$effect(() => {
		if (typeof window !== 'undefined') reactions.init();
	});

	let usernameInput = $state('');
	let usernameFormOpen = $state(false);
	let usernameInputEl: HTMLInputElement | undefined = $state();
	$effect(() => {
		if (usernameFormOpen) usernameInputEl?.focus();
	});

	let pendingReaction: { screeningId: string; kind: ReactionKind; ticketCount?: number } | null = $state(null);

	async function saveUsername() {
		const name = usernameInput.trim();
		if (!name) return;
		if (await reactions.setUsername(name)) {
			usernameInput = '';
			usernameFormOpen = false;
			if (pendingReaction) {
				const { screeningId, kind, ticketCount } = pendingReaction;
				pendingReaction = null;
				reactions.set(screeningId, kind, ticketCount);
			}
		}
	}

	function applyReaction(screeningId: string, kind: ReactionKind, ticketCount?: number) {
		if (!reactions.username) {
			pendingReaction = { screeningId, kind, ticketCount };
			usernameInput = '';
			usernameFormOpen = true;
			return;
		}
		reactions.set(screeningId, kind, ticketCount);
	}

	function onReactionChange(screeningId: string, value: string) {
		if (value === '') {
			if (reactions.username) reactions.clear(screeningId);
			return;
		}
		if (value === 'tickets') applyReaction(screeningId, 'tickets', reactions.myReaction(screeningId)?.ticketCount ?? 1);
		else applyReaction(screeningId, value as ReactionKind);
	}

	function onTicketCountChange(screeningId: string, value: string) {
		const n = Math.max(1, Math.min(20, Math.round(Number(value)) || 1));
		applyReaction(screeningId, 'tickets', n);
	}

	function reactionBadge(r: Reaction): string {
		if (r.kind === 'mini_star') return '☆';
		if (r.kind === 'mega_star') return '★';
		return `🎟×${r.ticketCount ?? 1}`;
	}
</script>

<svelte:head>
	<title>{film.title} — Sarajevo Film Festival 2026</title>
	{#if synopsis(film.description)}
		<meta name="description" content={synopsis(film.description)} />
	{/if}
</svelte:head>

<div class="min-h-screen bg-white">
	<header class="sticky top-0 z-30 border-b border-black/10 bg-white">
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em]"
		>
			<a href="/" class="hover:text-accent-dark">← Sarajevo Film Festival · SFF</a>
			<div class="flex items-baseline gap-2 normal-case tracking-normal text-neutral-600">
				{#if reactions.username}
					<span>Hi, {reactions.username}</span>
					<button
						type="button"
						class="underline hover:text-accent-dark"
						onclick={() => {
							usernameInput = reactions.username ?? '';
							usernameFormOpen = true;
						}}
					>
						change
					</button>
				{:else if usernameFormOpen}
					<form
						class="flex items-center gap-2"
						onsubmit={(e) => {
							e.preventDefault();
							saveUsername();
						}}
					>
						{#if pendingReaction}
							<span class="text-accent-dark">Pick a username to save that:</span>
						{/if}
						<label class="sr-only" for="username">Username</label>
						<input
							id="username"
							type="text"
							placeholder="pick a username"
							maxlength="32"
							bind:value={usernameInput}
							bind:this={usernameInputEl}
							class="rounded border border-black/15 px-2 py-1 text-xs normal-case tracking-normal focus:border-black focus:ring-1 focus:ring-accent focus:outline-none"
						/>
						<button type="submit" class="rounded bg-black px-2 py-1 text-white">Save</button>
						<button
							type="button"
							class="text-neutral-400"
							onclick={() => {
								usernameFormOpen = false;
								pendingReaction = null;
							}}
						>
							cancel
						</button>
					</form>
				{:else}
					<button
						type="button"
						class="underline hover:text-accent-dark"
						onclick={() => (usernameFormOpen = true)}
					>
						Set a username to react
					</button>
				{/if}
			</div>
		</div>
		{#if reactions.error}
			<p class="mx-auto max-w-6xl px-6 pb-2 text-xs normal-case tracking-normal text-red-600">
				{reactions.error}
			</p>
		{/if}
	</header>

	<section class="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
		<div class="flex flex-col gap-8 sm:flex-row">
			{#if film.image}
				<img
					src={film.image}
					alt=""
					data-testid="film-poster"
					class="h-72 w-48 shrink-0 self-start rounded-lg object-cover shadow-sm"
				/>
			{/if}
			<div class="min-w-0">
				<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">Film</p>
				<h1
					class="mt-3 font-display text-4xl font-bold leading-[0.98] tracking-tight sm:text-6xl"
					data-testid="film-title"
				>
					{film.title}
				</h1>
				<p class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600" data-testid="film-meta">
					{#if film.year}
						<span data-testid="film-year">{film.year}</span>
					{/if}
					{#if film.country}
						<span aria-hidden="true" class="text-neutral-300">·</span>
						<span>{film.country}</span>
					{/if}
					{#if runtime(film.description)}
						<span aria-hidden="true" class="text-neutral-300">·</span>
						<span class="tabular-nums">{runtime(film.description)}</span>
					{/if}
					{#if film.programme}
						<span aria-hidden="true" class="text-neutral-300">·</span>
						<span
							class="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500"
						>
							{film.programme}
						</span>
					{/if}
				</p>
				{#if synopsis(film.description)}
					<p class="mt-6 max-w-2xl text-base leading-relaxed text-neutral-600" data-testid="film-synopsis">
						{synopsis(film.description)}
					</p>
				{/if}
			</div>
		</div>
	</section>

	<main class="mx-auto max-w-6xl px-6 pb-24">
		<h2 class="border-b border-black pb-3 font-display text-2xl font-bold uppercase tracking-tight">
			Screenings
		</h2>
		<ul class="mt-4 divide-y divide-black/10">
			{#each screenings as s (s.id)}
				<li class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 py-6 sm:grid-cols-[10rem_1fr_auto] sm:gap-x-8" data-testid="film-screening">
					<div>
						<time
							datetime={s.start}
							class="block whitespace-nowrap font-display text-2xl font-semibold tabular-nums leading-none tracking-tight sm:text-3xl"
						>
							{formatTime(s.start)}
						</time>
						<p class="mt-1 text-xs uppercase tracking-wide text-neutral-500">
							{formatDayHeading(s.start.slice(0, 10))}
						</p>
					</div>

					<div class="min-w-0">
						<p class="text-sm text-neutral-600">{s.venue}</p>
						{#if reactions.reactionsFor(s.id).length}
							<p class="mt-2 flex flex-wrap gap-1.5" data-testid="reaction-badges">
								{#each reactions.reactionsFor(s.id) as r (r.username + r.kind)}
									<span
										class="rounded-full bg-black/5 px-2 py-0.5 text-xs text-neutral-600"
										data-testid="reaction-badge"
									>
										{r.username} {reactionBadge(r)}
									</span>
								{/each}
							</p>
						{/if}
					</div>

					<div class="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-col sm:items-stretch sm:self-start">
						<a
							class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-black px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white hover:bg-accent hover:text-white"
							href={buildGoogleCalendarUrl(s)}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`Add ${s.title} to Google Calendar`}
						>
							+ Google Calendar
						</a>
						<div class="flex items-center gap-1.5">
							<label class="sr-only" for={`reaction-${s.id}`}>Your reaction to this screening</label>
							<select
								id={`reaction-${s.id}`}
								data-testid="reaction-select"
								class="min-h-11 flex-1 rounded-md border border-black/15 bg-white px-2 text-[11px] font-medium uppercase tracking-[0.1em] focus:border-black focus:ring-2 focus:ring-accent focus:outline-none"
								value={reactions.myReaction(s.id)?.kind ?? ''}
								onchange={(e) => onReactionChange(s.id, e.currentTarget.value)}
							>
								<option value="">No reaction</option>
								<option value="mini_star">☆ Mini star</option>
								<option value="mega_star">★ Mega star</option>
								<option value="tickets">🎟 Want tickets</option>
							</select>
							{#if reactions.myReaction(s.id)?.kind === 'tickets'}
								<label class="sr-only" for={`tickets-${s.id}`}>Number of tickets</label>
								<input
									id={`tickets-${s.id}`}
									type="number"
									min="1"
									max="20"
									data-testid="ticket-count-input"
									value={reactions.myReaction(s.id)?.ticketCount ?? 1}
									onchange={(e) => onTicketCountChange(s.id, e.currentTarget.value)}
									class="min-h-11 w-16 rounded-md border border-black/15 bg-white px-2 text-sm focus:border-black focus:ring-2 focus:ring-accent focus:outline-none"
								/>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</main>
</div>
