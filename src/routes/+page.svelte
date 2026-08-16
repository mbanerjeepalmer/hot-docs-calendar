<script lang="ts">
	import { buildGoogleCalendarUrl } from '$lib/googleCalendar.js';
	import { formatDayHeading, formatTime } from '$lib/screenings.js';

	let { data } = $props();

	let query = $state('');
	let venueFilter = $state('');

	// Hide the sticky filter bar when scrolling down, reveal it when scrolling
	// up, and leave it alone while the page is static (no scroll delta).
	let hideFilterBar = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		let lastY = window.scrollY;
		function onScroll() {
			const y = window.scrollY;
			const delta = y - lastY;
			if (Math.abs(delta) > 0) {
				hideFilterBar = delta > 0 && y > 0;
			}
			lastY = y;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// The cid= and webcal:// links must point at the deployed origin so that
	// Google (or any other calendar app) can fetch the ICS feed. During SSR/
	// prerender the origin is a placeholder; we patch it client-side to the
	// real window.location.origin on hydration.
	let origin = $state('https://hot-docs-calendar.vercel.app');
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

	const filteredDays = $derived(
		data.days
			.map(({ day, items }) => ({
				day,
				items: items.filter((s) => {
					const q = query.trim().toLowerCase();
					const matchesQuery =
						!q ||
						s.title.toLowerCase().includes(q) ||
						s.venue.toLowerCase().includes(q);
					const matchesVenue = !venueFilter || s.venue === venueFilter;
					return matchesQuery && matchesVenue;
				})
			}))
			.filter(({ items }) => items.length > 0)
	);

	const totalVisible = $derived(
		filteredDays.reduce((n, d) => n + d.items.length, 0)
	);

	const venueCount = $derived(new Set(data.screenings.map((s) => s.venue)).size);

	function shortVenue(v: string): string {
		return v.replace('TIFF Lightbox – Cinema ', 'TLB ').replace('Hot Docs Ted Rogers Cinema', 'Hot Docs Cinema');
	}

	function synopsis(description?: string): string {
		if (!description) return '';
		const lines = description.split('\n');
		// PDF format: "D: ...", "country · NN min", synopsis…
		return lines.slice(2).join(' ').replace(/\s+/g, ' ').trim();
	}

	function runtime(description?: string): string {
		if (!description) return '';
		const m = description.match(/(\d+)\s*min/);
		return m ? `${m[1]} min` : '';
	}
</script>

<svelte:head>
	<title>Hot Docs 2026 — Remote Calendar</title>
	<meta
		name="description"
		content="Subscribe to all 211 Hot Docs 2026 screenings or add individual films to your Google Calendar."
	/>
</svelte:head>

<div class="min-h-screen overflow-x-clip bg-white">
	<!-- Top utility bar -->
	<header class="border-b border-black/10">
		<div
			class="mx-auto flex max-w-6xl items-baseline justify-between px-6 py-4 text-[11px] font-medium uppercase tracking-[0.25em]"
		>
			<span>Hot Docs · CIDF</span>
			<span class="hidden sm:inline">Apr 23 – May 3, 2026</span>
		</div>
	</header>

	<!-- Hero -->
	<section class="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
		<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">
			Remote Calendar
		</p>
		<h1
			class="mt-5 font-display text-6xl font-bold leading-[0.92] tracking-tight sm:text-8xl lg:text-9xl"
		>
			Hot Docs
			<span
				class="ml-1 inline-block bg-lime px-3 leading-[0.92] text-black sm:ml-2 sm:px-4"
			>2026</span>
		</h1>
		<p class="mt-8 max-w-xl text-lg leading-relaxed text-neutral-600 sm:text-xl">
			{data.screenings.length} screenings across {venueCount} cinemas over 11 days
			of documentary, plotted out as a remote calendar. Subscribe to the
			whole festival, or save films one tap at a time.
		</p>
	</section>

	<!-- Subscribe band -->
	<section class="border-y border-black bg-black text-white">
		<div class="mx-auto max-w-6xl px-6 py-12 sm:py-16">
			<p class="text-[11px] font-medium uppercase tracking-[0.3em] text-lime">
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
						class="inline-flex min-h-11 items-center rounded-md bg-lime px-5 py-3 text-sm font-semibold tracking-tight text-black hover:bg-white"
						href={googleSubscribeUrl}
						target="_blank"
						rel="noopener noreferrer"
						data-testid="subscribe-google"
					>
						Subscribe in Google Calendar →
					</a>
					<a
						class="inline-flex min-h-11 items-center rounded-md border border-white/30 px-5 py-3 text-sm font-medium hover:border-lime hover:text-lime"
						href={webcalUrl}
						aria-label="Subscribe in Apple Calendar or Outlook"
						data-testid="subscribe-webcal"
					>
						Apple Calendar / Outlook
					</a>
					<a
						class="inline-flex min-h-11 items-center rounded-md border border-white/30 px-5 py-3 text-sm font-medium hover:border-lime hover:text-lime"
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
					class="rounded border border-white/30 px-2 py-1 font-medium text-white hover:border-lime hover:text-lime"
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
							class="underline hover:text-lime"
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

	<!-- Filter bar (sticky; hides on scroll down, reappears on scroll up) -->
	<section
		class="sticky top-0 z-20 border-b border-black/10 bg-white/95 backdrop-blur transition-transform duration-200 ease-out"
		class:-translate-y-full={hideFilterBar}
	>
		<form
			class="mx-auto grid max-w-6xl items-center gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto]"
			role="search"
		>
			<label class="sr-only" for="search">Search screenings</label>
			<input
				id="search"
				type="search"
				placeholder="Search films or venues…"
				aria-label="Search screenings"
				bind:value={query}
				class="w-full rounded-md border border-black/15 bg-white px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-lime focus:outline-none"
			/>

			<label class="sr-only" for="venue">Filter by venue</label>
			<select
				id="venue"
				aria-label="Filter by venue"
				bind:value={venueFilter}
				class="rounded-md border border-black/15 bg-white px-3 py-2.5 text-sm focus:border-black focus:ring-2 focus:ring-lime focus:outline-none"
			>
				<option value="">All venues</option>
				{#each venues as v}
					<option value={v}>{shortVenue(v)}</option>
				{/each}
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
				<header class="grid items-baseline gap-2 sm:grid-cols-[auto_1fr] sm:gap-12">
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
							class="group -mx-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-lg px-4 py-6 transition hover:bg-lime/15 sm:-mx-6 sm:grid-cols-[8rem_1fr_auto] sm:gap-x-8 sm:px-6"
							data-testid="screening"
						>
							<time
								datetime={s.start}
								data-testid="screening-datetime"
								class="whitespace-nowrap font-display text-2xl font-semibold tabular-nums leading-none tracking-tight sm:text-3xl"
							>
								{formatTime(s.start)}
							</time>

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
								</p>
								{#if synopsis(s.description)}
									<p class="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 line-clamp-2 group-hover:line-clamp-none">
										{synopsis(s.description)}
									</p>
								{/if}
							</div>

							<a
								class="col-span-2 inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-black px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white hover:bg-lime hover:text-black sm:col-span-1 sm:self-start"
								href={buildGoogleCalendarUrl(s)}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`Add ${s.title} to Google Calendar`}
							>
								+ Google Calendar
							</a>
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
					class="underline hover:text-lime-dark"
					href="https://s3.amazonaws.com/assets.hotdocs.ca/doc/HD26_Screening-Schedule.pdf"
					target="_blank"
					rel="noopener noreferrer">HD26_Screening-Schedule.pdf</a
				>.
			</span>
			<span>
				Tickets at
				<a
					class="underline hover:text-lime-dark"
					href="https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b"
					target="_blank"
					rel="noopener noreferrer">boxoffice.hotdocs.ca</a
				>.
			</span>
		</footer>
	</main>
</div>
