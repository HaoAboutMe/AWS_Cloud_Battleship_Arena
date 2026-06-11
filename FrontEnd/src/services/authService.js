import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  fetchUserAttributes,
} from "aws-amplify/auth";

export async function resendConfirmCode(email) {
  return await resendSignUpCode({
    username: email,
  });
}

export async function registerUser({ email, password }) {
  return await signUp({
    username: email,
    password,
  });
}

export async function confirmRegister({ email, code }) {
  return await confirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

export async function loginUser({ email, password }) {
  return await signIn({
    username: email,
    password,
  });
}

export async function requestPasswordReset(email) {
  return await resetPassword({
    username: email,
  });
}

export async function completePasswordReset({ email, code, newPassword }) {
  return await confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword,
  });
}

export async function logoutUser() {
  return await signOut();
}

export async function getLoggedInUser() {
  return await getCurrentUser();
}

export async function getLoggedInUserAttributes() {
  return await fetchUserAttributes();
}

export async function getAccessToken() {
  const { tokens } = await fetchAuthSession();
  return tokens?.accessToken?.toString();
}
