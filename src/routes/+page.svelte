<script lang="ts">
	import { buildGoogleCalendarUrl } from '$lib/googleCalendar.js';
	import { formatDayHeading, formatTime } from '$lib/screenings.js';
	import { ReactionsState, type Reaction, type ReactionKind } from '$lib/reactions.svelte.js';

	let { data } = $props();

	let query = $state('');
	let venueFilter = $state('');
	let programmeFilter = $state('');
	let reactionFilter = $state<'' | 'mine' | ReactionKind>('');
	let headerHeight = $state(0);
	let filterBarHeight = $state(0);

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

	const myReactionCount = $derived(
		data.screenings.filter((s) => reactions.myReaction(s.id)).length
	);

	function onReactionChange(screeningId: string, value: string) {
		if (value === '') reactions.clear(screeningId);
		else if (value === 'tickets') reactions.set(screeningId, 'tickets', reactions.myReaction(screeningId)?.ticketCount ?? 1);
		else reactions.set(screeningId, value as ReactionKind);
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

	// The cid= and webcal:// links must point at the deployed origin so that
	// Google (or any other calendar app) can fetch the ICS feed. During SSR/
	// prerender the origin is a placeholder; we patch it client-side to the
	// real window.location.origin on hydration.
	let origin = $state('https://sarajevo-film-festival-calendar.vercel.app');
	$effect(() => {
		if (typeof window !== 'undefined') origin = window.location.origin;
	});
	const icsUrl = $derived(`${origin}/calendar.ics`);
	const webcalUrl = $derived(icsUrl.replace(/^https?:/, 'webcal:'));
	// Google's cid= parameter rejects https:// URLs ("Unable to subscribe in
	// Google Calendar, check the URL"); the webcal:// variant is what works.
	const googleSubscribeUrl = $derived(
		`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
	);

	let copied = $state(false);
	async function copyIcsUrl() {
		try {
			await navigator.clipboard.writeText(icsUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			const r = document.createRange();
			const node = document.createTextNode(icsUrl);
			document.body.appendChild(node);
			r.selectNode(node);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(r);
			document.execCommand('copy');
			document.body.removeChild(node);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	const venues = $derived(
		Array.from(new Set(data.screenings.map((s) => s.venue))).sort()
	);

	// A screening's programme field is a comma-joined list of tags (a film can
	// belong to more than one programme), so split it out for filtering.
	function programmeList(s: { programme?: string }): string[] {
		return s.programme ? s.programme.split(', ') : [];
	}

	const programmes = $derived(
		Array.from(new Set(data.screenings.flatMap((s) => programmeList(s)))).sort()
	);

	const filteredDays = $derived(
		data.days
			.map(({ day, items }) => ({
				day,
				items: items.filter((s) => {
					const q = query.trim().toLowerCase();
					const matchesQuery =
						!q ||
						s.title.toLowerCase().includes(q) ||
						s.venue.toLowerCase().includes(q) ||
						(s.programme?.toLowerCase().includes(q) ?? false);
					const matchesVenue = !venueFilter || s.venue === venueFilter;
					const matchesProgramme = !programmeFilter || programmeList(s).includes(programmeFilter);
					const matchesReaction =
						!reactionFilter ||
						(reactionFilter === 'mine'
							? !!reactions.myReaction(s.id)
							: reactions.reactionsFor(s.id).some((r) => r.kind === reactionFilter));
					return matchesQuery && matchesVenue && matchesProgramme && matchesReaction;
				})
			}))
			.filter(({ items }) => items.length > 0)
	);

	const totalVisible = $derived(
		filteredDays.reduce((n, d) => n + d.items.length, 0)
	);

	const venueCount = $derived(new Set(data.screenings.map((s) => s.venue)).size);

	function shortVenue(v: string): string {
		return v.replace('Cineplexx Sarajevo ', 'Cineplexx ').replace('National Theatre - ', 'National Theatre · ');
	}

	function synopsis(description?: string): string {
		if (!description) return '';
		const lines = description.split('\n');
		// api3.sff.ba format: "country · NN min · programme", synopsis…
		return lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
	}

	function runtime(description?: string): string {
		if (!description) return '';
		const m = description.match(/(\d+)\s*min/);
		return m ? `${m[1]} min` : '';
	}
</script>

<svelte:head>
	<title>Sarajevo Film Festival 2026 — Remote Calendar</title>
	<meta
		name="description"
		content={`Subscribe to all ${data.screenings.length} Sarajevo Film Festival 2026 screenings or add individual films to your Google Calendar.`}
	/>
</svelte:head>

<div class="min-h-screen bg-white">
	<!-- Top utility bar -->
	<header class="sticky top-0 z-30 border-b border-black/10 bg-white" bind:clientHeight={headerHeight}>
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em]"
		>
			<span>Sarajevo Film Festival · SFF</span>
			<div class="flex flex-wrap items-baseline gap-x-6 gap-y-2">
				<a href="/list" class="hover:text-accent-dark" data-testid="my-list-link">
					Reactions{#if myReactionCount}&nbsp;({myReactionCount}){/if}
				</a>
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

	<!-- Hero -->
	<section class="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
		<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">
			Remote Calendar
		</p>
		<h1
			class="mt-5 font-display text-6xl font-bold leading-[0.92] tracking-tight sm:text-8xl lg:text-9xl"
		>
			Sarajevo FF
			<span
				class="ml-1 inline-block bg-accent px-3 leading-[0.92] text-white sm:ml-2 sm:px-4"
			>2026</span>
		</h1>
		<p class="mt-8 max-w-xl text-lg leading-relaxed text-neutral-600 sm:text-xl">
			{data.screenings.length} screenings across {venueCount} venues over {data.days.length} days
			of film, plotted out as a remote calendar. Subscribe to the whole
			festival, or save films one tap at a time.
		</p>
	</section>

	<!-- Subscribe band -->
	<section class="border-y border-black bg-black text-white">
		<div class="mx-auto max-w-6xl px-6 py-12 sm:py-16">
			<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
				Subscribe
			</p>
			<h2
				class="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl"
			>
				All {data.screenings.length} screenings, <span class="text-neutral-500"
					>in your calendar app.</span
				>
			</h2>
			<div class="mt-8 flex flex-wrap gap-2">
					<a
						class="inline-flex min-h-11 items-center rounded-md bg-accent px-5 py-3 text-sm font-semibold tracking-tight text-white hover:bg-white hover:text-black"
						href={googleSubscribeUrl}
						target="_blank"
						rel="noopener noreferrer"
						data-testid="subscribe-google"
					>
						Subscribe in Google Calendar →
					</a>
					<a
						class="inline-flex min-h-11 items-center rounded-md border border-white/30 px-5 py-3 text-sm font-medium hover:border-accent hover:text-accent"
						href={webcalUrl}
						aria-label="Subscribe in Apple Calendar or Outlook"
						data-testid="subscribe-webcal"
					>
						Apple Calendar / Outlook
					</a>
					<a
						class="inline-flex min-h-11 items-center rounded-md border border-white/30 px-5 py-3 text-sm font-medium hover:border-accent hover:text-accent"
						href={icsUrl}
						aria-label="Download .ics calendar file"
						data-testid="subscribe-ics"
					>
						Download .ics
					</a>
				</div>
			<div class="mt-8 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
				<span class="uppercase tracking-[0.2em]">URL</span>
				<code class="break-all rounded bg-white/5 px-2 py-1 font-mono text-neutral-200 ring-1 ring-white/10">{icsUrl}</code>
				<button
					type="button"
					onclick={copyIcsUrl}
					class="rounded border border-white/30 px-2 py-1 font-medium text-white hover:border-accent hover:text-accent"
				>
					{copied ? 'Copied!' : 'Copy URL'}
				</button>
			</div>
			<details class="mt-4 text-xs text-neutral-400">
				<summary class="cursor-pointer hover:text-white">If "Subscribe in Google Calendar" doesn't work…</summary>
				<ol class="ml-4 mt-2 list-decimal space-y-1">
					<li>Copy the subscription URL above.</li>
					<li>
						Open <a
							class="underline hover:text-accent"
							href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
							target="_blank"
							rel="noopener noreferrer">Google Calendar's "Add by URL" page</a
						>.
					</li>
					<li>Paste the URL and click <em>Add calendar</em>.</li>
				</ol>
			</details>
		</div>
	</section>

	<!-- Filter bar (sticky, stacked below the nav header) -->
	<section
		class="sticky z-20 border-b border-black/10 bg-white/95 backdrop-blur"
		style={`top: ${headerHeight}px`}
		bind:clientHeight={filterBarHeight}
	>
		<form
			class="mx-auto grid max-w-6xl items-center gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto_auto_auto]"
			role="search"
		>
			<label class="sr-only" for="search">Search screenings</label>
			<input
				id="search"
				type="search"
				placeholder="Search films or venues…"
				aria-label="Search screenings"
				bind:value={query}
				class="w-full min-w-0 rounded-md border border-black/15 bg-white px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-accent focus:outline-none"
			/>

			<label class="sr-only" for="venue">Filter by venue</label>
			<select
				id="venue"
				aria-label="Filter by venue"
				bind:value={venueFilter}
				class="w-full min-w-0 rounded-md border border-black/15 bg-white px-3 py-2.5 text-sm focus:border-black focus:ring-2 focus:ring-accent focus:outline-none"
			>
				<option value="">All venues</option>
				{#each venues as v}
					<option value={v}>{shortVenue(v)}</option>
				{/each}
			</select>

			<label class="sr-only" for="programme">Filter by programme</label>
			<select
				id="programme"
				aria-label="Filter by programme"
				bind:value={programmeFilter}
				data-testid="programme-filter"
				class="w-full min-w-0 rounded-md border border-black/15 bg-white px-3 py-2.5 text-sm focus:border-black focus:ring-2 focus:ring-accent focus:outline-none"
			>
				<option value="">All programmes</option>
				{#each programmes as p}
					<option value={p}>{p}</option>
				{/each}
			</select>

			<label class="sr-only" for="reaction-filter">Filter by reaction</label>
			<select
				id="reaction-filter"
				aria-label="Filter by reaction"
				bind:value={reactionFilter}
				data-testid="reaction-filter"
				class="w-full min-w-0 rounded-md border border-black/15 bg-white px-3 py-2.5 text-sm focus:border-black focus:ring-2 focus:ring-accent focus:outline-none"
			>
				<option value="">All screenings</option>
				<option value="mine">My reactions</option>
				<option value="mini_star">☆ Mini star</option>
				<option value="mega_star">★ Mega star</option>
				<option value="tickets">🎟 Tickets wanted</option>
			</select>

			<p
				class="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500"
				data-testid="result-count"
			>
				{totalVisible} {totalVisible === 1 ? 'screening' : 'screenings'}
			</p>
		</form>
	</section>

	<!-- Schedule -->
	<main class="mx-auto max-w-6xl px-6">
		{#each filteredDays as { day, items } (day)}
			<section class="border-b border-black py-12 last:border-b-0 sm:py-16">
				<header
					class="sticky z-10 -mx-6 grid items-baseline gap-2 border-b border-black/10 bg-white px-6 py-3 sm:grid-cols-[auto_1fr] sm:gap-12"
					style={`top: ${headerHeight + filterBarHeight}px`}
				>
					<h2
						class="font-display text-3xl font-bold uppercase leading-none tracking-tight sm:text-5xl"
						data-testid="day-heading"
					>
						{formatDayHeading(day)}
					</h2>
					<div class="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500 sm:text-right">
						{items.length} {items.length === 1 ? 'screening' : 'screenings'}
					</div>
				</header>

				<ul class="mt-8 divide-y divide-black/10">
					{#each items as s (s.id)}
						<li
							class="group -mx-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-lg px-4 py-6 transition hover:bg-accent/15 sm:-mx-6 sm:grid-cols-[8rem_1fr_auto] sm:gap-x-8 sm:px-6"
							data-testid="screening"
						>
							<time
								datetime={s.start}
								data-testid="screening-datetime"
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
										data-testid="screening-image"
										class="h-20 w-14 shrink-0 rounded object-cover sm:h-28 sm:w-20"
									/>
								{/if}
								<div class="min-w-0">
									<h3
										class="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl"
										data-testid="screening-title"
									>
										{s.title}
									</h3>
									<p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600">
										<span data-testid="screening-venue">{shortVenue(s.venue)}</span>
										{#if runtime(s.description)}
											<span aria-hidden="true" class="text-neutral-300">·</span>
											<span class="tabular-nums">{runtime(s.description)}</span>
										{/if}
										{#if s.end}
											<span aria-hidden="true" class="text-neutral-300">·</span>
											<span>ends {formatTime(s.end)}</span>
										{/if}
										{#if s.programme}
											<span aria-hidden="true" class="text-neutral-300">·</span>
											<span
												data-testid="screening-programme"
												class="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500"
											>
												{s.programme}
											</span>
										{/if}
									</p>
									{#if synopsis(s.description)}
										<p class="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 line-clamp-2 group-hover:line-clamp-none">
											{synopsis(s.description)}
										</p>
									{/if}
									{#if reactions.reactionsFor(s.id).length}
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
									{/if}
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
		{:else}
			<p class="py-24 text-center text-neutral-500">No screenings match your filters.</p>
		{/each}

		<footer class="flex flex-wrap gap-x-6 gap-y-2 border-t border-black/10 py-12 text-xs text-neutral-500">
			<span>
				Schedule data from
				<a
					class="underline hover:text-accent-dark"
					href="https://www.sff.ba/en"
					target="_blank"
					rel="noopener noreferrer">sff.ba</a
				>.
			</span>
			<span>
				Tickets at
				<a
					class="underline hover:text-accent-dark"
					href="https://tickets.sff.ba"
					target="_blank"
					rel="noopener noreferrer">tickets.sff.ba</a
				>.
			</span>
		</footer>
	</main>
</div>
