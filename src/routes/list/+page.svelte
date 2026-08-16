<script lang="ts">
	import { buildGoogleCalendarUrl } from '$lib/googleCalendar.js';
	import { formatDayHeading, formatTime } from '$lib/screenings.js';
	import { ReactionsState, type Reaction } from '$lib/reactions.svelte.js';

	let { data } = $props();

	const reactions = new ReactionsState();
	$effect(() => {
		if (typeof window !== 'undefined') reactions.init();
	});

	let usernameInput = $state('');
	let usernameFormOpen = $state(false);
	async function saveUsername() {
		const name = usernameInput.trim();
		if (!name) return;
		if (await reactions.setUsername(name)) {
			usernameInput = '';
			usernameFormOpen = false;
		}
	}

	function onReactionChange(screeningId: string, value: string) {
		if (value === '') reactions.clear(screeningId);
		else if (value === 'tickets') reactions.set(screeningId, 'tickets', reactions.myReaction(screeningId)?.ticketCount ?? 1);
		else reactions.set(screeningId, value as 'mini_star' | 'mega_star');
	}

	function onTicketCountChange(screeningId: string, value: string) {
		const n = Math.max(1, Math.min(20, Math.round(Number(value)) || 1));
		reactions.set(screeningId, 'tickets', n);
	}

	function reactionBadge(r: Reaction): string {
		if (r.kind === 'mini_star') return '☆';
		if (r.kind === 'mega_star') return '★';
		return `🎟×${r.ticketCount ?? 1}`;
	}

	const reactedDays = $derived(
		data.days
			.map(({ day, items }) => ({
				day,
				items: items.filter((s) => reactions.reactionsFor(s.id).length > 0)
			}))
			.filter(({ items }) => items.length > 0)
	);

	const totalReacted = $derived(reactedDays.reduce((n, d) => n + d.items.length, 0));
</script>

<svelte:head>
	<title>Reactions — Sarajevo Film Festival 2026</title>
	<meta
		name="description"
		content="Everyone's mini stars, mega stars, and ticket requests for Sarajevo Film Festival 2026 screenings."
	/>
</svelte:head>

<div class="min-h-screen bg-white">
	<header class="border-b border-black/10">
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em]"
		>
			<a href="/" class="hover:text-accent-dark">← Sarajevo Film Festival · SFF</a>
			<div class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
				<span class="hidden sm:inline">Aug 14 – 21, 2026</span>
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
							<label class="sr-only" for="username">Username</label>
							<input
								id="username"
								type="text"
								placeholder="pick a username"
								maxlength="32"
								bind:value={usernameInput}
								class="rounded border border-black/15 px-2 py-1 text-xs normal-case tracking-normal focus:border-black focus:ring-1 focus:ring-accent focus:outline-none"
							/>
							<button type="submit" class="rounded bg-black px-2 py-1 text-white">Save</button>
							<button type="button" class="text-neutral-400" onclick={() => (usernameFormOpen = false)}>
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
		</div>
		{#if reactions.error}
			<p class="mx-auto max-w-6xl px-6 pb-2 text-xs normal-case tracking-normal text-red-600">
				{reactions.error}
			</p>
		{/if}
	</header>

	<section class="mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-24">
		<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">Reactions</p>
		<h1 class="mt-5 font-display text-5xl font-bold leading-[0.92] tracking-tight sm:text-7xl">
			Who wants what, together.
		</h1>
		<p class="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
			Every screening anyone has starred or requested tickets for — mini stars, mega stars, and
			ticket counts, all in one place. React from the schedule page or right here.
		</p>
	</section>

	<main class="mx-auto max-w-6xl px-6 pb-24">
		{#if totalReacted === 0}
			<p class="py-24 text-center text-neutral-500" data-testid="no-reactions">
				No reactions yet — head to the schedule and star a screening or request tickets.
			</p>
		{/if}
		{#each reactedDays as { day, items } (day)}
			<section class="border-b border-black py-12 last:border-b-0 sm:py-16">
				<header class="grid items-baseline gap-2 sm:grid-cols-[auto_1fr] sm:gap-12">
					<h2 class="font-display text-3xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
						{formatDayHeading(day)}
					</h2>
					<div class="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500 sm:text-right">
						{items.length} {items.length === 1 ? 'screening' : 'screenings'}
					</div>
				</header>

				<ul class="mt-8 divide-y divide-black/10">
					{#each items as s (s.id)}
						<li
							class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 py-6 sm:grid-cols-[8rem_1fr_auto] sm:gap-x-8"
							data-testid="reacted-screening"
						>
							<time
								datetime={s.start}
								class="whitespace-nowrap font-display text-2xl font-semibold tabular-nums leading-none tracking-tight sm:text-3xl"
							>
								{formatTime(s.start)}
							</time>

							<div class="flex min-w-0 gap-4">
								{#if s.image}
									<img
										src={s.image}
										alt=""
										loading="lazy"
										class="h-20 w-14 shrink-0 rounded object-cover sm:h-28 sm:w-20"
									/>
								{/if}
								<div class="min-w-0">
									<h3
										class="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl"
										data-testid="list-item-title"
									>
										{s.title}
									</h3>
									<p class="mt-1 text-sm text-neutral-600">{s.venue}</p>
									<p class="mt-3 flex flex-wrap gap-1.5" data-testid="reaction-badges">
										{#each reactions.reactionsFor(s.id) as r (r.username + r.kind)}
											<span
												class="rounded-full bg-black/5 px-2 py-0.5 text-xs text-neutral-600"
												data-testid="reaction-badge"
											>
												{r.username} {reactionBadge(r)}
											</span>
										{/each}
									</p>
								</div>
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
									<label class="sr-only" for={`reaction-${s.id}`}>Your reaction to {s.title}</label>
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
										<label class="sr-only" for={`tickets-${s.id}`}>Number of tickets for {s.title}</label>
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
			</section>
		{/each}
	</main>
</div>
