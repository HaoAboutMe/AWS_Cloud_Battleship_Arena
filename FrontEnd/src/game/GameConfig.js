import Phaser from "phaser";
import BattleshipScene from "./BattleshipScene";

const GameConfig = {
    type: Phaser.AUTO,
    width: 900,
    height: 550,
    transparent: true,
    scene: [BattleshipScene],
};

export default GameConfig;