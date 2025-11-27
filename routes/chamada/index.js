import { Router } from "express";
import auth from "../../middlewares/auth.js";
import {
  createChamada,
  getChamadas,
  getChamada,
  updateChamada,
  deleteChamada,
  addCustomInput,
  deleteCustomInput,
} from "../../controllers/chamadasController.js";

const router = Router();

// Middleware de autenticação


// Rota para criar uma nova chamada
router.post("/", auth, createChamada);

// Rota para criar novo input personalizado na chamada
router.post("/:id/input/", auth, addCustomInput);

// Rota para deletar input personalizado na chamada
router.delete("/:id/input/", auth, deleteCustomInput);

// Rota para listar todas as chamadas
router.get("/", auth, getChamadas);

// Rota para listar todas as chamadas
router.get("/:id", getChamada);

// Rota para atualizar uma chamada específica
router.put("/:id", auth, updateChamada);

// Rota para excluir uma chamada específica
router.delete("/:id", auth, deleteChamada);

export default router;