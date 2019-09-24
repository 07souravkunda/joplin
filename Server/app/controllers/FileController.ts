import { File } from '../db';
import FileModel from '../models/FileModel';
import BaseController from './BaseController';

export default class FileController extends BaseController {

	async createFile(sessionId:string, file:File):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		let newFile = await fileModel.fromApiInput(file);
		newFile = await fileModel.save(file);
		return fileModel.toApiOutput(newFile);
	}

	async getFile(sessionId:string, fileId:string):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		return fileModel.toApiOutput(await fileModel.load(fileId));
	}

	async getFileContent(sessionId:string, fileId:string):Promise<File> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const file:File = await fileModel.loadWithContent(fileId);
		return file;
	}

	async getAll(sessionId:string, parentId:string = ''):Promise<File[]> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		return fileModel.allByParent(parentId);
	}

	async updateFile(sessionId:string, file:File):Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const newFile = await fileModel.fromApiInput(file);
		await fileModel.save(newFile);
	}

	async updateFileContent(sessionId:string, fileId:string, content:any):Promise<any> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		const newFile:File = { id: fileId, content: content };
		await fileModel.save(newFile);
	}

	async deleteFile(sessionId:string, fileId:string):Promise<void> {
		const user = await this.initSession(sessionId);
		const fileModel = new FileModel({ userId: user.id });
		await fileModel.delete(fileId);
	}

}
