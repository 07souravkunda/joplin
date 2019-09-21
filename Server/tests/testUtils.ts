require('app-module-path').addPath(`${__dirname}/..`);
require('source-map-support').install();

import db, { User, Session } from '../app/db';
import UserModel from '../app/models/UserModel';
import SessionController from '../app/controllers/SessionController';

// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
export const asyncTest = function(callback:Function) {
	return async function(done:Function) {
		try {
			await callback();
		} catch (error) {
			console.error(error);
		} finally {
			done();
		}
	};
};

export const clearDatabase = async function():Promise<void> {
	await db('sessions').truncate();
	await db('users').truncate();
	await db('permissions').truncate();
	await db('files').truncate();
};

export const supportDir = `${__dirname}/../../tests/support`;

interface UserAndSession {
	user: User,
	session: Session,
}

export const createUserAndSession = async function(isAdmin:boolean):Promise<UserAndSession> {
	const userModel = new UserModel();
	const sessionController = new SessionController();
	const user = await userModel.createUser('admin@localhost', '123456', { is_admin: isAdmin ? 1 : 0 });
	const session = await sessionController.authenticate('admin@localhost', '123456');

	return {
		user: user,
		session: session,
	};
};

export const createUser = async function(index:number = 1, isAdmin:boolean = false):Promise<User> {
	const userModel = new UserModel();
	return userModel.createUser(`user${index}@localhost`, '123456', { is_admin: isAdmin ? 1 : 0 });
};

export async function checkThrowAsync(asyncFn:Function):Promise<boolean> {
	let hasThrown = false;
	try {
		await asyncFn();
	} catch (error) {
		hasThrown = true;
	}
	return hasThrown;
}
