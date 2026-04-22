import {
	ChangeDetectionStrategy,
	Component,
	inject,
	OnDestroy,
	OnInit,
	signal,
	computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrl: './game.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
	protected _auth = inject(AuthService);
	protected _gameService = inject(GameService);
	private _router = inject(Router);
	private _route = inject(ActivatedRoute);

	private _interval: any;
	private _isProcessing = false;

	game = signal(this._gameService.game());
	myCards = signal<string[]>([]);
	loading = signal(true);

	// Захист: вибрана карта з руки → потім клік по атакуючій на столі
	selectedCard = signal<string | null>(null);
	defendMode = signal(false);

	// Кількість карт у кожного гравця (зберігаємо окремо, бо API не повертає)
	playerCardCounts = signal<Record<string, number>>({});

	get gameId() {
		return this._route.snapshot.params['id'];
	}

	get myId() {
		return this._auth.user()?._id ?? '';
	}

	isAttacker = computed(() => this.game()?.data?.attacker === this.myId);
	isDefender = computed(() => this.game()?.data?.defender === this.myId);
	isMyTurn = computed(() => this.isAttacker() || this.isDefender());

	// Чи може атакуючий натиснути "Готово"
	// Атакуючий може завершити хід якщо: є хоч одна карта на столі
	// (незалежно від того чи всі відбиті)
	canAttackerDone = computed(() => {
		const table = this.game()?.data?.table;
		return this.isAttacker() && (table?.length ?? 0) > 0;
	});

	// Захисник може натиснути "Готово" тільки якщо всі карти відбиті
	canDefenderDone = computed(() => {
		return this.isDefender() && this.allDefended();
	});

	// Захисник може взяти карти якщо є хоч одна атака на столі
	canTake = computed(() => {
		return this.isDefender() && (this.game()?.data?.table?.length ?? 0) > 0;
	});

	ngOnInit() {
		if (!this._auth.token()) {
			this._router.navigate(['/login']);
			return;
		}
		this.loadGame();
		this._interval = setInterval(() => {
			if (!this._isProcessing) {
				this.loadGame(false);
			}
		}, 3000);
	}

	ngOnDestroy() {
		clearInterval(this._interval);
	}

	loadGame(showLoading = true) {
		if (showLoading) this.loading.set(true);

		this._gameService.loadGame(this.gameId).subscribe({
			next: (game) => {
				this._gameService.game.set(game);
				this.game.set(game);
				this.loading.set(false);

				if (game.status === 'running' && this.isPlayer()) {
					this._gameService.loadMyCards(this.gameId).subscribe({
						next: (cards) => {
							this._gameService.myCards.set(cards);
							this.myCards.set(cards);
						},
						error: (err) => console.error('Error loading cards:', err),
					});
				}
			},
			error: (err) => {
				console.error('Error loading game:', err);
				this.loading.set(false);
			},
		});
	}

	joinGame() {
		this._gameService.joinGame(this.gameId).subscribe((game) => {
			if (game) {
				this.game.set(game);
			}
		});
	}

	startGame() {
		this._gameService.startGame(this.gameId).subscribe((game) => {
			if (game) {
				this.game.set(game);
				this.loadGame(false);
			}
		});
	}

	// ─── Ігрова логіка ───────────────────────────────────────────

	onHandCardClick(card: string) {
		if (!this.isMyTurn() || this._isProcessing) return;

		if (this.isAttacker()) {
			// Атакуючий просто кидає карту
			this.attack(card);
			return;
		}

		if (this.isDefender()) {
			if (this.selectedCard() === card) {
				// Повторний клік — скасувати вибір
				this.selectedCard.set(null);
				this.defendMode.set(false);
			} else {
				// Вибрати карту для захисту
				this.selectedCard.set(card);
				this.defendMode.set(true);
			}
		}
	}

	onAttackCardClick(attackCard: string) {
		if (!this.isDefender() || !this.defendMode() || !this.selectedCard()) return;
		if (this._isProcessing) return;

		const pair = this.game()?.data?.table?.find((p) => p.attack === attackCard && !p.defend);
		if (!pair) return;

		this.defend(attackCard, this.selectedCard()!);
		this.selectedCard.set(null);
		this.defendMode.set(false);
	}

	attack(card: string) {
		this._isProcessing = true;
		this._gameService.makeMove(this.gameId, 'attack', { card }).subscribe({
			next: (game) => {
				this._isProcessing = false;
				if (game) {
					this.game.set(game);
					this.loadGame(false);
				}
			},
			error: () => {
				this._isProcessing = false;
			},
		});
	}

	defend(attackCard: string, card: string) {
		this._isProcessing = true;
		this._gameService.makeMove(this.gameId, 'defend', { attackCard, card }).subscribe({
			next: (game) => {
				this._isProcessing = false;
				if (game) {
					this.game.set(game);
					this.loadGame(false);
				}
			},
			error: () => {
				this._isProcessing = false;
			},
		});
	}

	take() {
		if (!this.isDefender() || this._isProcessing) return;
		this._isProcessing = true;
		this._gameService.makeMove(this.gameId, 'take').subscribe({
			next: (game) => {
				this._isProcessing = false;
				if (game) {
					this.game.set(game);
					this.loadGame(false);
				}
			},
			error: () => {
				this._isProcessing = false;
			},
		});
	}

	done() {
		if (this._isProcessing) return;
		this._isProcessing = true;
		this._gameService.makeMove(this.gameId, 'done').subscribe({
			next: (game) => {
				this._isProcessing = false;
				if (game) {
					this.game.set(game);
					this.loadGame(false);
				}
			},
			error: () => {
				this._isProcessing = false;
			},
		});
	}

	cancelDefendSelect() {
		this.selectedCard.set(null);
		this.defendMode.set(false);
	}

	// ─── Helpers ─────────────────────────────────────────────────

	isPlayer() {
		return this.game()?.players.some((p) => p._id === this.myId);
	}

	isCreator() {
		return this.game()?.creator._id === this.myId;
	}

	playerName(playerId: string) {
		return this.game()?.players.find((p) => p._id === playerId)?.name ?? 'Невідомий';
	}

	cardColor(card: string): 'red' | 'black' {
		const suit = card?.slice(-1);
		return suit === '♥' || suit === '♦' ? 'red' : 'black';
	}

	cardRank(card: string): string {
		return card?.slice(0, -1) ?? '';
	}

	cardSuit(card: string): string {
		return card?.slice(-1) ?? '';
	}

	isTrumpSuit(card: string): boolean {
		const trump = this.game()?.data?.trump;
		if (!trump || !card) return false;
		return card.slice(-1) === trump.slice(-1);
	}

	hasOpenAttacks() {
		return this.game()?.data?.table?.some((p) => !p.defend) ?? false;
	}

	allDefended() {
		const table = this.game()?.data?.table;
		return table && table.length > 0 && table.every((p) => !!p.defend);
	}

	isDoneBy(playerId: string) {
		return this.game()?.data?.doneBy?.includes(playerId) ?? false;
	}

	isWinner(playerId: string) {
		return this.game()?.data?.winners?.includes(playerId) ?? false;
	}

	backToLobby() {
		this._router.navigate(['/lobby']);
	}

	trackByIndex(index: number) {
		return index;
	}
}
