// server/services/auth/src/index.ts
import "dotenv/config";
import { initDb } from './db.js'
import Fastify from "fastify";
import crypto from "crypto";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fs from "fs";
import path from "path";

import { authenticator } from "otplib";
import QRCode from "qrcode";
import {
	findUserById,
	findUserByIntraId,
	findUserByDisplayName,
	createIntraUser,
	setTwoFASecret,
	enable2FA,
	disable2FA,
	updateUserAvatar,
	updateUserDisplayName,
	initDisplayNameIfNull,
} from "./user.repository.js";
import { registerUsersHandlers } from "./handlers/users.js";



import fastifyMetrics from "fastify-metrics";
// import fastifyCors from '@fastify/cors';
const db = initDb();



const fastify = Fastify({ logger: true });

// 1️⃣ DB - Initialize BEFORE handlers


declare module "@fastify/jwt" {
	interface FastifyJWT {
		payload: {
			id: number;
			login: string;
			email: string | null;
			image: string | null;
			displayName: string | null;
			twofaPassed: boolean;
		};
		user: {
			id: number;
			login: string;
			email: string | null;
			image: string | null;
			displayName: string | null;
			twofaPassed: boolean;
		};
	}
}


// const ALLOWED_CORS = new Set([
// 	'http://localhost:8443',
// 	'http://127.0.0.1:8443',
// ]);

// await fastify.register(fastifyCors, {
// 	origin: (origin, cb) => {
// 		if (!origin) return cb(null, true);
// 		cb(null, ALLOWED_CORS.has(origin));
// 	},
// 	credentials: true,
// 	methods: ['GET', 'POST', 'OPTIONS'],
// 	allowedHeaders: ['Content-Type', 'Authorization'],
// });


fastify.register(fastifyCookie, { secret: process.env.COOKIE_SECRET! });
fastify.register(fastifyJwt, {
	secret: process.env.JWT_SECRET!,
	cookie: {
		cookieName: 'appToken',
		signed: false,
	},
});

// Register multipart for file uploads
fastify.register(fastifyMultipart, {
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB
	},
});

registerUsersHandlers(fastify, db);

// Simple route for serving avatars
fastify.get('/auth/avatars/:filename', async (req, reply) => {
	const filename = (req.params as any).filename;
	const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);

	try {
		const file = await fs.promises.readFile(filePath);
		const ext = path.extname(filename).toLowerCase();
		const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
		reply.type(contentType);
		return reply.send(file);
	} catch {
		return reply.code(404).send({ error: 'File not found' });
	}
});

//fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET! });
(fastify as any).register(fastifyMetrics, { endpoint: "/auth/metrics" });

//let accessToken: string | null = null; Zara
//let tokenExpiry: number | null = null; Zara


function generateState(): string {
	return crypto.randomBytes(16).toString("hex");
}

// declare module "fastify" {
// 	interface FastifyInstance {
// 		authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
// 	}
// }


// fastify.decorate("authenticate", async function (request, reply) {
// 	try {
// 		await request.jwtVerify();
// 	} catch (err) {
// 		reply.code(401).send({ error: "Unauthorized, please authenticate." });
// 	}
// });

// // fastify.get("/auth", { preHandler: [fastify.authenticate] }, async () => {
// // 	return { message: "HELLO !!! /auth/42/login pour te connecter avec 42" };
// // });

const pendingStates = new Map<string, number>();


fastify.get("/auth/42/login", async (_request: any, reply: any) => {
	const state = generateState();
	console.log("LOGIN - Generated state:", state);
	pendingStates.set(state, Date.now() + 5 * 60 * 1000);

	const url = `https://api.intra.42.fr/oauth/authorize` + `?client_id=${process.env.CLIENT_ID}` +
		`&redirect_uri=${encodeURIComponent("https://localhost:8443/auth/callback")}` +
		`&response_type=code` + `&state=${state}`;

	return reply.redirect(url);
});


/*

fastify.get("/auth/callback", async (request: any, reply: any) => {

	const code = request.query.code;
	const state42 = request.query.state;

	if (!code || !state42)
		return reply.send({ Error: "No code sent" });
	const expiry = pendingStates.get(state42);
	if (!expiry || Date.now() > expiry) {
		return reply.code(400).send({ error: "Invalid or expired state" });
	}
	pendingStates.delete(state42);

	if (!accessToken || (tokenExpiry && Date.now() > tokenExpiry)) {
		const res = await fetch(`https://api.intra.42.fr/oauth/token`, {
			method: "POST",
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: process.env.CLIENT_ID!,
				client_secret: process.env.CLIENT_SECRET!,
				code: code,
				redirect_uri: process.env.REDIRECT_URI!
			}),
		})
		const data = await res.json();
		accessToken = data.access_token;
		tokenExpiry = Date.now() + data.expires_in * 1000;
		console.log("response : ", data)
		if (!data)
			return reply.code(500).send({ Error: "Token not accessible" });
	}
	return reply.redirect(`/auth/me`);
});

  



fastify.get("/auth/me", async (_request, reply) => {

	try {
		if (!accessToken) {
			return reply.code(401).send({ error: "not_authenticated" });
		}
		const res = await fetch("https://api.intra.42.fr/v2/me", {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!res.ok)
			return reply.code(res.status).send({ Error: "Fetch failed line 93" });

		const user = await res.json();
		const appToken = fastify.jwt.sign({
			id: user.id,
			login: user.login,
			email: user.email,
			image: user.image?.link,
		},
			{ expiresIn: '1h' }
		);
		return reply.setCookie('appToken', appToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'none',
			path: '/',
			maxAge: 60*60,
		}).redirect(`${process.env.FRONTEND_URL}/home`);
	}
	catch(err) {
		return reply.code(401).send({err: "Can not create cookie"});
	}
});



fastify.get("/auth/session", async (req, reply) => {
	const token = (req.cookies as any)?.appToken;
	if (!token)
		return reply.code(401).send({ error: "no cookie" });
	try {
		const payload = await fastify.jwt.verify(token) as any;
		return reply.send({ user: 
			{ 
				id: payload.id,
				login: payload.login,
				email: payload.email, 
				image: payload.image 
			} });
	} catch {
		return reply.code(401).send({ error: "invalid_token" });
	}
});*/


fastify.get("/auth/callback", async (request: any, reply: any) => {
	const code = request.query.code;
	const state42 = request.query.state;

	if (!code || !state42) {
		return reply.code(400).send({ error: "No code/state" });
	}

	const expiry = pendingStates.get(state42);
	if (!expiry || Date.now() > expiry) {
		return reply.code(400).send({ error: "Invalid or expired state" });
	}
	pendingStates.delete(state42);

	// ✅ ВСЕГДА меняем code на токен (НЕ храним глобально)
	const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
		method: "POST",
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: process.env.CLIENT_ID!,
			client_secret: process.env.CLIENT_SECRET!,
			code: code,
			redirect_uri: process.env.REDIRECT_URI!, // https://localhost:8443/auth/callback
		}),
	});

	if (!tokenRes.ok) {
		const t = await tokenRes.text();
		return reply.code(500).send({ error: "token_exchange_failed", details: t });
	}

	const tokenData = await tokenRes.json();
	const intraAccessToken = tokenData.access_token;

	// ✅ Получаем конкретного пользователя по его токену
	const meRes = await fetch("https://api.intra.42.fr/v2/me", {
		headers: { Authorization: `Bearer ${intraAccessToken}` },
	});

	if (!meRes.ok) {
		const t = await meRes.text();
		return reply.code(500).send({ error: "fetch_me_failed", details: t });
	}

	const intraUser = await meRes.json();

	// ===== DB: create/find user =====
	let user = findUserByIntraId(intraUser.id);

	if (!user) {
		createIntraUser(
			intraUser.id,
			intraUser.login,
			intraUser.email,
			intraUser.image?.link
		);
		user = findUserByIntraId(intraUser.id);
	}

	initDisplayNameIfNull(user.id);
	const updatedUser = findUserById(user.id);

	// ===== JWT cookie =====
	const appToken = fastify.jwt.sign(
		{
			id: updatedUser.id,
			login: updatedUser.login,
			email: updatedUser.email,
			image: updatedUser.image,
			displayName: updatedUser.display_name || updatedUser.login,
			twofaPassed: updatedUser.is_2fa_enabled === 0,
		},
		{ expiresIn: "1h" }
	);

	return reply
		.setCookie("appToken", appToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none",
			path: "/",
			maxAge: 60 * 60,
		})
		.redirect(`${process.env.FRONTEND_URL}/home`);
});


fastify.get("/auth/session", async (req, reply) => {
	const token = (req.cookies as any)?.appToken;
	if (!token) {
		return reply.code(401).send({ error: "no cookie" });
	}

	try {
		// Verify JWT
		const payload = await fastify.jwt.verify(token) as {
			id: number;
			twofaPassed?: boolean;
		};

		// Get user from database
		const user = findUserById(payload.id);
		if (!user) {
			return reply.code(401).send({ error: "user_not_found" });
		}

		// Return current state
		return reply.send({
			user: {
				id: user.id,
				login: user.login,
				email: user.email,
				image: user.image,
				displayName: user.display_name || user.login,
				is2faEnabled: user.is_2fa_enabled === 1,
				twofaPassed: payload.twofaPassed === true,
			},
		});
	} catch {
		return reply.code(401).send({ error: "invalid_token" });
	}
});


// ============================
// Public profile (for chat)
// ============================
fastify.get("/auth/api/profile/:id", async (req, reply) => {
	await req.jwtVerify({ onlyCookie: true });
  
	const id = Number((req.params as any).id);
	if (Number.isNaN(id)) {
	  return reply.code(400).send({ error: "invalid_id" });
	}
  
	const user = findUserById(id);
	if (!user) {
	  return reply.code(404).send({ error: "user_not_found" });
	}
  
	return reply.send({
	  userId: user.id,
	  login: user.login,
	  avatar: user.image,
	  displayName: user.display_name,
	});
  });
  

fastify.post('/auth/logout', async (_req, reply) => {
	reply.clearCookie('appToken', {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		path: '/',
	}).code(204).send();
});






fastify.post("/auth/2fa/setup", async (req, reply) => {
	await req.jwtVerify({ onlyCookie: true });

	const user = findUserById(req.user.id);
	if (user.is_2fa_enabled === 1)
		return reply.code(403).send({ error: "2FA already enabled" });

	const secret = authenticator.generateSecret();
	setTwoFASecret(user.id, secret);

	const otpauth = authenticator.keyuri(
		user.email || user.login,
		"Transcendence",
		secret
	);

	const qr = await QRCode.toDataURL(otpauth);
	return reply.send({ secret, qr });
});


fastify.post("/auth/2fa/verify", async (req, reply) => {
	await req.jwtVerify({ onlyCookie: true });

	const { code } = req.body as { code: string };
	const user = findUserById(req.user.id);


	if (!code || typeof code !== 'string' || code.length !== 6) {
		return reply.code(400).send({ error: "Code requis (6 chiffres)" });
	}

	const valid = authenticator.check(code, user.twofa_secret);
	if (!valid) {
		return reply.code(400).send({ error: "invalid code" });
	}

	if (user.is_2fa_enabled === 0) {
		enable2FA(user.id);
	}

	const newJwt = fastify.jwt.sign(
		{
			id: user.id,
			login: user.login,
			email: user.email,
			image: user.image,
			displayName: user.display_name || user.login,
			twofaPassed: true,
		},
		{ expiresIn: "1h" }
	);

	reply.setCookie("appToken", newJwt, {
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});

	return reply.send({ ok: true });
});

fastify.post("/auth/2fa/disable", async (req, reply) => {
	await req.jwtVerify({ onlyCookie: true });

	const { code } = req.body as { code: string };
	const user = findUserById(req.user.id);


	if (!code || typeof code !== 'string' || code.length !== 6) {
		return reply.code(400).send({ error: "Code requis (6 chiffres)" });
	}

	if (!authenticator.check(code, user.twofa_secret)) {
		return reply.code(400).send({ error: "invalid code" });
	}

	disable2FA(user.id);

	const newJwt = fastify.jwt.sign(
		{
			id: user.id,
			login: user.login,
			email: user.email,
			image: user.image,
			displayName: user.display_name || user.login,
			twofaPassed: true,
		},
		{ expiresIn: "1h" }
	);

	reply.setCookie("appToken", newJwt, {
		path: "/",
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});

	return reply.send({ ok: true });
});

// ============================
// Avatar endpoint
// ============================
fastify.post("/auth/avatar", async (req, reply) => {
	await req.jwtVerify({ onlyCookie: true });

	const user = findUserById(req.user.id);
	if (!user) {
		return reply.code(401).send({ error: "user_not_found" });
	}

	// ===== CHECK CONTENT TYPE =====
	const contentType = req.headers['content-type'] || '';

	// ===== DEFAULT AVATAR (JSON) =====
	if (contentType.includes('application/json')) {
		const body = req.body as { imageUrl?: string };

		if (body?.imageUrl) {
			updateUserAvatar(user.id, body.imageUrl);

			const newJwt = fastify.jwt.sign({
				id: user.id,
				login: user.login,
				email: user.email,
				image: body.imageUrl,
				displayName: user.display_name || null,
				twofaPassed: req.user.twofaPassed,
			});

			reply.setCookie("appToken", newJwt, {
				path: "/",
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			return reply.send({ image: body.imageUrl });
		}

		return reply.code(400).send({ error: "no_image_provided" });
	}

	// ===== FILE UPLOAD (MULTIPART) =====
	if (contentType.includes('multipart/form-data')) {
		try {
			const file = await (req as any).file();

			if (file) {
				const ext = path.extname(file.filename || '');
				const filename = `avatar_${user.id}_${Date.now()}${ext}`;
				const uploadDir = path.join(process.cwd(), "uploads", "avatars");
				const uploadPath = path.join(uploadDir, filename);

				await fs.promises.mkdir(uploadDir, { recursive: true });
				await fs.promises.writeFile(uploadPath, await file.toBuffer());

				// IMPORTANT: path with /auth prefix
				const publicPath = `/auth/avatars/${filename}`;
				updateUserAvatar(user.id, publicPath);

				const newJwt = fastify.jwt.sign({
					id: user.id,
					login: user.login,
					email: user.email,
					image: publicPath,
					displayName: user.display_name || user.login,
					twofaPassed: req.user.twofaPassed,
				});

				reply.setCookie("appToken", newJwt, {
					path: "/",
					httpOnly: true,
					secure: true,
					sameSite: "none",
				});

				return reply.send({ image: publicPath });
			}
		} catch (err: any) {
			console.error("File upload error:", err);
			return reply.code(500).send({ error: "upload_failed" });
		}
	}

	return reply.code(400).send({ error: "invalid_content_type" });
});


fastify.post("/auth/profile", async (req, reply) => {
	await req.jwtVerify({ onlyCookie: true });

	const { displayName } = req.body as { displayName?: string };

	if (!displayName || displayName.length < 3 || displayName.length > 20) {
		return reply.code(400).send({ error: "invalid_display_name" });
	}


	if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
		return reply.code(400).send({ error: "invalid_characters" });
	}

	// Check display_name uniqueness (excluding current user)
	const existingUser = findUserByDisplayName(displayName);
	if (existingUser && existingUser.id !== req.user.id) {
		return reply.code(409).send({ error: "display_name_taken" });
	}

	try {
		updateUserDisplayName(req.user.id, displayName);

		// Update JWT with new displayName
		const user = findUserById(req.user.id);
		const newJwt = fastify.jwt.sign({
			id: user.id,
			login: user.login,
			email: user.email,
			image: user.image,
			displayName: displayName,
			twofaPassed: req.user.twofaPassed,
		});

		reply.setCookie("appToken", newJwt, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "none",
		});

		return reply.send({ ok: true });
	} catch (err: any) {
		if (err.code === "SQLITE_CONSTRAINT") {
			return reply.code(409).send({ error: "display_name_taken" });
		}
		console.error("Profile update error:", err);
		return reply.code(500).send({ error: "update_failed" });
	}
});



await fastify.listen({ port: 3001, host: "0.0.0.0" });