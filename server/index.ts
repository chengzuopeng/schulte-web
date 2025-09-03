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

// 公共查询：返回指定 userId 的历史最佳与当天最佳
async function queryUserBest(env: Env, userId: string | null) {
	const historyBestStmt = env.DB.prepare(`
		SELECT size, MIN(duration) as best_duration
		FROM schulte_time 
		WHERE user_id = ?
		GROUP BY size
		ORDER BY size
	`);
	const todayBestStmt = env.DB.prepare(`
		SELECT size, MIN(duration) as best_duration
		FROM schulte_time 
		WHERE user_id = ? 
		AND DATE(created_time, 'unixepoch') = DATE('now')
		GROUP BY size
		ORDER BY size
	`);

	const [historyBestResult, todayBestResult] = await Promise.all([
		historyBestStmt.bind(userId).all(),
		todayBestStmt.bind(userId).all()
	])

	return {
		historyBest: historyBestResult.results,
		todayBest: todayBestResult.results
	}
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


					// 查询该用户的历史/当天最佳
					const best = await queryUserBest(env, body.userId || null)

					return Response.json({
						success: true,
						message: '数据保存成功',
						data: {
							id: result.meta.last_row_id,
							historyBest: best.historyBest,
							todayBest: best.todayBest
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

			// 处理 /api/record 接口
			if (url.pathname === "/api/record" && request.method === "GET") {
				try {
					const userId = url.searchParams.get('userId');
					
					if (!userId) {
						return Response.json({
							success: false,
							error: '缺少 userId 参数'
						}, { status: 400 });
					}

					const best = await queryUserBest(env, userId)

					return Response.json({
						success: true,
						data: {
							historyBest: best.historyBest,
							todayBest: best.todayBest
						}
					});

				} catch (error) {
					console.error('查询记录时出错:', error);
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
