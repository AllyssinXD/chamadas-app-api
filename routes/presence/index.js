import { Router } from "express";
import {clearPresences, confirmPresence, exportChamada, forcePresence, getAllPresencesFromChamada} from "../../controllers/presenceController.js";
import auth from "../../middlewares/auth.js"

const router = Router();

router.get("/:chamadaId", getAllPresencesFromChamada);
router.post("/:chamadaId", confirmPresence);
router.get("/export-presences/:chamadaId", auth, exportChamada);
router.post("/force-presence/:chamadaId", auth, forcePresence);
router.delete("/clear-presences/:chamadaId", auth, clearPresences);

export default router;