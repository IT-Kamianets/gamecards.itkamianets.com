import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Game {
	_id: string;
	mode: string;
	status: string;
	creator: { _id: string; name: string };
	players: { _id: string; name: string }[];
	maxPlayers: number;
}

@Component({
	selector: 'app-lobby',
	templateUrl: './lobby.component.html',
	styleUrl: './lobby.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent implements OnInit {
	private _http = inject(HttpClient);
	protected _auth = inject(AuthService);
	protected _router = inject(Router);

	private _apiUrl = 'https://api.webart.work/api/cardgame';

	games = signal<Game[]>([]);
	loading = signal(true);

	ngOnInit() {
		if (!this._auth.token()) {
			this._router.navigate(['/login']);
			return;
		}
		this.loadGames();
	}

	loadGames() {
		this.loading.set(true);
		this._http
			.get<Game[]>(`${this._apiUrl}/games`, {
				headers: { token: this._auth.token()! },
			})
			.subscribe((games) => {
				this.games.set(games);
				this.loading.set(false);
			});
	}

	createGame() {
		this._http
			.post<Game>(
				`${this._apiUrl}/create`,
				{ maxPlayers: 2, mode: 'durak' },
				{ headers: { token: this._auth.token()! } },
			)
			.subscribe((game) => {
				this._router.navigate(['/game', game._id]);
			});
	}

	logout() {
		this._auth.logout();
		this._router.navigate(['/login']);
	}
}
