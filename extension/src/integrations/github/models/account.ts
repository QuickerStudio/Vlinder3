/**
 * GitHub Account Model
 * Based on GitHub Desktop's Account implementation
 * Includes account management, sign-in flow, and authentication routes
 */

import { z } from 'zod';
import * as vscode from 'vscode';
import { procedure } from '../../../router/utils';
import { SecretStateManager } from '../../../providers/state/secret-state-manager';
import { GlobalStateManager } from '../../../providers/state/global-state-manager';

export interface IAPIEmail {
	readonly email: string;
	readonly verified: boolean;
	readonly primary: boolean;
	readonly visibility: 'public' | 'private' | null;
}

const GITHUB_DOT_COM_API_ENDPOINT = 'https://api.github.com';

/**
 * Returns whether two account instances are equal
 */
export function accountEquals(x: GitHubAccount, y: GitHubAccount): boolean {
	return x.endpoint === y.endpoint && x.id === y.id;
}

/**
 * Whether the account is a GitHub.com account
 */
export function isDotComAccount(account: GitHubAccount): boolean {
	return account.endpoint === GITHUB_DOT_COM_API_ENDPOINT;
}

/**
 * Whether the account is a GitHub Enterprise account
 */
export function isEnterpriseAccount(account: GitHubAccount): boolean {
	return !isDotComAccount(account);
}

/**
 * A GitHub account representing a user on GitHub.com or GitHub Enterprise
 */
export class GitHubAccount {
	private _friendlyEndpoint?: string;

	constructor(
		public readonly login: string,
		public readonly endpoint: string,
		public readonly token: string,
		public readonly emails: ReadonlyArray<IAPIEmail>,
		public readonly avatarURL: string,
		public readonly id: number,
		public readonly name: string,
		public readonly plan?: string
	) {}

	public withToken(token: string): GitHubAccount {
		return new GitHubAccount(
			this.login,
			this.endpoint,
			token,
			this.emails,
			this.avatarURL,
			this.id,
			this.name,
			this.plan
		);
	}

	public get friendlyName(): string {
		return this.name !== '' ? this.name : this.login;
	}

	public get friendlyEndpoint(): string {
		if (this._friendlyEndpoint === undefined) {
			this._friendlyEndpoint = isDotComAccount(this)
				? 'GitHub.com'
				: new URL(this.endpoint).hostname;
		}
		return this._friendlyEndpoint;
	}

	public toJSON(): Record<string, any> {
		return {
			login: this.login,
			endpoint: this.endpoint,
			emails: this.emails,
			avatarURL: this.avatarURL,
			id: this.id,
			name: this.name,
			plan: this.plan,
		};
	}

	public static fromJSON(obj: any, token: string = ''): GitHubAccount {
		return new GitHubAccount(
			obj.login,
			obj.endpoint,
			token,
			obj.emails || [],
			obj.avatarURL,
			obj.id,
			obj.name,
			obj.plan
		);
	}

	public static anonymous(): GitHubAccount {
		return new GitHubAccount(
			'',
			GITHUB_DOT_COM_API_ENDPOINT,
			'',
			[],
			'',
			-1,
			'',
			'free'
		);
	}
}

/**
 * Helper Functions
 */
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

/**
 * GitHub Accounts Store
 * Manages GitHub accounts with secure token storage
 */
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

/**
 * Sign In Flow
 */
export enum SignInStep {
	Authentication = 'Authentication',
	Success = 'Success',
}

export type SignInState = IAuthenticationState | ISuccessState;

export interface IBaseSignInState {
	readonly kind: SignInStep;
	readonly error: Error | null;
	readonly loading: boolean;
}

export interface IAuthenticationState extends IBaseSignInState {
	readonly kind: SignInStep.Authentication;
	readonly endpoint: string;
}

export interface ISuccessState {
	readonly kind: SignInStep.Success;
	readonly account: GitHubAccount;
}

export type SignInResult =
	| { kind: 'success'; account: GitHubAccount }
	| { kind: 'cancelled' };

/**
 * GitHub Sign In Store
 * Manages the sign-in flow with OAuth
 */
export class GitHubSignInStore {
	private static instance: GitHubSignInStore | null = null;
	private state: SignInState | null = null;
	private listeners: Set<(state: SignInState | null) => void> = new Set();
	private accountsStore: GitHubAccountsStore;

	private constructor() {
		this.accountsStore = GitHubAccountsStore.getInstance();
	}

	public static getInstance(): GitHubSignInStore {
		if (!GitHubSignInStore.instance) {
			GitHubSignInStore.instance = new GitHubSignInStore();
		}
		return GitHubSignInStore.instance;
	}

	public getState(): SignInState | null {
		return this.state;
	}

	public onDidUpdate(callback: (state: SignInState | null) => void): () => void {
		this.listeners.add(callback);
		return () => this.listeners.delete(callback);
	}

	public reset(): void {
		this.setState(null);
	}

	public async beginDotComSignIn(): Promise<SignInResult> {
		const endpoint = 'https://api.github.com';

		if (this.state !== null) {
			this.reset();
		}

		const existingAccount = await this.accountsStore.getByEndpoint(endpoint);
		if (existingAccount) {
			await this.accountsStore.removeAccount(existingAccount);
		}

		this.setState({
			kind: SignInStep.Authentication,
			endpoint,
			error: null,
			loading: false,
		});

		return await this.authenticateWithBrowser(endpoint);
	}

	private async authenticateWithBrowser(endpoint: string): Promise<SignInResult> {
		const currentState = this.state;

		if (currentState?.kind !== SignInStep.Authentication) {
			return { kind: 'cancelled' };
		}

		this.setState({ ...currentState, loading: true });

		try {
			const session = await vscode.authentication.getSession(
				'github',
				['repo', 'user', 'write:discussion'],
				{ createIfNone: true }
			);

			if (!session) {
				throw new Error('Failed to get GitHub session');
			}

			const response = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `Bearer ${session.accessToken}`,
					Accept: 'application/vnd.github.v3+json',
				},
			});

			if (!response.ok) {
				throw new Error('Failed to fetch user information');
			}

			const userData = await response.json();

			const account = new GitHubAccount(
				userData.login,
				endpoint,
				session.accessToken,
				userData.email ? [{ 
					email: userData.email, 
					verified: true, 
					primary: true, 
					visibility: 'public' 
				}] : [],
				userData.avatar_url,
				userData.id,
				userData.name || userData.login,
				userData.plan?.name || 'free'
			);

			const savedAccount = await this.accountsStore.addAccount(account);

			if (!savedAccount) {
				throw new Error('Failed to save account');
			}

			this.setState({
				kind: SignInStep.Success,
				account: savedAccount,
			});

			return { kind: 'success', account: savedAccount };
		} catch (error: any) {
			console.error('GitHub authentication error:', error);
			
			if (currentState.kind === SignInStep.Authentication) {
				this.setState({
					...currentState,
					error: error instanceof Error ? error : new Error(error.message || 'Authentication failed'),
					loading: false,
				});
			}

			return { kind: 'cancelled' };
		}
	}

	private setState(state: SignInState | null): void {
		this.state = state;
		this.listeners.forEach(listener => listener(this.state));
	}
}

/**
 * Authentication Routes
 */

export const authenticateGitHub = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const signInStore = GitHubSignInStore.getInstance();
			const result = await signInStore.beginDotComSignIn();

			if (result.kind === 'success') {
				return {
					success: true,
					account: {
						username: result.account.login,
						email: result.account.emails[0]?.email,
						avatarUrl: result.account.avatarURL,
					},
				};
			}

			return {
				success: false,
				error: 'Authentication cancelled or failed',
			};
		} catch (error: any) {
			console.error('GitHub authentication error:', error);
			return {
				success: false,
				error: error.message || 'Failed to authenticate with GitHub',
			};
		}
	});

export const getGitHubAccount = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const accountsStore = GitHubAccountsStore.getInstance();
			const accounts = await accountsStore.getAll();

			if (accounts.length === 0) {
				return {
					authenticated: false,
					account: null,
				};
			}

			const account = accounts[0];
			return {
				authenticated: true,
				account: {
					username: account.login,
					email: account.emails[0]?.email,
					avatarUrl: account.avatarURL,
				},
			};
		} catch (error: any) {
			console.error('Error getting GitHub account:', error);
			return {
				authenticated: false,
				account: null,
			};
		}
	});

export const logoutGitHub = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const accountsStore = GitHubAccountsStore.getInstance();
			const accounts = await accountsStore.getAll();

			for (const account of accounts) {
				await accountsStore.removeAccount(account);
			}

			return {
				success: true,
			};
		} catch (error: any) {
			console.error('Error logging out from GitHub:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	});

export const fetchGitHubAvatar = procedure
	.input(z.object({
		avatarUrl: z.string(),
	}))
	.resolve(async (ctx, input) => {
		try {
			const response = await fetch(input.avatarUrl);
			if (!response.ok) {
				throw new Error('Failed to fetch avatar');
			}

			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const base64 = buffer.toString('base64');
			const mimeType = response.headers.get('content-type') || 'image/png';

			return {
				success: true,
				base64: `data:${mimeType};base64,${base64}`,
			};
		} catch (error: any) {
			console.error('Error fetching avatar:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	});

