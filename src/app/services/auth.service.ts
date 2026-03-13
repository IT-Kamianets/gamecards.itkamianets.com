import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private _http = inject(HttpClient);
	private _apiUrl = 'https://api.webart.work/api/cardgame';

	token = signal<string | null>(localStorage.getItem('token'));
	user = signal<{ name: string } | null>(JSON.parse(localStorage.getItem('user') || 'null'));

	login(name: string) {
		return this._http.post<string>(`${this._apiUrl}/token`, { name });
	}

	saveToken(token: string, name: string) {
		localStorage.setItem('token', token);
		localStorage.setItem('user', JSON.stringify({ name }));
		this.token.set(token);
		this.user.set({ name });
	}

	logout() {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		this.token.set(null);
		this.user.set(null);
	}
}
