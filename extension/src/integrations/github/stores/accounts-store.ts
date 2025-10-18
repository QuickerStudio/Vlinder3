/**
 * GitHub Accounts Store
 * Manages GitHub accounts with secure token storage
 */

import { GitHubAccount, isDotComAccount } from '../models/account';
import { SecretStateManager } from '../../../providers/state/secret-state-manager';
import { GlobalStateManager } from '../../../providers/state/global-state-manager';

function getKeyForAccount(account: GitHubAccount): string {
	return `GitHub-${account.endpoint}`;
}

function sortAccounts(accounts: ReadonlyArray<GitHubAccount>): ReadonlyArray<GitHubAccount> {
	return accounts
		.map((account, ix) => [account, ix] as const)
		.sort(([xAccount, xIx], [yAccount, yIx]) => {
			const xIsDotCom = isDotComAccount(xAccount) ? 0 : 1;
			const yIsDotCom = isDotComAccount(yAccount) ? 0 : 1;
			return xIsDotCom - yIsDotCom || (xIx as number) - (yIx as number);
		})
		.map(([account]) => account);
}

export class GitHubAccountsStore {
	private static instance: GitHubAccountsStore | null = null;
	private accounts: ReadonlyArray<GitHubAccount> = [];
	private loadingPromise: Promise<void>;
	private listeners: Set<(accounts: ReadonlyArray<GitHubAccount>) => void> = new Set();

	private constructor() {
		this.loadingPromise = this.loadFromStore();
	}

	public static getInstance(): GitHubAccountsStore {
		if (!GitHubAccountsStore.instance) {
			GitHubAccountsStore.instance = new GitHubAccountsStore();
		}
		return GitHubAccountsStore.instance;
	}

	public async getAll(): Promise<ReadonlyArray<GitHubAccount>> {
		await this.loadingPromise;
		return [...this.accounts];
	}

	public async addAccount(account: GitHubAccount): Promise<GitHubAccount | null> {
		await this.loadingPromise;

		try {
			const secretState = SecretStateManager.getInstance();
			const key = getKeyForAccount(account);
			await secretState.updateSecretState(key as any, account.token);

			const accountsByEndpoint = new Map<string, GitHubAccount>();
			this.accounts.forEach(x => accountsByEndpoint.set(x.endpoint, x));
			accountsByEndpoint.set(account.endpoint, account);

			this.accounts = sortAccounts([...accountsByEndpoint.values()]);
			await this.save();

			return account;
		} catch (error) {
			console.error(`Error adding account '${account.login}':`, error);
			return null;
		}
	}

	public async removeAccount(account: GitHubAccount): Promise<void> {
		await this.loadingPromise;

		try {
			const secretState = SecretStateManager.getInstance();
			const key = getKeyForAccount(account);
			await secretState.deleteSecretState(key as any);

			this.accounts = this.accounts.filter(
				a => !(a.endpoint === account.endpoint && a.id === account.id)
			);

			await this.save();
		} catch (error) {
			console.error(`Error removing account '${account.login}':`, error);
		}
	}

	public async getByEndpoint(endpoint: string): Promise<GitHubAccount | null> {
		await this.loadingPromise;
		return this.accounts.find(a => a.endpoint === endpoint) || null;
	}

	public onDidUpdate(callback: (accounts: ReadonlyArray<GitHubAccount>) => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	private async loadFromStore(): Promise<void> {
		try {
			const globalState = GlobalStateManager.getInstance();
			const raw = globalState.getGlobalState('githubAccounts');
			
			if (!raw || !Array.isArray(raw)) {
				this.accounts = [];
				this.emitUpdate();
				return;
			}

			const accountsWithTokens: GitHubAccount[] = [];
			const secretState = SecretStateManager.getInstance();

			for (const accountData of raw) {
				try {
					const accountWithoutToken = GitHubAccount.fromJSON(accountData);
					const key = getKeyForAccount(accountWithoutToken);
					const token = await secretState.getSecretState(key as any);
					
					accountsWithTokens.push(accountWithoutToken.withToken(token || ''));
				} catch (error) {
					console.error('Error loading account:', error);
				}
			}

			this.accounts = sortAccounts(accountsWithTokens);
			this.emitUpdate();
		} catch (error) {
			console.error('Error loading accounts from store:', error);
			this.accounts = [];
			this.emitUpdate();
		}
	}

	private async save(): Promise<void> {
		try {
			const globalState = GlobalStateManager.getInstance();
			const accountsWithoutTokens = this.accounts.map(account => account.toJSON());
			
			await globalState.updateGlobalState('githubAccounts', accountsWithoutTokens);
			this.emitUpdate();
		} catch (error) {
			console.error('Error saving accounts:', error);
		}
	}

	private emitUpdate(): void {
		this.listeners.forEach(listener => listener(this.accounts));
	}
}

