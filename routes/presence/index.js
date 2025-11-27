import { Router } from "express";
import {confirmPresence, exportChamada, getAllPresencesFromChamada} from "../../controllers/presenceController.js";
import auth from "../../middlewares/auth.js"

const router = Router();

router.get("/:chamadaId", getAllPresencesFromChamada);
router.post("/:chamadaId", confirmPresence);
router.get("/export-presences/:chamadaId", auth, exportChamada);

export default router;