import {window} from "vscode";

export async function showInputBox() {
	const result = await window.showInputBox({
		value: 'abcdef',
		valueSelection: [2, 4],
		placeHolder: 'For example: fedcba. But not: 123',
		// Default must have to ber the name of the file + the branch
		//validate name is unique before save
	});
	return result;
}