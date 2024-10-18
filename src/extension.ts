// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	  // Create a status bar item
	  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	  statusBarItem.text = '$(list-selection) Quick Select';
	  statusBarItem.tooltip = 'Open Quick Selection Menu';
	  statusBarItem.command = 'extension.openQuickSelect';
	  statusBarItem.show();
	
	  context.subscriptions.push(statusBarItem);
	
	  // Register the command that will be executed when the status bar button is clicked
	  const command = vscode.commands.registerCommand('extension.openQuickSelect', async () => {
		const options = [
		  'Option 1',
		  'Option 2',
		  'Option 3'
		];
		
		const selectedOption = await vscode.window.showQuickPick(options, {
		  placeHolder: 'Select an option',
		});
	
		if (selectedOption) {
		  vscode.window.showInformationMessage(`You selected: ${selectedOption}`);
		}
	  });
	
	  context.subscriptions.push(command);
}
// This method is called when your extension is deactivated
export function deactivate() { }
