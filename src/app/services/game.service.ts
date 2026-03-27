import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface Game {
	_id: string;
	mode: string;
	status: 'lobby' | 'running' | 'finished';
	creator: { _id: string; name: string };
	players: { _id: string; name: string }[];
	maxPlayers: number;
	data?: {
		trump?: string;
		turn?: string;
		table?: { attack: string; defend: string | null }[];
		attacker?: string;
		defender?: string;
		discard?: string[];
		winners?: string[];
		loser?: string | null;
		doneBy?: string[];
	};
}

@Injectable({ providedIn: 'root' })
export class GameService {
	private _http = inject(HttpClient);
	private _auth = inject(AuthService);
	private _apiUrl = 'https://api.webart.work/api/cardgame';

	myCards = signal<string[]>([]);
	game = signal<Game | null>(null);

	getHeaders() {
		return { token: this._auth.token()! };
	}

	loadGame(gameId: string) {
		return this._http.get<Game>(`${this._apiUrl}/game/${gameId}`, {
			headers: this.getHeaders(),
		});
	}

	loadMyCards(gameId: string) {
		return this._http.get<string[]>(`${this._apiUrl}/durak/mycards`, {
			headers: { ...this.getHeaders(), gameid: gameId },
		});
	}

	makeMove(gameId: string, action: string, payload?: any) {
		return this._http.post<Game>(
			`${this._apiUrl}/durak/move`,
			{ _id: gameId, action, ...payload },
			{ headers: this.getHeaders() },
		);
	}

	joinGame(gameId: string) {
		return this._http.post<Game>(
			`${this._apiUrl}/join`,
			{ _id: gameId },
			{ headers: this.getHeaders() },
		);
	}

	startGame(gameId: string) {
		return this._http.post<Game>(
			`${this._apiUrl}/durak/init`,
			{ _id: gameId },
			{ headers: this.getHeaders() },
		);
	}
}
