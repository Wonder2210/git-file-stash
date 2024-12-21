import { window } from "vscode";

export async function showInputBox({ validate, value }: { validate?: (value: string) => string | null; value?: string }) {
	const result = await window.showInputBox({
		value,
		valueSelection: [2, 4],
		placeHolder: 'Name to identify the stash',
		validateInput: validate,
		
	});
	return result;
}