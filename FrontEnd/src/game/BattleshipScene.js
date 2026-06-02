import Phaser from "phaser";
import { createBoard, placeShip, canPlaceShip, placeShipsRandomly, fireAt, checkVictory } from "./GameLogic";
import { getBotMove, resetBotAI } from "./botAI";

export default class BattleshipScene extends Phaser.Scene {
    constructor() {
        super("BattleshipScene");
    }

    create() {
        resetBotAI();
        this.generateShipTextures();

        this.gameState = 'PLACEMENT'; // PLACEMENT, PLAYER_TURN, BOT_TURN, GAME_OVER
        this.playerBoardData = createBoard();
        this.enemyBoardData = createBoard();
        
        this.shipsToPlace = [5, 4, 3, 2];
        this.currentShipIndex = 0;
        this.isPlacementHorizontal = true;
        this.turnTimer = 30;

        this.playerBoardCells = [];
        this.enemyBoardCells = [];

        this.rows = 10;
        this.cols = 10;
        this.cellSize = 35;
        
        this.playerStartX = 60;
        this.playerStartY = 130;
        
        this.enemyStartX = 500;
        this.enemyStartY = 130;

        // Header Texts
        this.add.text(this.playerStartX, this.playerStartY - 40, "PLAYER FLEET", { fontSize: "18px", color: "#a5e7ff", fontStyle: "bold" });
        this.enemyTitleText = this.add.text(this.enemyStartX, this.enemyStartY - 40, "ENEMY WATERS (HIDDEN)", { fontSize: "18px", color: "#8892b0", fontStyle: "bold" });
        this.enemyTitleText.setVisible(false);

        // Enemy Ship Status Icons (Represented by cells, placed horizontally at the top)
        this.enemyShipIcons = {};
        let iconStartX = this.enemyStartX + 140;
        this.shipsToPlace.forEach(len => {
            const cells = [];
            for (let i = 0; i < len; i++) {
                const cellRect = this.add.rectangle(i * 12, 0, 10, 10, 0x00d2ff, 0.4).setStrokeStyle(1, 0x00d2ff);
                cells.push(cellRect);
            }
            
            const container = this.add.container(iconStartX, this.enemyStartY - 32, cells);
            container.setVisible(false);
            
            this.enemyShipIcons[len] = { cells, container };
            iconStartX += (len * 12) + 12;
        });

        // Status and Timer
        this.statusText = this.add.text(this.playerStartX, 30, "DEPLOY YOUR FLEET\nUse 'R' or Right-Click to rotate ships.", { fontSize: "16px", color: "#ffffff", lineSpacing: 5 });
        this.timerText = this.add.text(this.enemyStartX, 30, "", { fontSize: "28px", color: "#ffb4ab", fontStyle: "bold" });

        // Draw Boards
        this.drawBoard(this.playerStartX, this.playerStartY, this.playerBoardCells, true);
        this.drawBoard(this.enemyStartX, this.enemyStartY, this.enemyBoardCells, false);
        
        this.setEnemyBoardVisible(false);

        // Preview Rectangle
        this.previewRect = this.add.rectangle(0, 0, 10, 10, 0x00d2ff, 0.4);
        this.previewRect.setOrigin(0, 0);
        this.previewRect.setDepth(10);
        this.previewRect.setVisible(false);

        // Inputs
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.keyboard.on('keydown-R', () => { 
            this.isPlacementHorizontal = !this.isPlacementHorizontal; 
            this.handlePointerMove(this.input.activePointer);
        });
        
        this.input.mouse.disableContextMenu();
    }

    generateShipTextures() {
        const lengths = [2, 3, 4, 5];
        const cs = 35;
        lengths.forEach(len => {
            const g = this.make.graphics({x: 0, y: 0, add: false});
            g.lineStyle(2, 0x00d2ff, 1);
            g.fillStyle(0x00d2ff, 0.2);
            g.strokeRoundedRect(2, 2, len * cs - 4, cs - 4, 6);
            g.fillRoundedRect(2, 2, len * cs - 4, cs - 4, 6);
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(15, 17, 4);
            if(len > 2) g.fillCircle((len * cs) - 15, 17, 4);
            g.generateTexture(`ship_h_${len}`, len * cs, cs);
            g.destroy();
            
            const gV = this.make.graphics({x: 0, y: 0, add: false});
            gV.lineStyle(2, 0x00d2ff, 1);
            gV.fillStyle(0x00d2ff, 0.2);
            gV.strokeRoundedRect(2, 2, cs - 4, len * cs - 4, 6);
            gV.fillRoundedRect(2, 2, cs - 4, len * cs - 4, 6);
            gV.fillStyle(0xffffff, 0.8);
            gV.fillCircle(17, 15, 4);
            if(len > 2) gV.fillCircle(17, (len * cs) - 15, 4);
            gV.generateTexture(`ship_v_${len}`, cs, len * cs);
            gV.destroy();
        });
    }

    drawBoard(startX, startY, cellArray, isPlayer) {
        const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        for (let row = 0; row < this.rows; row++) {
            cellArray[row] = [];
            this.add.text(startX - 25, startY + row * this.cellSize + 10, (row + 1).toString(), { fontSize: "14px", color: "#a5e7ff" });
            
            for (let col = 0; col < this.cols; col++) {
                if (row === 0) {
                    this.add.text(startX + col * this.cellSize + 12, startY - 25, letters[col], { fontSize: "14px", color: "#a5e7ff" });
                }

                const x = startX + col * this.cellSize;
                const y = startY + row * this.cellSize;

                const rectangle = this.add.rectangle(x, y, this.cellSize, this.cellSize, 0x0a192f, 0.6);
                rectangle.setStrokeStyle(1, 0x273647);
                rectangle.setOrigin(0, 0);

                cellArray[row][col] = { row, col, rectangle };
            }
        }
    }

    setEnemyBoardVisible(visible) {
        this.enemyTitleText.setVisible(visible);
        for(let r=0; r<this.rows; r++){
            for(let c=0; c<this.cols; c++){
                this.enemyBoardCells[r][c].rectangle.setVisible(visible);
            }
        }
    }

    handlePointerMove(pointer) {
        if (this.gameState !== 'PLACEMENT') return;
        if (this.currentShipIndex >= this.shipsToPlace.length) {
            this.previewRect.setVisible(false);
            return;
        }

        let hoverRow = -1;
        let hoverCol = -1;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.playerBoardCells[r][c].rectangle;
                if (pointer.x >= cell.x && pointer.x < cell.x + this.cellSize &&
                    pointer.y >= cell.y && pointer.y < cell.y + this.cellSize) {
                    hoverRow = r;
                    hoverCol = c;
                    break;
                }
            }
        }

        if (hoverRow !== -1 && hoverCol !== -1) {
            const length = this.shipsToPlace[this.currentShipIndex];
            const canPlace = canPlaceShip(this.playerBoardData, hoverRow, hoverCol, length, this.isPlacementHorizontal);
            
            const pX = this.playerStartX + hoverCol * this.cellSize;
            const pY = this.playerStartY + hoverRow * this.cellSize;
            const pW = this.isPlacementHorizontal ? length * this.cellSize : this.cellSize;
            const pH = this.isPlacementHorizontal ? this.cellSize : length * this.cellSize;
            
            this.previewRect.setPosition(pX, pY);
            this.previewRect.setSize(pW, pH);
            this.previewRect.setFillStyle(canPlace ? 0x00d2ff : 0xff0000, 0.4);
            this.previewRect.setVisible(true);
        } else {
            this.previewRect.setVisible(false);
        }
    }

    handlePointerDown(pointer) {
        if (this.gameState !== 'PLACEMENT') {
            if (this.gameState === 'PLAYER_TURN' && pointer.button === 0) {
                this.handleEnemyClick(pointer);
            }
            return;
        }

        if (pointer.button === 2) {
            this.isPlacementHorizontal = !this.isPlacementHorizontal;
            this.handlePointerMove(pointer);
            return;
        }

        if (this.currentShipIndex >= this.shipsToPlace.length) return;

        let hoverRow = -1;
        let hoverCol = -1;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.playerBoardCells[r][c].rectangle;
                if (pointer.x >= cell.x && pointer.x < cell.x + this.cellSize &&
                    pointer.y >= cell.y && pointer.y < cell.y + this.cellSize) {
                    hoverRow = r;
                    hoverCol = c;
                    break;
                }
            }
        }

        if (hoverRow !== -1 && hoverCol !== -1) {
            const length = this.shipsToPlace[this.currentShipIndex];
            if (placeShip(this.playerBoardData, hoverRow, hoverCol, length, this.isPlacementHorizontal)) {
                const pX = this.playerStartX + hoverCol * this.cellSize;
                const pY = this.playerStartY + hoverRow * this.cellSize;
                const texKey = `ship_${this.isPlacementHorizontal ? 'h' : 'v'}_${length}`;
                this.add.image(pX, pY, texKey).setOrigin(0, 0).setDepth(5);

                this.currentShipIndex++;

                if (this.currentShipIndex >= this.shipsToPlace.length) {
                    this.previewRect.setVisible(false);
                    this.finishPlacement();
                } else {
                    this.handlePointerMove(pointer);
                }
            }
        }
    }

    finishPlacement() {
        this.statusText.setText("Status: FLEET DEPLOYED. ENEMY DETECTED.");
        placeShipsRandomly(this.enemyBoardData);
        
        this.enemyTitleText.setText("ENEMY WATERS");
        this.enemyTitleText.setColor("#ffb4ab");
        this.setEnemyBoardVisible(true);
        
        Object.values(this.enemyShipIcons).forEach(iconObj => {
            iconObj.container.setVisible(true);
            iconObj.cells.forEach(c => {
                c.setFillStyle(0x00d2ff, 0.4).setStrokeStyle(1, 0x00d2ff);
            });
        });

        const startBtn = this.add.text(450, 500, "[ ENGAGE BATTLE ]", { fontSize: "24px", color: "#00d2ff", fontStyle: "bold" })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                startBtn.destroy();
                this.startPlayerTurn();
            })
            .on('pointerover', () => startBtn.setColor("#ffffff"))
            .on('pointerout', () => startBtn.setColor("#00d2ff"));
    }

    startPlayerTurn() {
        this.gameState = 'PLAYER_TURN';
        this.statusText.setText("Status: YOUR TURN - Target enemy waters!");
        this.statusText.setColor("#00d2ff");
        
        this.turnTimer = 30;
        this.updateTimerText();
        
        if (this.timerEvent) this.timerEvent.remove();
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.tickTimer,
            callbackScope: this,
            loop: true
        });
    }

    tickTimer() {
        if (this.gameState === 'GAME_OVER') return;
        this.turnTimer--;
        this.updateTimerText();

        if (this.turnTimer <= 0) {
            this.timerEvent.remove();
            this.statusText.setText("Status: TIME IS UP! Bot's turn.");
            this.startBotTurn();
        }
    }

    updateTimerText() {
        this.timerText.setText(`TIME: ${this.turnTimer}s`);
        if (this.turnTimer <= 10) this.timerText.setColor("#ffb4ab");
        else this.timerText.setColor("#a5e7ff");
    }

    handleEnemyClick(pointer) {
        let hoverRow = -1;
        let hoverCol = -1;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.enemyBoardCells[r][c].rectangle;
                if (pointer.x >= cell.x && pointer.x < cell.x + this.cellSize &&
                    pointer.y >= cell.y && pointer.y < cell.y + this.cellSize) {
                    hoverRow = r;
                    hoverCol = c;
                    break;
                }
            }
        }

        if (hoverRow !== -1 && hoverCol !== -1) {
            const shot = fireAt(this.enemyBoardData, hoverRow, hoverCol);
            if (shot.result === "ALREADY_HIT") return;

            if (this.timerEvent) this.timerEvent.remove();
            const cellRect = this.enemyBoardCells[hoverRow][hoverCol].rectangle;
            const x = cellRect.x;
            const y = cellRect.y;

            if (shot.result === "HIT") {
                cellRect.setFillStyle(0xff0000, 0.4);
                this.add.text(x + 10, y + 5, "X", { fontSize: "20px", color: "#ffb4ab", fontStyle: "bold" }).setDepth(6);
                
                if (shot.isSunk) {
                    const iconObj = this.enemyShipIcons[shot.shipLength];
                    iconObj.cells.forEach(c => {
                        c.setFillStyle(0x444444, 0.4).setStrokeStyle(1, 0x444444);
                    });
                    this.statusText.setText(`Status: ENEMY SHIP (SIZE ${shot.shipLength}) DESTROYED! Extra turn.`);
                } else {
                    this.statusText.setText("Status: DIRECT HIT! You get an extra turn.");
                }
                
                if (checkVictory(this.enemyBoardData)) {
                    this.endGame("VICTORY! Enemy fleet destroyed.");
                    return;
                }
                
                this.time.delayedCall(800, () => {
                    if (this.gameState !== 'GAME_OVER') this.startPlayerTurn();
                });
            } else {
                cellRect.setFillStyle(0x273647, 0.8);
                this.add.text(x + 12, y + 8, "-", { fontSize: "20px", color: "#8892b0", fontStyle: "bold" }).setDepth(6);
                this.statusText.setText("Status: MISS. Bot's turn.");
                
                this.gameState = 'WAITING';
                this.time.delayedCall(800, () => {
                    this.startBotTurn();
                });
            }
        }
    }

    startBotTurn() {
        if (this.gameState === 'GAME_OVER') return;
        this.gameState = 'BOT_TURN';
        this.statusText.setText("Status: ENEMY TURN - Brace for impact!");
        this.statusText.setColor("#ffb4ab");
        this.timerText.setText("");

        this.time.delayedCall(1200, this.performBotMove, [], this);
    }

    performBotMove() {
        if (this.gameState === 'GAME_OVER') return;

        const difficulty = window.gameDifficulty || "easy";
        const botShot = getBotMove(this.playerBoardData, difficulty);
        const isBotHit = this.playerBoardData[botShot.row][botShot.col].hasShip;
        const playerRect = this.playerBoardCells[botShot.row][botShot.col].rectangle;
        const x = playerRect.x;
        const y = playerRect.y;
        
        if (isBotHit) {
            playerRect.setFillStyle(0xff0000, 0.8);
            this.add.text(x + 10, y + 5, "X", { fontSize: "20px", color: "#ffb4ab", fontStyle: "bold" }).setDepth(8);
            this.statusText.setText("Status: CRITICAL ALERT! Your ship was hit!");
            
            if (checkVictory(this.playerBoardData)) {
                this.endGame("DEFEAT! Your fleet was destroyed.");
                return;
            }

            this.time.delayedCall(1200, this.performBotMove, [], this);
        } else {
            playerRect.setFillStyle(0x273647, 0.8);
            this.add.text(x + 12, y + 8, "-", { fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setDepth(8);
            this.statusText.setText("Status: Bot MISSED.");
            
            this.time.delayedCall(1000, () => {
                this.startPlayerTurn();
            });
        }
    }

    endGame(message) {
        this.gameState = 'GAME_OVER';
        this.statusText.setText(message);
        if (message.includes("VICTORY")) {
            this.statusText.setColor("#00ff00");
        } else {
            this.statusText.setColor("#ff0000");
        }
        if (this.timerEvent) this.timerEvent.remove();
        this.timerText.setText("");
        
        const btn = this.add.text(450, 520, "[ RETURN TO SECTOR COMMAND ]", { fontSize: "24px", color: "#00d2ff", fontStyle: "bold" })
            .setInteractive()
            .setOrigin(0.5)
            .on('pointerdown', () => {
                window.location.href = '/';
            })
            .on('pointerover', () => btn.setColor("#ffffff"))
            .on('pointerout', () => btn.setColor("#00d2ff"));
    }
}