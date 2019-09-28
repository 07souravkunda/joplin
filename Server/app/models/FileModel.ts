import BaseModel, { ValidateOptions, SaveOptions } from './BaseModel';
import PermissionModel from './PermissionModel';
import { File, ItemType, databaseSchema } from '../db';
import { ErrorForbidden, ErrorUnprocessableEntity, ErrorNotFound, ErrorBadRequest } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import { splitItemPath, filePathInfo } from '../utils/routeUtils';

const mimeUtils = require('lib/mime-utils.js').mime;

const nodeEnv = process.env.NODE_ENV || 'development';

export interface EntityFromItemIdOptions {
	mustExist?: boolean
}

export default class FileModel extends BaseModel {

	get tableName():string {
		return 'files';
	}

	async userRootFile():Promise<File> {
		const file:File = await this.db<File>(this.tableName).select(...this.defaultFields).from(this.tableName).where({
			'owner_id': this.userId,
			'is_root': 1,
		}).first();
		if (file) await this.checkCanReadPermissions(file);
		return file;
	}

	async userRootFileId():Promise<string> {
		const r = await this.userRootFile();
		return r ? r.id : '';
	}

	async fileOwnerId(fileId:string):Promise<string> {
		const r = await this.db('permissions').select('permissions.user_id').where({
			'item_type': ItemType.File,
			'item_id': fileId,
			'is_owner': 1,
		}).first();

		if (!r) return null;

		return r.user_id;
	}

	async entityFromItemId(idOrPath:string, options:EntityFromItemIdOptions = {}):Promise<File> {
		options = { mustExist: true, ...options };

		if (idOrPath.indexOf(':') < 0) {
			return { id: idOrPath };
		} else {
			// When this input is a path, there can be two cases:
			// - A path to an existing file - in which case we return the file
			// - A path to a file that needs to be created - in which case we
			//   return a file with all the relevant properties populated. This
			//   file might then be created by the caller.
			// The caller can check file.id to see if it's a new or existing file.
			// In both cases the directories before the filename must exist.

			const fileInfo = filePathInfo(idOrPath);
			const parentFiles = await this.pathToFiles(fileInfo.dirname);
			const parentId = parentFiles[parentFiles.length - 1].id;

			// This is an existing file
			const existingFile = await this.fileByName(parentId, fileInfo.basename);
			if (existingFile) return { id: existingFile.id };

			if (options.mustExist) throw new ErrorNotFound(`file not found: ${idOrPath}`);

			// This is a potentially new file
			return {
				name: fileInfo.basename,
				parent_id: parentId,
			};
		}
	}

	get defaultFields():string[] {
		return Object.keys(databaseSchema[this.tableName]).filter(f => f !== 'content');
	}

	async allByParent(parentId:string):Promise<File[]> {
		if (!parentId) parentId = await this.userRootFileId();
		return this.db(this.tableName).select(...this.defaultFields).where({ parent_id: parentId });
	}

	async fileByName(parentId:string, name:string):Promise<File> {
		return this.db<File>(this.tableName).select(...this.defaultFields).where({
			parent_id: parentId,
			name: name,
		}).first();
	}

	async validate(object:File, options:ValidateOptions = {}):Promise<File> {
		const file:File = object;

		if (options.isNew) {
			if (!file.is_root && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		} else {
			if ('name' in file && !file.name) throw new ErrorUnprocessableEntity('name cannot be empty');
		}

		let parentId = file.parent_id;
		if (!parentId) parentId = await this.userRootFileId();

		if ('parent_id' in file && !file.is_root) {
			const invalidParentError = function(extraInfo:string) {
				let msg = `Invalid parent ID or no permission to write to it: ${parentId}`;
				if (nodeEnv !== 'production') msg += ` (${extraInfo})`;
				return new ErrorForbidden(msg);
			};

			if (!parentId) throw invalidParentError('No parent ID');

			try {
				const parentFile:File = await this.load(parentId);
				if (!parentFile) throw invalidParentError('Cannot load parent file');
				if (!parentFile.is_directory) throw invalidParentError('Specified parent is not a directory');
				await this.checkCanWritePermission(parentFile);
			} catch (error) {
				if (error.message.indexOf('Invalid parent') === 0) throw error;
				throw invalidParentError(`Unknown: ${error.message}`);
			}
		}

		if ('name' in file && !file.is_root) {
			const existingFile = await this.fileByName(parentId, file.name);
			if (existingFile && options.isNew) throw new ErrorUnprocessableEntity(`Already a file with name "${file.name}"`);
			if (existingFile && file.id === existingFile.id) throw new ErrorUnprocessableEntity(`Already a file with name "${file.name}"`);
		}

		return file;
	}

	async fromApiInput(object:File):Promise<File> {
		const file:File = {};

		if ('id' in object) file.id = object.id;
		if ('name' in object) file.name = object.name;
		if ('parent_id' in object) file.parent_id = object.parent_id;
		if ('mime_type' in object) file.mime_type = object.mime_type;

		return file;
	}

	toApiOutput(object:any):any {
		const output:File = { ...object };
		delete output.content;
		return output;
	}

	async createRootFile():Promise<File> {
		const existingRootFile = await this.userRootFile();
		if (existingRootFile) throw new Error(`User ${this.userId} has already a root file`);

		const fileModel = new FileModel({ userId: this.userId });

		const id = uuidgen();

		return fileModel.save({
			id: id,
			is_directory: 1,
			is_root: 1,
			name: id, // Name must be unique so we set it to the ID
		}, { isNew: true });
	}

	private async checkCanReadPermissions(file:File):Promise<void> {
		if (!file) throw new Error('no file specified');
		if (file.owner_id === this.userId) return;
		const permissionModel = new PermissionModel();
		const canRead:boolean = await permissionModel.canRead(file.id, this.userId);
		if (!canRead) throw new ErrorForbidden();
	}

	private async checkCanWritePermission(file:File):Promise<void> {
		if (!file) throw new Error('no file specified');
		if (file.owner_id === this.userId) return;
		const permissionModel = new PermissionModel();
		const canWrite:boolean = await permissionModel.canWrite(file.id, this.userId);
		if (!canWrite) throw new ErrorForbidden();
	}

	private async pathToFiles(path:string, mustExist:boolean = true):Promise<File[]> {
		const filenames = splitItemPath(path);
		const output:File[] = [];
		let parent:File = null;

		for (let i = 0; i < filenames.length; i++) {
			const filename = filenames[i];
			let file:File = null;
			if (i === 0) {
				// For now we only support "root" as a root component, but potentially it could
				// be any special directory like "documents", "pictures", etc.
				if (filename !== 'root') throw new ErrorBadRequest(`unknown path root component: ${filename}`);
				file = await this.userRootFile();
			} else {
				file = await this.fileByName(parent.id, filename);
			}

			if (!file && mustExist) throw new ErrorNotFound(`file not found: "${filename}" on parent "${parent ? parent.name : ''}"`);

			output.push(file);
			parent = {...file};
		}

		if (!output.length && mustExist) throw new ErrorBadRequest(`path without a base directory: ${path}`);

		return output;
	}

	async loadWithContent(id:string):Promise<any> {
		const file:File = await this.db<File>(this.tableName).select('*').where({ id: id }).first();
		await this.checkCanReadPermissions(file);
		return file;
	}

	async load(id:string):Promise<File> {
		const file:File = await super.load(id);
		await this.checkCanReadPermissions(file);
		return file;
	}

	async save(object:File, options:SaveOptions = {}):Promise<File> {
		const isNew = await this.isNew(object, options);

		const txIndex = await this.startTransaction();

		let file:File = { ... object };

		try {
			if (!file.parent_id && !file.is_root) file.parent_id = await this.userRootFileId();

			if ('content' in file) file.size = file.content ? file.content.byteLength : 0;

			if (isNew) {
				// Even if there's no content, set the mime type based on the extension
				if (!file.is_directory) file.mime_type = mimeUtils.fromFilename(file.name);

				// Make sure it's not NULL, which is not allowed
				if (!file.mime_type) file.mime_type = '';

				file.owner_id = this.userId;
			}

			file = await super.save(file, options);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);

		return file;
	}

	async delete(id:string):Promise<void> {
		const file:File = await this.load(id);
		await this.checkCanWritePermission(file);

		const txIndex = await this.startTransaction();

		try {
			const permissionModel = new PermissionModel();
			await permissionModel.deleteByFileId(id);
			await super.delete(id);
		} catch (error) {
			await this.rollbackTransaction(txIndex);
			throw error;
		}

		await this.commitTransaction(txIndex);
	}

}
