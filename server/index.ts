export default {
	fetch(request) {
		const url = new URL(request.url);
		console.log('url', url)

		if (url.pathname.startsWith("/api/")) {
			return Response.json({
				name: "Cloudflare workers",
			});
		}
		return new Response(null, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
