type AuthErrorLike = {
  code?: string;
};

export function passwordUpdateErrorMessage(error: AuthErrorLike): string {
  if (error.code === "same_password") {
    return "A nova senha precisa ser diferente da senha atual.";
  }

  return "Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.";
}
