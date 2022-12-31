/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}

import html from "./resources/html.js";
import varnishCheck from "./service/check.js";

async function handleRequest(request: Request) {
	const requrl: URL = new URL(request.url);
	const reqparams: URLSearchParams = new URLSearchParams(requrl.search);
	const ischecking: Boolean = reqparams.has("url") && reqparams.has("ua");
	let contentType: string = "text/html;charset=UTF-8";
	let resp: string = html;

	// if params detected, check for Varnish, otherwise return web page
	if (ischecking) {
		const url: string = reqparams.get("url") || "";
		const ua: string = reqparams.get("ua") || "";
		contentType = "application/json";

		if (url !== "" && ua !== "") {
			resp = await varnishCheck(url, ua);
		}
	}

	return new Response(resp, {
		headers: {
			'content-type': contentType,
		},
	});
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		return handleRequest(request);
	},
};
