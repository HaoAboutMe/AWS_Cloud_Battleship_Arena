import { Link } from "react-router-dom";

function Lobby() {
  return (
    <div>
      <h1>Lobby</h1>

      <button>Create Room</button>

      <button>Join Room</button>

      <br /><br />

      <Link to="/game">
        <button>Start Test Match</button>
      </Link>
    </div>
  );
}

export default Lobby;