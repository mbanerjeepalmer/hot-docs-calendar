<script lang="ts">
	import { buildGoogleCalendarUrl } from '$lib/googleCalendar.js';
	import { formatDayHeading, formatTime } from '$lib/screenings.js';

	let { data } = $props();

	let query = $state('');
	let venueFilter = $state('');

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

	const hasPlaceholders = $derived(
		data.screenings.some((s) => s.title.includes('[PLACEHOLDER]'))
	);
</script>

<svelte:head>
	<title>Hot Docs 2026 — Remote Calendar</title>
	<meta
		name="description"
		content="Browse Hot Docs 2026 screenings and add them to your Google Calendar."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
	<header class="mb-8">
		<h1 class="text-4xl font-bold tracking-tight">Hot Docs 2026 — Remote Calendar</h1>
		<p class="mt-2 text-neutral-600 dark:text-neutral-300">
			Browse every screening. Add any to your Google Calendar in one click.
		</p>
		<p class="mt-1 text-sm text-neutral-500">
			Official festival:
			<a
				class="underline"
				href="https://boxoffice.hotdocs.ca/websales/pages/list.aspx?epguid=f3bf8433-2ddd-4eb0-a2b5-e241bcf1021b"
				target="_blank"
				rel="noopener noreferrer">Box office</a
			>
			·
			<a
				class="underline"
				href="https://s3.amazonaws.com/assets.hotdocs.ca/doc/HD26_Screening-Schedule.pdf"
				target="_blank"
				rel="noopener noreferrer">PDF schedule</a
			>
		</p>
	</header>

	{#if hasPlaceholders}
		<div
			class="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
			role="status"
		>
			<strong>Placeholder data.</strong> The build environment could not reach
			<code>hotdocs.ca</code>, so the shown screenings are placeholders. Replace
			<code>src/lib/data/screenings.json</code> with the real schedule (see <code>README.md</code>).
		</div>
	{/if}

	<form class="mb-8 grid gap-3 sm:grid-cols-[1fr_auto]" role="search">
		<label class="sr-only" for="search">Search screenings</label>
		<input
			id="search"
			type="search"
			placeholder="Search titles or venues…"
			aria-label="Search screenings"
			bind:value={query}
			class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-neutral-500 focus:outline-none"
		/>

		<label class="sr-only" for="venue">Filter by venue</label>
		<select
			id="venue"
			aria-label="Filter by venue"
			bind:value={venueFilter}
			class="rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm"
		>
			<option value="">All venues</option>
			{#each venues as v}
				<option value={v}>{v}</option>
			{/each}
		</select>
	</form>

	<p class="mb-4 text-sm text-neutral-500" data-testid="result-count">
		Showing {totalVisible}
		{totalVisible === 1 ? 'screening' : 'screenings'}
	</p>

	{#each filteredDays as { day, items } (day)}
		<section class="mb-10">
			<h2
				class="sticky top-0 -mx-4 mb-4 border-b border-neutral-200 bg-white/90 px-4 py-2 text-xl font-semibold backdrop-blur"
				data-testid="day-heading"
			>
				{formatDayHeading(day)}
			</h2>

			<ul class="space-y-3">
				{#each items as s (s.id)}
					<li
						class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md"
						data-testid="screening"
					>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<h3
									class="text-lg font-semibold leading-snug"
									data-testid="screening-title"
								>
									{s.title}
								</h3>
								<p class="mt-1 text-sm text-neutral-600">
									<time
										datetime={s.start}
										data-testid="screening-datetime"
									>
										{formatTime(s.start)}{s.end ? ` – ${formatTime(s.end)}` : ''}
									</time>
									· <span data-testid="screening-venue">{s.venue}</span>
								</p>
								{#if s.description}
									<p class="mt-2 text-sm text-neutral-700">{s.description}</p>
								{/if}
							</div>
							<a
								class="inline-flex shrink-0 items-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
								href={buildGoogleCalendarUrl(s)}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`Add ${s.title} to Google Calendar`}
							>
								+ Google Calendar
							</a>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{:else}
		<p class="py-16 text-center text-neutral-500">No screenings match your filters.</p>
	{/each}
</div>
