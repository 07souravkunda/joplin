require('app-module-path').addPath(`${__dirname}/..`);

import * as Koa from 'koa';
import apiSessionsRoute from './routes/api/sessions';
import apiPingRoute from './routes/api/ping';
import apiFilesRoute from './routes/api/files';
import { ErrorNotFound } from './utils/errors';
import * as fs from 'fs-extra';
import * as koaBody from 'koa-body';
import { argv } from 'yargs';
import { Routes, findMatchingRoute } from './utils/routeUtils';
import appLogger from './utils/appLogger';
import koaIf from './utils/koaIf';

const port = 3222;

appLogger.info(`Starting server on port ${port} and PID ${process.pid}...`);

const app = new Koa();

// TODO: the routes should be an object with { exec: () => {} }
//       + additional properties to tell what the route needs.
//       For example `needBodyMiddleware` for api/files
const routes:Routes = {
	'api/ping': apiPingRoute,
	'api/sessions': apiSessionsRoute,
	'api/files': apiFilesRoute,
};

const koaBodyMiddleware = koaBody({
	multipart: true,
	includeUnparsed: true,
});

app.use(koaIf(koaBodyMiddleware, (ctx:Koa.Context) => {
	const match = findMatchingRoute(ctx.path, routes);
	return match.route.needsBodyMiddleware === true;
}));

app.use(async (ctx:Koa.Context) => {
	const match = findMatchingRoute(ctx.path, routes);

	try {
		if (match) {
			const responseObject = await match.route.exec(match.subPath, ctx);
			ctx.response.status = 200;
			ctx.response.body = responseObject;
		} else {
			throw new ErrorNotFound();
		}
	} catch (error) {
		appLogger.error(error);
		ctx.response.status = error.httpCode ? error.httpCode : 500;
		ctx.response.body = { error: error.message };
	}
});

const pidFile = argv.pidfile as string;
if (pidFile) {
	appLogger.info(`Writing PID to ${pidFile}...`);
	fs.removeSync(pidFile as string);
	fs.writeFileSync(pidFile, `${process.pid}`);
}

app.listen(port);
