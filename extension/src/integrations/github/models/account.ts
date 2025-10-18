/**
 * GitHub Account Model
 * Based on GitHub Desktop's Account implementation
 */

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

