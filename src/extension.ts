// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SimpleGit, simpleGit, CleanOptions } from "simple-git";
import { showInputBox } from './input';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const git: SimpleGit = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath || "").clean(CleanOptions.FORCE);

	// Create a status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBarItem.text = 'Quick Select';
	statusBarItem.tooltip = 'View File Stash';
	statusBarItem.command = 'extension.openQuickSelect';
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);

	// Register the command that will be executed when the status bar button is clicked
	const command = vscode.commands.registerCommand('extension.openQuickSelect', async () => {
		const options: vscode.QuickPickItem[] = [{
			label: "Action 1",
		}, {
			label: "Herer"
		}, {
			label: "Heredr"
		}, {
			label: "",
			kind: vscode.QuickPickItemKind.Separator
		},
		{
			label: "Stash file",
		}];

		const quickPick = vscode.window.createQuickPick();

		quickPick.items = options;

		quickPick.onDidChangeSelection((e) => {
			const itemSelected = e[0];
			console.log(itemSelected.label);

			if (itemSelected?.label === "Stash file") {
				console.log("selected")
				showInputBox().catch(console.error);
			}

		});

		quickPick.onDidHide(() => quickPick.dispose())

		quickPick.show();

	});

	context.subscriptions.push(command);
}
// This method is called when your extension is deactivated
export function deactivate() { }
