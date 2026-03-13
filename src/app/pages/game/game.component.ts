import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Game {
	_id: string;
	mode: string;
	status: string;
	creator: { _id: string; name: string };
	players: { _id: string; name: string }[];
	maxPlayers: number;
	data?: { trump?: string; turn?: string };
}

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrl: './game.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit {
	private _http = inject(HttpClient);
	protected _auth = inject(AuthService);
	private _router = inject(Router);
	private _route = inject(ActivatedRoute);

	private _apiUrl = 'https://api.webart.work/api/cardgame';

	game = signal<Game | null>(null);
	loading = signal(true);

	get gameId() {
		return this._route.snapshot.params['id'];
	}

	ngOnInit() {
		if (!this._auth.token()) {
			this._router.navigate(['/login']);
			return;
		}
		this.loadGame();
	}

	loadGame() {
		this._http
			.get<Game>(`${this._apiUrl}/game/${this.gameId}`, {
				headers: { token: this._auth.token()! },
			})
			.subscribe((game) => {
				this.game.set(game);
				this.loading.set(false);
			});
	}

	joinGame() {
		this._http
			.post<Game>(
				`${this._apiUrl}/join`,
				{ _id: this.gameId },
				{ headers: { token: this._auth.token()! } },
			)
			.subscribe((game) => {
				if (game) this.game.set(game);
			});
	}

	startGame() {
		this._http
			.post<Game>(
				`${this._apiUrl}/durak/init`,
				{ _id: this.gameId },
				{ headers: { token: this._auth.token()! } },
			)
			.subscribe((game) => {
				if (game) this.game.set(game);
			});
	}

	isCreator() {
		return this.game()?.creator._id === this._auth.user()?._id;
	}

	isPlayer() {
		return this.game()?.players.some((p) => p._id === this._auth.user()?._id);
	}

	backToLobby() {
		this._router.navigate(['/lobby']);
	}
}
