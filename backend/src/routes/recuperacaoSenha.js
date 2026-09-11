import { Router } from "express";
import { limitarTentativas } from "../middleware/limitarTentativas.js";
import {
  validarRecuperacaoSenha,
  validarRedefinicaoSenha,
} from "../validation/auth.js";
import { ConfiguracaoEmailError } from "../lib/email.js";
import {
  solicitarRecuperacao,
  redefinirSenha,
  RecuperacaoIndisponivelError,
} from "../lib/recuperacaoSenha.js";

const router = Router();

router.post("/esqueci-senha", limitarTentativas(), (req, res, next) => {
  try {
    const { email } = validarRecuperacaoSenha(req.body);
    solicitarRecuperacao(email);
    res
      .status(202)
      .json({
        mensagem:
          "Se este e-mail estiver associado a uma conta, você receberá um link para criar uma nova senha. Confira também a caixa de spam. Aguarde 5 minutos antes de solicitar outro link.",
      });
  } catch (error) {
    if (
      error instanceof ConfiguracaoEmailError ||
      error instanceof RecuperacaoIndisponivelError
    ) {
      return res
        .status(503)
        .json({
          error:
            "A recuperação de senha está indisponível no momento. Tente novamente mais tarde.",
        });
    }
    next(error);
  }
});

router.post("/redefinir-senha", limitarTentativas(), async (req, res, next) => {
  try {
    await redefinirSenha(validarRedefinicaoSenha(req.body));
    res.json({
      mensagem:
        "Senha alterada com sucesso. Entre na sua conta com a nova senha.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
