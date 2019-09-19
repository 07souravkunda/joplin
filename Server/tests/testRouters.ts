import * as fs from 'fs-extra';

const { stringify } = require('query-string');

const execCommand = function(command:string):Promise<string> {
	const exec = require('child_process').exec;

	return new Promise((resolve, reject) => {
		exec(command, (error:any, stdout:any) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve(stdout.trim());
			}
		});
	});
};

async function sleep(seconds:number) {
	return new Promise((resolve:Function) => {
		setTimeout(() => {
			resolve();
		}, seconds * 1000);
	});
}

async function curl(method:string, path:string, query:object = null, body:any = null):Promise<object> {
	const curlCmd:string[] = ['curl'];

	if (method !== 'GET') {
		curlCmd.push('-X');
		curlCmd.push(method);
	}

	if (typeof body === 'object') {
		curlCmd.push('--data');
		curlCmd.push('\'' + JSON.stringify(body) + '\'');
	}

	curlCmd.push('http://localhost:3222/' + path + (query ? '?' + stringify(query) : ''));

	const result = await execCommand(curlCmd.join(' '));
	return result ? JSON.parse(result) : null;
}

const spawn = require('child_process').spawn;

let serverProcess:any = null;

async function main() {
	const serverRoot = __dirname + '/../..';
	process.chdir(serverRoot);
	const pidFilePath = serverRoot + '/test.pid';

	fs.removeSync(serverRoot + '/db-testing.sqlite');

	await execCommand('npm run compile');
	await execCommand('NODE_ENV=testing npx knex migrate:latest');

	serverProcess = spawn('node', ['dist/app/app.js', '--pidfile', pidFilePath], {
		detached: true,
		stdio: 'inherit',
		env: Object.assign({}, process.env, { NODE_ENV: 'testing' }),
	});

	let response:object = null;

	console.info('Waiting for server to be ready...');

	while (true) {
		try {
			response = await curl('GET', 'ping');
			console.info('Got ping response: ' + JSON.stringify(response));
			break;
		} catch (error) {
			await sleep(0.5);
		}
	}

	console.info('Server is ready');

	response = await curl('POST', 'sessions', null, { email: 'admin@localhost', password: 'admin' });

	console.info(response);

	serverProcess.kill();
}

main().catch(error => {
	console.error('FATAL ERROR', error);
	if (serverProcess) serverProcess.kill();
});
