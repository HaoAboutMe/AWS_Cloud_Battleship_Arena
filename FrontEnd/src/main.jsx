import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Amplify } from "aws-amplify";
import { awsConfig } from "./awsConfig";
import "aws-amplify/auth/enable-oauth-listener";

Amplify.configure(awsConfig);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
