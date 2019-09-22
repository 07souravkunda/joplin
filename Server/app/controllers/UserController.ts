import { User } from '../db';
import UserModel from '../models/UserModel';
import BaseController from './BaseController';

export default class UserController extends BaseController {

	async createUser(sessionId:string, user:User):Promise<User> {
		const owner = await this.initSession(sessionId, true);
		const userModel = new UserModel({ userId: owner.id });
		let newUser = await userModel.fromApiInput(user);
		newUser = await userModel.save(newUser);
		return userModel.toApiOutput(newUser);
	}

}
