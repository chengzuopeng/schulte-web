// 定义请求体的类型
interface ResultRequestBody {
	duration: number;
	size: number;
	selectedType: number;
	userId?: string;
	deviceId?: string;
}

// 扩展 Env 接口以包含 D1 数据库
interface Env {
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api/")) {
			// 处理 /api/result 接口
			if (url.pathname === "/api/result" && request.method === "POST") {
				try {
					const body = await request.json() as ResultRequestBody;
					
					// 验证必需字段
					if (typeof body.duration !== 'number' || typeof body.size !== 'number' || typeof body.selectedType !== 'number') {
						return Response.json({
							success: false,
							error: '缺少必需字段或字段类型错误'
						}, { status: 400 });
					}

					// 插入数据到 D1 数据库
					const stmt = env.DB.prepare(`
						INSERT INTO schulte_time (user_id, device_id, size, duration, selected_type)
						VALUES (?, ?, ?, ?, ?)
					`);
					
					const result = await stmt.bind(
						body.userId || null,
						body.deviceId || null,
						body.size,
						body.duration,
						body.selectedType
					).run();

					return Response.json({
						success: true,
						message: '数据保存成功',
						data: {
							id: result.meta.last_row_id
						}
					});

				} catch (error) {
					console.error('保存数据时出错:', error);
					return Response.json({
						success: false,
						error: '服务器内部错误'
					}, { status: 500 });
				}
			}

			// 原有的 API 接口
			return Response.json({
				name: "Cloudflare workers",
			});
		}
		return new Response(null, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
