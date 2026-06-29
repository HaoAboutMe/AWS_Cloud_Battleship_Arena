const oauthDomain = import.meta.env.VITE_AWS_COGNITO_DOMAIN
  ?.replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

const frontendAppUrl = import.meta.env.VITE_FRONTEND_APP_URL
  ?.replace(/\/+$/, "");

const redirectBaseUrl = frontendAppUrl || window.location.origin;
const defaultRedirectSignIn = `${redirectBaseUrl}/login`;
const defaultRedirectSignOut = redirectBaseUrl;

const parseRedirectUrls = (value, fallback) =>
  value
    ? value.split(",").map((url) => url.trim()).filter(Boolean)
    : [fallback];

export const isSocialAuthConfigured = Boolean(oauthDomain);

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID,
      loginWith: {
        email: true,
        ...(oauthDomain
          ? {
              oauth: {
                domain: oauthDomain,
                scopes: ["openid", "email", "profile"],
                redirectSignIn: parseRedirectUrls(
                  import.meta.env.VITE_AWS_OAUTH_REDIRECT_SIGN_IN,
                  defaultRedirectSignIn,
                ),
                redirectSignOut: parseRedirectUrls(
                  import.meta.env.VITE_AWS_OAUTH_REDIRECT_SIGN_OUT,
                  defaultRedirectSignOut,
                ),
                responseType: "code",
              },
            }
          : {}),
      },
    },
  },
};
